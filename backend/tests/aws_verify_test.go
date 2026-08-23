package tests

import (
	"context"
	"os"
	"testing"
	"time"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sts"
)

func TestAWS_LiveCredentialsVerification(t *testing.T) {
	if os.Getenv("AWS_REGION") == "" {
		os.Setenv("AWS_REGION", "us-east-1")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		t.Fatalf("Failed to load AWS configuration: %v", err)
	}

	stsClient := sts.NewFromConfig(cfg)
	identity, err := stsClient.GetCallerIdentity(ctx, &sts.GetCallerIdentityInput{})
	if err != nil {
		t.Fatalf("AWS Authentication Failed: %v", err)
	}

	t.Logf("✅ LIVE AWS AUTHENTICATION SUCCESSFUL!")
	t.Logf("Account ID : %s", *identity.Account)
	t.Logf("User ARN   : %s", *identity.Arn)
	t.Logf("User ID    : %s", *identity.UserId)
}
