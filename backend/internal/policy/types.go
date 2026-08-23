package policy

import "github.com/nexus/identity-platform/internal/users"

// Decision is the outcome of a policy evaluation.
type Decision string

const (
	DecisionAllow      Decision = "ALLOW"
	DecisionDeny       Decision = "DENY"
	DecisionRequireMFA Decision = "REQUIRE_MFA"
)

// Request is the input to the policy engine.
// It carries the user's context at the time of an access request.
type Request struct {
	UserID        string     `json:"user_id"`
	Role          users.Role `json:"role"`
	Application   string     `json:"application"`
	DeviceTrusted bool       `json:"device_trusted"`
	MFAVerified   bool       `json:"mfa_verified"`
	RiskScore     int        `json:"risk_score"` // 0–100; higher = riskier
	IPAddress     string     `json:"ip_address,omitempty"`
}

// Result is the output of a policy evaluation.
type Result struct {
	Decision Decision `json:"decision"`
	Reason   string   `json:"reason"`
	PolicyID string   `json:"policy_id,omitempty"`
}

// Policy defines a single access control rule.
type Policy struct {
	ID            string     `json:"id"`
	Name          string     `json:"name"`
	Role          users.Role `json:"role"`
	Application   string     `json:"application"`       // "*" = any application
	RequireMFA    bool       `json:"require_mfa"`
	RequireTrusted bool      `json:"require_trusted_device"`
	MaxRiskScore  int        `json:"max_risk_score"` // 0 means not enforced
	Decision      Decision   `json:"decision"`
	Enabled       bool       `json:"enabled"`
}
