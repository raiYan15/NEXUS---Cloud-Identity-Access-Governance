package auth

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/nexus/identity-platform/internal/users"
	"golang.org/x/crypto/bcrypt"
)

const (
	minPasswordLength = 8
	bcryptCost        = 12
	tokenExpiry       = 24 * time.Hour
	jwtIssuer         = "nexus-identity-platform"
)

// Claims are the JWT payload fields issued by NEXUS.
type Claims struct {
	UserID   string     `json:"user_id"`
	Username string     `json:"username"`
	Role     users.Role `json:"role"`
	jwt.RegisteredClaims
}

// Service handles authentication business logic.
type Service struct {
	store      UserStore
	signingKey []byte
}

// NewService creates an auth Service with a pre-loaded signing key.
// Use LoadSigningKey() to obtain the key, or NewServiceWithKey() for tests.
func NewService(store UserStore, signingKey []byte) (*Service, error) {
	if len(signingKey) == 0 {
		return nil, fmt.Errorf("auth service: signing key must not be empty")
	}
	return &Service{store: store, signingKey: signingKey}, nil
}

// LoadSigningKey resolves the JWT signing key using this priority:
//  1. AWS Secrets Manager (secret name from AWS_SECRET_NAME env var)
//  2. JWT_SIGNING_KEY environment variable
//
// It never logs the actual key value.
// Pass a context with a deadline to prevent AWS IMDS from blocking.
func LoadSigningKey(ctx context.Context) ([]byte, error) {
	secretName := os.Getenv("AWS_SECRET_NAME")
	if secretName == "" {
		secretName = "nexus/jwt-signing-key"
	}

	// Use a short timeout so we don't hang in non-AWS environments
	awsCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	cfg, err := awsconfig.LoadDefaultConfig(awsCtx,
		awsconfig.WithRetryMaxAttempts(1),
	)
	if err == nil {
		client := secretsmanager.NewFromConfig(cfg)
		out, err := client.GetSecretValue(awsCtx, &secretsmanager.GetSecretValueInput{
			SecretId: aws.String(secretName),
		})
		if err == nil && out.SecretString != nil && *out.SecretString != "" {
			log.Println("[INFO] JWT signing key loaded from AWS Secrets Manager")
			return []byte(*out.SecretString), nil
		}
		log.Printf("[WARN] AWS Secrets Manager unavailable (%v); using JWT_SIGNING_KEY env var", err)
	} else {
		log.Printf("[WARN] AWS config load failed (%v); using JWT_SIGNING_KEY env var", err)
	}

	envKey := os.Getenv("JWT_SIGNING_KEY")
	if envKey == "" {
		return nil, fmt.Errorf("JWT_SIGNING_KEY environment variable is not set and AWS Secrets Manager is unavailable")
	}
	log.Println("[INFO] JWT signing key loaded from environment variable")
	return []byte(envKey), nil
}

// RegisterInput is the validated, typed form of a registration request.
type RegisterInput struct {
	Username string
	Password string
	Role     users.Role
}

// LoginInput is the validated, typed form of a login request.
type LoginInput struct {
	Username string
	Password string
}

// Register validates, hashes the password, and stores the new user.
func (s *Service) Register(input RegisterInput) (*users.User, error) {
	username := strings.TrimSpace(input.Username)
	if len(username) < 3 {
		return nil, fmt.Errorf("%w: username must be at least 3 characters", ErrInvalidInput)
	}
	if len(username) > 50 {
		return nil, fmt.Errorf("%w: username must be at most 50 characters", ErrInvalidInput)
	}

	// Validate password — never log it
	if len(input.Password) < minPasswordLength {
		return nil, ErrWeakPassword
	}

	// Validate role
	if !users.ValidRoles[input.Role] {
		return nil, ErrInvalidRole
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcryptCost)
	if err != nil {
		return nil, fmt.Errorf("password hashing failed: %w", err)
	}

	u := &users.User{
		ID:           uuid.New().String(),
		Username:     username,
		PasswordHash: string(hash),
		Role:         input.Role,
		Status:       users.StatusActive,
	}

	if err := s.store.CreateUser(u); err != nil {
		return nil, err
	}
	return u, nil
}

// Login verifies credentials and returns a signed JWT.
// Returns ErrInvalidCredentials for any authentication failure
// to prevent username enumeration.
func (s *Service) Login(input LoginInput) (string, *users.User, error) {
	u, err := s.store.GetUserByUsername(input.Username)
	if err != nil {
		// Dummy compare to prevent timing-based username enumeration
		_ = bcrypt.CompareHashAndPassword([]byte("$2a$12$dummydummydummydummydummydummydummydumm"), []byte(input.Password))
		return "", nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(input.Password)); err != nil {
		return "", nil, ErrInvalidCredentials
	}

	if u.Status != users.StatusActive {
		return "", nil, fmt.Errorf("%w: account is %s", ErrInvalidCredentials, u.Status)
	}

	token, err := s.generateJWT(u)
	if err != nil {
		return "", nil, fmt.Errorf("token generation failed: %w", err)
	}

	return token, u, nil
}

// generateJWT creates a signed HS256 JWT for the given user.
func (s *Service) generateJWT(u *users.User) (string, error) {
	now := time.Now().UTC()
	claims := Claims{
		UserID:   u.ID,
		Username: u.Username,
		Role:     u.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    jwtIssuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tokenExpiry)),
			ID:        uuid.New().String(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.signingKey)
}

// ValidateToken parses and validates a JWT string, returning the claims.
func (s *Service) ValidateToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.signingKey, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}

	if claims.Issuer != jwtIssuer {
		return nil, fmt.Errorf("invalid token issuer")
	}

	return claims, nil
}

// GetUserByID retrieves a user by their ID.
func (s *Service) GetUserByID(id string) (*users.User, error) {
	return s.store.GetUserByID(id)
}

// ListUsers returns all users (admin operation).
func (s *Service) ListUsers() ([]*users.User, error) {
	return s.store.ListUsers()
}
