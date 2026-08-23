package auth

import (
	"crypto/rand"
	"encoding/base32"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/nexus/identity-platform/internal/audit"
)

// mfaVerifyRequest is the body for POST /api/v1/mfa/verify.
type mfaVerifyRequest struct {
	Code string `json:"code"`
}

// MFAVerify handles POST /api/v1/mfa/verify.
// The user must be authenticated (JWT). The TOTP code is validated
// against the user's stored MFA secret. On success, a verified state
// is recorded which can be queried by the policy engine.
func (h *Handler) MFAVerify(w http.ResponseWriter, r *http.Request) {
	claims := ClaimsFromContext(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req mfaVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	if len(req.Code) != 6 {
		writeError(w, http.StatusBadRequest, "MFA code must be 6 digits")
		return
	}

	u, err := h.service.GetUserByID(claims.UserID)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	if !u.MFAEnabled || u.MFASecret == "" {
		writeError(w, http.StatusBadRequest, "MFA is not enabled for this user")
		return
	}

	valid, err := VerifyTOTP(u.MFASecret, req.Code, time.Now().UTC())
	if err != nil {
		log.Printf("[ERROR] MFAVerify TOTP: %v", err)
		writeError(w, http.StatusInternalServerError, "MFA verification error")
		return
	}

	if !valid {
		h.auditLogger.Log(audit.Event{
			UserID:    u.ID,
			Action:    audit.ActionMFAFailed,
			IPAddress: r.RemoteAddr,
			UserAgent: r.UserAgent(),
		})
		writeError(w, http.StatusUnauthorized, errors.New(ErrInvalidMFACode.Error()).Error())
		return
	}

	h.auditLogger.Log(audit.Event{
		UserID:    u.ID,
		Action:    audit.ActionMFASuccess,
		IPAddress: r.RemoteAddr,
		UserAgent: r.UserAgent(),
	})

	writeJSON(w, http.StatusOK, map[string]any{
		"message":      "MFA verified successfully",
		"mfa_verified": true,
		"user_id":      u.ID,
	})
}

// MFASetup handles POST /api/v1/mfa/setup — generates a TOTP secret for the user.
// Returns the Base32 secret and an otpauth:// URI suitable for QR code generation.
func (h *Handler) MFASetup(w http.ResponseWriter, r *http.Request) {
	claims := ClaimsFromContext(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	secret, err := generateMFASecret()
	if err != nil {
		log.Printf("[ERROR] MFASetup generate secret: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to generate MFA secret")
		return
	}

	totpURI := fmt.Sprintf(
		"otpauth://totp/NEXUS:%s?secret=%s&issuer=NEXUS&algorithm=SHA1&digits=6&period=30",
		claims.Username,
		secret,
	)

	writeJSON(w, http.StatusOK, map[string]string{
		"secret":   secret,
		"totp_uri": totpURI,
		"message":  "Scan the QR code or enter the secret into your authenticator app",
	})
}

// generateMFASecret creates a cryptographically random 20-byte Base32 secret.
func generateMFASecret() (string, error) {
	b := make([]byte, 20)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("random generation failed: %w", err)
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b), nil
}
