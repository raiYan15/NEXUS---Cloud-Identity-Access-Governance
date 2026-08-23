package audit

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
)

// Handler provides HTTP handlers for audit log endpoints.
type Handler struct {
	logger Logger
}

// NewHandler creates an audit Handler.
func NewHandler(l Logger) *Handler {
	return &Handler{logger: l}
}

// writeJSON is a local helper to avoid cross-package coupling.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("[ERROR] audit writeJSON: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// List handles GET /api/v1/audit
// Query params: page (default 1), page_size (default 50, max 200)
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	page := 1
	pageSize := 50

	if p := r.URL.Query().Get("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	if ps := r.URL.Query().Get("page_size"); ps != "" {
		if v, err := strconv.Atoi(ps); err == nil && v > 0 && v <= 200 {
			pageSize = v
		}
	}

	events, total, err := h.logger.List(page, pageSize)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to retrieve audit logs")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"events":    events,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}
