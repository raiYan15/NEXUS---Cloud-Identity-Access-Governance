package auth

import (
	"crypto/hmac"
	"crypto/sha1" //nolint:gosec // RFC 6238 mandates SHA-1 for TOTP
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"math"
	"strings"
	"time"
)

// totpTimeStep is the time window in seconds (RFC 6238 default).
const totpTimeStep = 30

// GenerateTOTP generates a 6-digit TOTP code for the given Base32 secret
// at the current time (or overridden with timeNow for testing).
// Implements RFC 6238 using HMAC-SHA1, dynamic truncation, and modulo 10^6.
func GenerateTOTP(secret string, at time.Time) (string, error) {
	key, err := base32Decode(secret)
	if err != nil {
		return "", fmt.Errorf("totp: invalid secret: %w", err)
	}

	counter := uint64(at.Unix()) / totpTimeStep
	return hotp(key, counter, 6)
}

// VerifyTOTP verifies a 6-digit TOTP code against the given secret.
// It accepts codes from the previous, current, and next time step (window=1)
// to tolerate clock drift between client and server.
func VerifyTOTP(secret, code string, at time.Time) (bool, error) {
	key, err := base32Decode(secret)
	if err != nil {
		return false, fmt.Errorf("totp: invalid secret: %w", err)
	}

	counter := int64(at.Unix()) / totpTimeStep

	// Check current step and ±1 window
	for delta := int64(-1); delta <= 1; delta++ {
		c := uint64(counter + delta)
		expected, err := hotp(key, c, 6)
		if err != nil {
			return false, err
		}
		if hmac.Equal([]byte(expected), []byte(code)) {
			return true, nil
		}
	}
	return false, nil
}

// hotp computes the HOTP value for the given key and counter,
// returning a zero-padded decimal string of `digits` length.
//
// Algorithm (RFC 4226 §5.3):
//  1. Compute HMAC-SHA1(key, counter_bytes)
//  2. Dynamic truncation: offset = last byte & 0xF
//  3. Extract 4 bytes at offset, mask high bit
//  4. Return value mod 10^digits, zero-padded
func hotp(key []byte, counter uint64, digits int) (string, error) {
	// Step 1: HMAC-SHA1
	counterBytes := make([]byte, 8)
	binary.BigEndian.PutUint64(counterBytes, counter)

	mac := hmac.New(sha1.New, key) //nolint:gosec // required by RFC 6238
	mac.Write(counterBytes)
	h := mac.Sum(nil)

	// Step 2: Dynamic truncation — offset is low nibble of last byte
	offset := h[len(h)-1] & 0x0F

	// Step 3: Extract 4 bytes and mask the high bit to get a 31-bit unsigned int
	truncated := binary.BigEndian.Uint32(h[offset : offset+4])
	truncated &= 0x7FFFFFFF

	// Step 4: Modulo and zero-pad
	modulus := uint32(math.Pow10(digits))
	otp := truncated % modulus

	return fmt.Sprintf("%0*d", digits, otp), nil
}

// base32Decode decodes a Base32 secret (case-insensitive, no padding required).
func base32Decode(secret string) ([]byte, error) {
	upper := strings.ToUpper(strings.TrimSpace(secret))
	// Add padding if missing
	if pad := len(upper) % 8; pad != 0 {
		upper += strings.Repeat("=", 8-pad)
	}
	return base32.StdEncoding.DecodeString(upper)
}
