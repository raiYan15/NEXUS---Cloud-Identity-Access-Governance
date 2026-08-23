package policy

import (
	"fmt"
	"sync"

	"github.com/google/uuid"
	"github.com/nexus/identity-platform/internal/users"
)

// Engine evaluates access requests against a set of stored policies.
// It is kept completely separate from HTTP handlers so it can be unit-tested directly.
type Engine struct {
	mu       sync.RWMutex
	policies map[string]*Policy
}

// NewEngine creates a new policy Engine with default built-in policies.
func NewEngine() *Engine {
	e := &Engine{
		policies: make(map[string]*Policy),
	}
	e.seedDefaults()
	return e
}

// seedDefaults loads a set of sensible starting policies.
func (e *Engine) seedDefaults() {
	defaults := []*Policy{
		{
			ID:            uuid.New().String(),
			Name:          "Developer AWS Console Access",
			Role:          users.RoleDeveloper,
			Application:   "aws-console",
			RequireMFA:    true,
			RequireTrusted: true,
			MaxRiskScore:  70,
			Decision:      DecisionAllow,
			Enabled:       true,
		},
		{
			ID:            uuid.New().String(),
			Name:          "Admin Full Access",
			Role:          users.RoleAdmin,
			Application:   "*",
			RequireMFA:    true,
			RequireTrusted: false,
			MaxRiskScore:  50,
			Decision:      DecisionAllow,
			Enabled:       true,
		},
		{
			ID:            uuid.New().String(),
			Name:          "Viewer Read-Only",
			Role:          users.RoleViewer,
			Application:   "*",
			RequireMFA:    false,
			RequireTrusted: false,
			MaxRiskScore:  0,
			Decision:      DecisionAllow,
			Enabled:       true,
		},
	}
	for _, p := range defaults {
		e.policies[p.ID] = p
	}
}

// Evaluate runs the request against all enabled policies.
//
// Evaluation order:
//  1. Find all enabled policies matching the user's role and application.
//  2. If none match: DENY (default-deny posture).
//  3. For each matching policy, check conditions; return the most restrictive result.
//  4. If any policy denies: DENY.
//  5. If any policy requires MFA and MFA is not verified: REQUIRE_MFA.
//  6. If all conditions pass: ALLOW.
func (e *Engine) Evaluate(req Request) Result {
	e.mu.RLock()
	defer e.mu.RUnlock()

	var matching []*Policy
	for _, p := range e.policies {
		if !p.Enabled {
			continue
		}
		if p.Role != req.Role && p.Role != "*" {
			continue
		}
		if p.Application != "*" && p.Application != req.Application {
			continue
		}
		matching = append(matching, p)
	}

	if len(matching) == 0 {
		return Result{
			Decision: DecisionDeny,
			Reason:   fmt.Sprintf("no policy grants role '%s' access to '%s'", req.Role, req.Application),
		}
	}

	for _, p := range matching {
		// Risk score check
		if p.MaxRiskScore > 0 && req.RiskScore > p.MaxRiskScore {
			return Result{
				Decision: DecisionDeny,
				Reason:   fmt.Sprintf("risk score %d exceeds policy maximum of %d", req.RiskScore, p.MaxRiskScore),
				PolicyID: p.ID,
			}
		}

		// Trusted device check
		if p.RequireTrusted && !req.DeviceTrusted {
			return Result{
				Decision: DecisionDeny,
				Reason:   "trusted device required by policy",
				PolicyID: p.ID,
			}
		}

		// MFA check — if required but not verified, ask for MFA rather than hard deny
		if p.RequireMFA && !req.MFAVerified {
			return Result{
				Decision: DecisionRequireMFA,
				Reason:   "MFA verification required by policy",
				PolicyID: p.ID,
			}
		}

		// If the policy itself is a DENY rule, honour it
		if p.Decision == DecisionDeny {
			return Result{
				Decision: DecisionDeny,
				Reason:   fmt.Sprintf("policy '%s' explicitly denies access", p.Name),
				PolicyID: p.ID,
			}
		}
	}

	// All conditions passed on at least one ALLOW policy
	return Result{
		Decision: DecisionAllow,
		Reason:   "access granted by policy",
	}
}

// --- Policy CRUD ---

// CreatePolicy adds a new policy to the engine.
func (e *Engine) CreatePolicy(p Policy) (*Policy, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	p.ID = uuid.New().String()
	copy := p
	e.policies[p.ID] = &copy
	return &copy, nil
}

// ListPolicies returns all policies.
func (e *Engine) ListPolicies() []*Policy {
	e.mu.RLock()
	defer e.mu.RUnlock()

	out := make([]*Policy, 0, len(e.policies))
	for _, p := range e.policies {
		cp := *p
		out = append(out, &cp)
	}
	return out
}

// GetPolicy returns a policy by ID.
func (e *Engine) GetPolicy(id string) (*Policy, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	p, ok := e.policies[id]
	if !ok {
		return nil, fmt.Errorf("policy not found: %s", id)
	}
	cp := *p
	return &cp, nil
}

// UpdatePolicy replaces an existing policy.
func (e *Engine) UpdatePolicy(p Policy) (*Policy, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if _, ok := e.policies[p.ID]; !ok {
		return nil, fmt.Errorf("policy not found: %s", p.ID)
	}
	cp := p
	e.policies[p.ID] = &cp
	return &cp, nil
}

// DeletePolicy removes a policy by ID.
func (e *Engine) DeletePolicy(id string) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if _, ok := e.policies[id]; !ok {
		return fmt.Errorf("policy not found: %s", id)
	}
	delete(e.policies, id)
	return nil
}
