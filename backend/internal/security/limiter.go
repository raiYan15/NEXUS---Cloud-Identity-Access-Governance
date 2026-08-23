package security

import "context"

// Limiter is the interface for rate limiting implementations.
// This allows swapping Redis-backed for no-op in tests and degraded-mode operation.
type Limiter interface {
	IsRateLimited(ctx context.Context, ip string) (bool, error)
	RecordFailedLogin(ctx context.Context, ip string) (int64, bool, error)
	ResetFailedLogins(ctx context.Context, ip string) error
}
