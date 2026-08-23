package tests

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager/types"
	"github.com/nexus/identity-platform/internal/auth"
	"github.com/nexus/identity-platform/internal/users"
)

func TestAWS_SecretsManager_LiveKeyRetrieval(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	cfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		t.Fatalf("Failed to load AWS configuration: %v", err)
	}

	smClient := secretsmanager.NewFromConfig(cfg)
	secretName := "nexus/jwt-signing-key"
	secretValue := "nexus_super_secret_aws_vault_signing_key_2026"

	// 1. Ensure secret exists in AWS Secrets Manager
	_, err = smClient.CreateSecret(ctx, &secretsmanager.CreateSecretInput{
		Name:         aws.String(secretName),
		SecretString: aws.String(secretValue),
		Description:  aws.String("NEXUS JWT HS256 Signing Key for Live Integration Testing"),
	})
	if err != nil {
		var alreadyExists *types.ResourceExistsException
		if errors.As(err, &alreadyExists) {
			// Update if exists
			_, err = smClient.PutSecretValue(ctx, &secretsmanager.PutSecretValueInput{
				SecretId:     aws.String(secretName),
				SecretString: aws.String(secretValue),
			})
			if err != nil {
				t.Fatalf("Failed to update existing secret in AWS Secrets Manager: %v", err)
			}
			t.Logf("Updated existing secret in AWS Secrets Manager: %s", secretName)
		} else {
			t.Fatalf("Failed to create secret in AWS Secrets Manager: %v", err)
		}
	} else {
		t.Logf("Created new secret in AWS Secrets Manager: %s", secretName)
	}

	// 2. Test that LoadSigningKey retrieves the secret from AWS Secrets Manager
	loadedKey, err := auth.LoadSigningKey(ctx)
	if err != nil {
		t.Fatalf("auth.LoadSigningKey failed: %v", err)
	}

	if string(loadedKey) != secretValue {
		t.Fatalf("Loaded key mismatch: expected %s, got %s", secretValue, string(loadedKey))
	}
	t.Logf("✅ Successfully loaded JWT signing key from AWS Secrets Manager!")

	// 3. Test token signing and validation using the live AWS key
	store := auth.NewMemoryUserStore()
	svc, err := auth.NewService(store, loadedKey)
	if err != nil {
		t.Fatalf("auth.NewService failed: %v", err)
	}

	u, err := svc.Register(auth.RegisterInput{
		Username: "aws_cloud_user",
		Password: "SecurePassword123!",
		Role:     users.RoleDeveloper,
	})
	if err != nil {
		t.Fatalf("Registration failed: %v", err)
	}

	token, _, err := svc.Login(auth.LoginInput{
		Username: "aws_cloud_user",
		Password: "SecurePassword123!",
	})
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}

	claims, err := svc.ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}

	if claims.UserID != u.ID || claims.Username != "aws_cloud_user" {
		t.Fatalf("Claims mismatch: %+v", claims)
	}
	t.Logf("✅ Successfully issued & verified JWT signed with AWS Secrets Manager key!")
}
