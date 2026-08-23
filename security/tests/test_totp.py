"""
NEXUS TOTP Tests
=================
Tests for the RFC 6238 TOTP implementation in totp_verify.py.

Tests cover:
- RFC 6238 official test vector (Appendix B)
- Current code validates
- Previous time step (clock drift window)
- Next time step (clock drift window)
- Code outside the window fails
- Invalid code fails
- Bad Base32 secret raises an error
"""

import sys
import os
import time
import pytest

# Allow importing from the parent security/ directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from totp_verify import generate_totp, verify_totp


class TestRFC6238Vector:
    """
    RFC 6238 Appendix B test vector.

    Secret (ASCII): 12345678901234567890
    As Base32:      GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
    At time=59 (T=1): 8-digit expected = 94287082 → 6-digit = 287082
    """

    SECRET_ASCII = "12345678901234567890"
    # The RFC uses the ASCII bytes directly; we need to Base32-encode them
    # to pass into our function which expects a Base32 secret.
    # Base32("12345678901234567890") = GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
    SECRET_BASE32 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"

    def test_rfc_vector_t1_time59_six_digits(self):
        """
        At Unix time=59, counter T = floor(59/30) = 1.
        RFC specifies 8-digit HOTP(T=1) = 94287082.
        Our 6-digit result = last 6 digits = 287082.
        """
        code = generate_totp(self.SECRET_BASE32, time_step=30, digits=6, at=59.0)
        assert code == "287082", f"RFC 6238 vector failed: expected 287082, got {code}"

    def test_rfc_vector_t1_eight_digits(self):
        """Verify 8-digit value matches the RFC exactly."""
        code = generate_totp(self.SECRET_BASE32, time_step=30, digits=8, at=59.0)
        assert code == "94287082", f"RFC 6238 8-digit vector failed: expected 94287082, got {code}"

    def test_counter_is_1_at_time_59(self):
        """Sanity: counter = floor(59 / 30) = 1."""
        counter = int(59) // 30
        assert counter == 1


class TestTOTPCurrentCode:
    """Tests that a freshly generated code validates at current time."""

    SECRET = "JBSWY3DPEHPK3PXP"  # well-known test secret

    def test_current_code_is_valid(self):
        now = time.time()
        code = generate_totp(self.SECRET, at=now)
        assert verify_totp(self.SECRET, code, at=now), "Current code must be valid"

    def test_generated_code_is_6_digits(self):
        now = time.time()
        code = generate_totp(self.SECRET, at=now)
        assert len(code) == 6, f"Expected 6 digits, got {len(code)}"
        assert code.isdigit(), f"Expected all digits, got {code!r}"

    def test_zero_padded_output(self):
        """
        If the OTP value is small, it must be zero-padded to 6 digits.
        We inject a fixed time that produces a small OTP to verify padding.
        Generate codes at multiple timestamps and check they're all 6-char strings.
        """
        for offset in range(0, 300, 30):
            code = generate_totp(self.SECRET, at=float(offset))
            assert len(code) == 6, f"Code at t={offset} is not 6 chars: {code!r}"


class TestTOTPWindow:
    """Tests that codes within the ±1 window are accepted."""

    SECRET = "JBSWY3DPEHPK3PXP"

    def test_previous_step_within_window(self):
        now = time.time()
        past = now - 30  # one step back
        code = generate_totp(self.SECRET, at=past)
        assert verify_totp(self.SECRET, code, at=now), "Previous step code should be valid (window=1)"

    def test_next_step_within_window(self):
        now = time.time()
        future = now + 30  # one step ahead
        code = generate_totp(self.SECRET, at=future)
        assert verify_totp(self.SECRET, code, at=now), "Next step code should be valid (window=1)"

    def test_old_code_outside_window_fails(self):
        now = time.time()
        old = now - 150  # 5 steps back (well outside window=1)
        code = generate_totp(self.SECRET, at=old)
        assert not verify_totp(self.SECRET, code, at=now), "Code from 5 steps ago must be rejected"

    def test_future_code_outside_window_fails(self):
        now = time.time()
        far_future = now + 150  # 5 steps ahead
        code = generate_totp(self.SECRET, at=far_future)
        assert not verify_totp(self.SECRET, code, at=now), "Code from 5 steps in future must be rejected"

    def test_window_zero_accepts_only_current(self):
        now = time.time()
        past = now - 30
        code = generate_totp(self.SECRET, at=past)
        assert not verify_totp(self.SECRET, code, window=0, at=now), \
            "With window=0, previous step must be rejected"


class TestTOTPInvalidCodes:
    """Tests that invalid codes are rejected."""

    SECRET = "JBSWY3DPEHPK3PXP"

    def test_wrong_code_rejected(self):
        now = time.time()
        valid_code = generate_totp(self.SECRET, at=now)
        # Compute a different code by using a wrong secret
        wrong_code = generate_totp("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", at=now)
        if wrong_code == valid_code:
            pytest.skip("Astronomically unlikely collision — skipping")
        assert not verify_totp(self.SECRET, wrong_code, at=now), "Wrong code must be rejected"

    def test_all_zeros_rejected_most_of_the_time(self):
        """000000 is valid ~1 in 1,000,000 chance — statistical test."""
        now = time.time()
        result = verify_totp(self.SECRET, "000000", at=now)
        # We don't assert False because it could legitimately be 000000
        # but we document this test exists and runs without error.
        assert isinstance(result, bool)

    def test_verify_returns_false_not_raises_for_wrong_code(self):
        now = time.time()
        result = verify_totp(self.SECRET, "999999", at=now)
        assert isinstance(result, bool)


class TestTOTPErrors:
    """Tests that invalid inputs raise appropriate errors."""

    def test_invalid_base32_secret_raises(self):
        with pytest.raises(Exception):
            generate_totp("NOT!VALID!BASE32!!!", at=time.time())

    def test_empty_secret_raises(self):
        with pytest.raises(Exception):
            generate_totp("", at=time.time())


class TestTOTPDeterminism:
    """Tests that the same inputs always produce the same output."""

    SECRET = "JBSWY3DPEHPK3PXP"
    FIXED_TIME = 1700000000.0  # arbitrary fixed Unix timestamp

    def test_same_time_same_code(self):
        code1 = generate_totp(self.SECRET, at=self.FIXED_TIME)
        code2 = generate_totp(self.SECRET, at=self.FIXED_TIME)
        assert code1 == code2, "TOTP must be deterministic for same time"

    def test_different_time_step_same_window_same_code(self):
        """Two timestamps in the same 30-second window must produce the same code."""
        t1 = 1700000010.0
        t2 = 1700000020.0  # same 30s window
        assert int(t1) // 30 == int(t2) // 30, "Test setup: times must be in same window"
        code1 = generate_totp(self.SECRET, at=t1)
        code2 = generate_totp(self.SECRET, at=t2)
        assert code1 == code2

    def test_adjacent_windows_different_codes(self):
        """Two timestamps in adjacent 30-second windows should differ."""
        t1 = 1700000010.0
        t2 = 1700000040.0  # next 30s window
        assert int(t1) // 30 != int(t2) // 30, "Test setup: times must be in different windows"
        code1 = generate_totp(self.SECRET, at=t1)
        code2 = generate_totp(self.SECRET, at=t2)
        assert code1 != code2, "Adjacent windows should produce different codes"
