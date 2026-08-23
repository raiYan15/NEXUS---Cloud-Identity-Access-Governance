package security

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	// MaxLoginAttempts before temporary lockout
	MaxLoginAttempts = 5
	// LockoutDuration is how long a failed-attempt lockout lasts
	LockoutDuration = 15 * time.Minute
)

// RateLimiter provides Redis-backed rate limiting for sensitive endpoints.
// Redis is the source of truth; no in-memory counters are used.
type RateLimiter struct {
	client *redis.Client
}

// NewRateLimiter creates a RateLimiter using the given Redis client.
func NewRateLimiter(client *redis.Client) *RateLimiter {
	return &RateLimiter{client: client}
}

// loginKey returns the Redis key for tracking failed login attempts for an IP.
func loginKey(ip string) string {
	return fmt.Sprintf("nexus:rate:login:%s", ip)
}

// RecordFailedLogin increments the failed login counter for the given IP.
// Returns (current count, is_rate_limited, error).
func (r *RateLimiter) RecordFailedLogin(ctx context.Context, ip string) (int64, bool, error) {
	key := loginKey(ip)

	pipe := r.client.Pipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, LockoutDuration)

	if _, err := pipe.Exec(ctx); err != nil {
		return 0, false, fmt.Errorf("rate limiter: redis pipeline failed: %w", err)
	}

	count := incr.Val()
	limited := count >= MaxLoginAttempts
	if limited {
		log.Printf("[SECURITY] Rate limit triggered for IP %s (attempt %d)", ip, count)
	}
	return count, limited, nil
}

// IsRateLimited checks whether the given IP is currently rate-limited.
func (r *RateLimiter) IsRateLimited(ctx context.Context, ip string) (bool, error) {
	key := loginKey(ip)
	count, err := r.client.Get(ctx, key).Int64()
	if err == redis.Nil {
		return false, nil // no entry → not limited
	}
	if err != nil {
		return false, fmt.Errorf("rate limiter: redis get failed: %w", err)
	}
	return count >= MaxLoginAttempts, nil
}

// ResetFailedLogins clears the failed login counter (e.g., after successful login).
func (r *RateLimiter) ResetFailedLogins(ctx context.Context, ip string) error {
	return r.client.Del(ctx, loginKey(ip)).Err()
}

// NilRateLimiter is a no-op rate limiter used when Redis is unavailable.
// It logs a warning and allows all requests through.
type NilRateLimiter struct{}

func (n *NilRateLimiter) RecordFailedLogin(_ context.Context, ip string) (int64, bool, error) {
	log.Printf("[WARN] NilRateLimiter: Redis unavailable, skipping rate limit for %s", ip)
	return 0, false, nil
}

func (n *NilRateLimiter) IsRateLimited(_ context.Context, _ string) (bool, error) {
	return false, nil
}

func (n *NilRateLimiter) ResetFailedLogins(_ context.Context, _ string) error {
	return nil
}
