package audit

import "time"

// Action is a security-significant event type.
type Action string

const (
	ActionUserRegistered    Action = "USER_REGISTERED"
	ActionLoginSuccess      Action = "LOGIN_SUCCESS"
	ActionLoginFailed       Action = "LOGIN_FAILED"
	ActionMFASuccess        Action = "MFA_SUCCESS"
	ActionMFAFailed         Action = "MFA_FAILED"
	ActionAccessGranted     Action = "ACCESS_GRANTED"
	ActionAccessDenied      Action = "ACCESS_DENIED"
	ActionRoleChanged       Action = "ROLE_CHANGED"
	ActionPolicyCreated     Action = "POLICY_CREATED"
	ActionPolicyUpdated     Action = "POLICY_UPDATED"
	ActionPolicyDeleted     Action = "POLICY_DELETED"
	ActionTokenRejected     Action = "TOKEN_REJECTED"
	ActionRateLimitTriggered Action = "RATE_LIMIT_TRIGGERED"
)

// Event is a single audit log record.
type Event struct {
	ID        string            `json:"id"`
	UserID    string            `json:"user_id,omitempty"`
	Action    Action            `json:"action"`
	Resource  string            `json:"resource,omitempty"`
	IPAddress string            `json:"ip_address,omitempty"`
	UserAgent string            `json:"user_agent,omitempty"`
	Metadata  map[string]string `json:"metadata,omitempty"`
	Timestamp time.Time         `json:"timestamp"`
}

// Logger is the interface for writing audit events.
// Implementations: MemoryLogger (Layer 1-2), PostgresLogger (Layer 3+).
type Logger interface {
	Log(event Event)
	List(page, pageSize int) ([]Event, int, error)
}
