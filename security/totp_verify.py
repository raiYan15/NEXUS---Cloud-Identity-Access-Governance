"""
NEXUS — Python TOTP Security Utility
=====================================
Implements RFC 6238 (TOTP) using RFC 4226 (HOTP) as the base algorithm.

This is a standalone security component, independent from the Go backend.
It demonstrates the TOTP algorithm from first principles:
  - Base32 secret decoding
  - HMAC-SHA1 computation
  - Dynamic truncation (not string slicing)
  - Modulo 10^6 for 6-digit code

No third-party TOTP library is used. Only Python stdlib.
"""

import hashlib
import hmac
import struct
import time
import base64
import base64 as _base64
import math


def _base32_decode(secret: str) -> bytes:
    """Decode a Base32 secret (case-insensitive, padding optional)."""
    if not secret or not secret.strip():
        raise ValueError("Secret must not be empty")
    clean = secret.upper().strip()
    # Add padding if needed
    pad = len(clean) % 8
    if pad:
        clean += "=" * (8 - pad)
    return base64.b32decode(clean)


def _hotp(key: bytes, counter: int, digits: int = 6) -> str:
    """
    Compute an HOTP value per RFC 4226 §5.3.

    Algorithm:
    1. HMAC-SHA1(key, counter_big_endian_8_bytes)
    2. Dynamic truncation: offset = last_byte & 0x0F
    3. Extract 4 bytes at offset, mask high bit → 31-bit integer
    4. Return value mod 10^digits, zero-padded
    """
    # Step 1: HMAC-SHA1
    counter_bytes = struct.pack(">Q", counter)  # big-endian 64-bit
    mac = hmac.new(key, counter_bytes, hashlib.sha1).digest()

    # Step 2: Dynamic truncation
    offset = mac[-1] & 0x0F

    # Step 3: Extract 4 bytes, mask high bit
    truncated = struct.unpack(">I", mac[offset : offset + 4])[0]
    truncated &= 0x7FFFFFFF  # clear the most significant bit

    # Step 4: Modulo and zero-pad
    modulus = 10 ** digits
    otp = truncated % modulus

    return str(otp).zfill(digits)


def generate_totp(secret: str, time_step: int = 30, digits: int = 6, at: float | None = None) -> str:
    """
    Generate a TOTP code for the given Base32 secret.

    Args:
        secret:    Base32-encoded shared secret.
        time_step: Time step in seconds (RFC 6238 default: 30).
        digits:    Number of digits (default: 6).
        at:        Unix timestamp override (default: current time). Used for testing.

    Returns:
        A zero-padded string of `digits` digits.
    """
    timestamp = at if at is not None else time.time()
    counter = int(timestamp) // time_step
    key = _base32_decode(secret)
    return _hotp(key, counter, digits)


def verify_totp(
    secret: str,
    code: str,
    time_step: int = 30,
    window: int = 1,
    at: float | None = None,
) -> bool:
    """
    Verify a TOTP code against the shared secret.

    Accepts codes from the current time step and ±window steps to tolerate
    clock drift between client and server.

    Args:
        secret:    Base32-encoded shared secret.
        code:      The code to verify.
        time_step: Time step in seconds (default: 30).
        window:    Number of adjacent time steps to accept (default: 1).
        at:        Unix timestamp override for testing.

    Returns:
        True if the code is valid within the acceptance window.
    """
    timestamp = at if at is not None else time.time()
    counter = int(timestamp) // time_step
    key = _base32_decode(secret)

    for delta in range(-window, window + 1):
        expected = _hotp(key, counter + delta, len(code))
        # Use hmac.compare_digest to prevent timing attacks
        if hmac.compare_digest(expected, code):
            return True
    return False
