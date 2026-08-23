package policy

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/nexus/identity-platform/internal/audit"
	"github.com/nexus/identity-platform/internal/auth"
	"github.com/nexus/identity-platform/internal/users"
)

// Handler exposes the policy engine over HTTP.
type Handler struct {
	engine      *Engine
	auditLogger audit.Logger
}

// NewHandler creates a policy HTTP handler.
func NewHandler(engine *Engine, al audit.Logger) *Handler {
	return &Handler{engine: engine, auditLogger: al}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("[ERROR] policy writeJSON: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// accessCheckRequest is the body for POST /api/v1/access/check.
type accessCheckRequest struct {
	UserID        string `json:"user_id"`
	Application   string `json:"application"`
	DeviceTrusted bool   `json:"device_trusted"`
	MFAVerified   bool   `json:"mfa_verified"`
	RiskScore     int    `json:"risk_score"`
}

// CheckAccess handles POST /api/v1/access/check.
func (h *Handler) CheckAccess(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req accessCheckRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	if req.Application == "" {
		writeError(w, http.StatusBadRequest, "application is required")
		return
	}

	policyReq := Request{
		UserID:        claims.UserID,
		Role:          claims.Role,
		Application:   req.Application,
		DeviceTrusted: req.DeviceTrusted,
		MFAVerified:   req.MFAVerified,
		RiskScore:     req.RiskScore,
		IPAddress:     r.RemoteAddr,
	}

	result := h.engine.Evaluate(policyReq)

	auditAction := audit.ActionAccessGranted
	if result.Decision != DecisionAllow {
		auditAction = audit.ActionAccessDenied
	}
	h.auditLogger.Log(audit.Event{
		UserID:    claims.UserID,
		Action:    auditAction,
		Resource:  req.Application,
		IPAddress: r.RemoteAddr,
		UserAgent: r.UserAgent(),
		Metadata: map[string]string{
			"decision": string(result.Decision),
			"reason":   result.Reason,
		},
	})

	writeJSON(w, http.StatusOK, result)
}

// ListPolicies handles GET /api/v1/policies.
func (h *Handler) ListPolicies(w http.ResponseWriter, r *http.Request) {
	policies := h.engine.ListPolicies()
	writeJSON(w, http.StatusOK, map[string]any{"policies": policies, "count": len(policies)})
}

// createPolicyRequest is the body for POST /api/v1/policies.
type createPolicyRequest struct {
	Name           string     `json:"name"`
	Role           users.Role `json:"role"`
	Application    string     `json:"application"`
	RequireMFA     bool       `json:"require_mfa"`
	RequireTrusted bool       `json:"require_trusted_device"`
	MaxRiskScore   int        `json:"max_risk_score"`
	Decision       Decision   `json:"decision"`
	Enabled        bool       `json:"enabled"`
}

// CreatePolicy handles POST /api/v1/policies.
func (h *Handler) CreatePolicy(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())

	var req createPolicyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	if req.Name == "" || req.Application == "" {
		writeError(w, http.StatusBadRequest, "name and application are required")
		return
	}

	p, err := h.engine.CreatePolicy(Policy{
		Name:           req.Name,
		Role:           req.Role,
		Application:    req.Application,
		RequireMFA:     req.RequireMFA,
		RequireTrusted: req.RequireTrusted,
		MaxRiskScore:   req.MaxRiskScore,
		Decision:       req.Decision,
		Enabled:        req.Enabled,
	})
	if err != nil {
		log.Printf("[ERROR] CreatePolicy: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to create policy")
		return
	}

	h.auditLogger.Log(audit.Event{
		UserID:   claims.UserID,
		Action:   audit.ActionPolicyCreated,
		Resource: p.ID,
		Metadata: map[string]string{"policy_name": p.Name},
	})

	writeJSON(w, http.StatusCreated, p)
}

// DeletePolicy handles DELETE /api/v1/policies/{id}.
func (h *Handler) DeletePolicy(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "policy id required")
		return
	}

	if err := h.engine.DeletePolicy(id); err != nil {
		writeError(w, http.StatusNotFound, "policy not found")
		return
	}

	h.auditLogger.Log(audit.Event{
		UserID:   claims.UserID,
		Action:   audit.ActionPolicyDeleted,
		Resource: id,
	})

	writeJSON(w, http.StatusOK, map[string]string{"message": "policy deleted"})
}
