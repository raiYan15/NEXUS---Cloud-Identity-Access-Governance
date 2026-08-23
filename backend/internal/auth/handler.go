package auth

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/nexus/identity-platform/internal/audit"
	"github.com/nexus/identity-platform/internal/users"
)

// Handler holds HTTP handlers for the auth routes.
type Handler struct {
	service      *Service
	auditLogger  audit.Logger
}

// NewHandler creates a new auth Handler.
func NewHandler(svc *Service, al audit.Logger) *Handler {
	return &Handler{service: svc, auditLogger: al}
}

// writeJSON sends a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("[ERROR] writeJSON encode: %v", err)
	}
}

// writeError sends a structured JSON error response.
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// registerRequest is the decoded body of POST /api/v1/auth/register.
type registerRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

// Register handles POST /api/v1/auth/register.
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	role := users.Role(strings.ToLower(strings.TrimSpace(req.Role)))

	u, err := h.service.Register(RegisterInput{
		Username: req.Username,
		Password: req.Password,
		Role:     role,
	})
	if err != nil {
		switch {
		case errors.Is(err, ErrUserAlreadyExists):
			writeError(w, http.StatusConflict, "username already taken")
		case errors.Is(err, ErrWeakPassword):
			writeError(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, ErrInvalidRole):
			writeError(w, http.StatusBadRequest, "invalid role; allowed: admin, user, developer, analyst, viewer, security_manager, super_admin")
		case errors.Is(err, ErrInvalidInput):
			writeError(w, http.StatusBadRequest, err.Error())
		default:
			log.Printf("[ERROR] Register: %v", err)
			writeError(w, http.StatusInternalServerError, "registration failed")
		}
		h.auditLogger.Log(audit.Event{
			Action:    audit.ActionUserRegistered,
			IPAddress: r.RemoteAddr,
			UserAgent: r.UserAgent(),
			Metadata:  map[string]string{"username": req.Username, "result": "failed"},
		})
		return
	}

	h.auditLogger.Log(audit.Event{
		UserID:    u.ID,
		Action:    audit.ActionUserRegistered,
		IPAddress: r.RemoteAddr,
		UserAgent: r.UserAgent(),
		Metadata:  map[string]string{"username": u.Username, "role": string(u.Role)},
	})

	writeJSON(w, http.StatusCreated, map[string]any{
		"message": "user registered successfully",
		"user":    u.ToPublic(),
	})
}

// loginRequest is the decoded body of POST /api/v1/auth/login.
type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Login handles POST /api/v1/auth/login.
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	token, u, err := h.service.Login(LoginInput{
		Username: req.Username,
		Password: req.Password,
	})
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			h.auditLogger.Log(audit.Event{
				Action:    audit.ActionLoginFailed,
				IPAddress: r.RemoteAddr,
				UserAgent: r.UserAgent(),
				Metadata:  map[string]string{"username": req.Username},
			})
			writeError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		log.Printf("[ERROR] Login: %v", err)
		writeError(w, http.StatusInternalServerError, "login failed")
		return
	}

	h.auditLogger.Log(audit.Event{
		UserID:    u.ID,
		Action:    audit.ActionLoginSuccess,
		IPAddress: r.RemoteAddr,
		UserAgent: r.UserAgent(),
		Metadata:  map[string]string{"username": u.Username},
	})

	writeJSON(w, http.StatusOK, map[string]string{"token": token})
}

// Me handles GET /api/v1/auth/me — returns the authenticated user's profile.
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	claims := ClaimsFromContext(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	u, err := h.service.GetUserByID(claims.UserID)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	writeJSON(w, http.StatusOK, u.ToPublic())
}

// ListUsers handles GET /api/v1/users — admin only.
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	userList, err := h.service.ListUsers()
	if err != nil {
		log.Printf("[ERROR] ListUsers: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to retrieve users")
		return
	}

	public := make([]users.PublicUser, 0, len(userList))
	for _, u := range userList {
		public = append(public, u.ToPublic())
	}

	writeJSON(w, http.StatusOK, map[string]any{"users": public, "count": len(public)})
}

// AdminOnly handles GET /api/v1/admin-only — requires admin role.
func (h *Handler) AdminOnly(w http.ResponseWriter, r *http.Request) {
	claims := ClaimsFromContext(r.Context())
	writeJSON(w, http.StatusOK, map[string]string{
		"message": "welcome to the admin zone",
		"user":    claims.Username,
		"role":    string(claims.Role),
	})
}

// UserOrAdmin handles GET /api/v1/user-or-admin — any authenticated user.
func (h *Handler) UserOrAdmin(w http.ResponseWriter, r *http.Request) {
	claims := ClaimsFromContext(r.Context())
	writeJSON(w, http.StatusOK, map[string]string{
		"message": "authenticated access granted",
		"user":    claims.Username,
		"role":    string(claims.Role),
	})
}
