package auth

import "errors"

// Sentinel errors for the auth domain.
var (
	ErrUserNotFound      = errors.New("user not found")
	ErrUserAlreadyExists = errors.New("username already taken")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidInput      = errors.New("invalid input")
	ErrWeakPassword      = errors.New("password must be at least 8 characters")
	ErrInvalidRole       = errors.New("invalid role")
	ErrMFARequired       = errors.New("MFA verification required")
	ErrInvalidMFACode    = errors.New("invalid or expired MFA code")
)
