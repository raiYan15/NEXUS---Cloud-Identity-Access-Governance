package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/nexus/identity-platform/internal/users"
)

// contextKey is an unexported type for context values to avoid collisions.
type contextKey string

const claimsKey contextKey = "nexus_jwt_claims"

// ClaimsFromContext retrieves the JWT claims stored in the request context.
// Returns nil if no claims are present (unauthenticated request).
func ClaimsFromContext(ctx context.Context) *Claims {
	v := ctx.Value(claimsKey)
	if v == nil {
		return nil
	}
	claims, _ := v.(*Claims)
	return claims
}

// RequireAuth is a middleware that validates the Bearer JWT.
// On success it stores the claims in the request context.
// On failure it returns 401 Unauthorized.
func (s *Service) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenStr, ok := extractBearerToken(r)
		if !ok {
			writeError(w, http.StatusUnauthorized, "authorization header required (Bearer <token>)")
			return
		}

		claims, err := s.ValidateToken(tokenStr)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}

		ctx := context.WithValue(r.Context(), claimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireRole returns a middleware that checks the authenticated user's role.
// Must be chained after RequireAuth.
func RequireRole(role users.Role) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := ClaimsFromContext(r.Context())
			if claims == nil {
				writeError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			if claims.Role != role && claims.Role != users.RoleSuperAdmin {
				writeError(w, http.StatusForbidden, "insufficient role: "+string(role)+" required")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequireAnyRole returns a middleware that passes if the user has any of the given roles.
func RequireAnyRole(roles ...users.Role) func(http.Handler) http.Handler {
	allowed := make(map[users.Role]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	// super_admin always passes
	allowed[users.RoleSuperAdmin] = true

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := ClaimsFromContext(r.Context())
			if claims == nil {
				writeError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			if !allowed[claims.Role] {
				writeError(w, http.StatusForbidden, "insufficient permissions")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// extractBearerToken extracts the token from "Authorization: Bearer <token>".
func extractBearerToken(r *http.Request) (string, bool) {
	header := r.Header.Get("Authorization")
	if header == "" {
		return "", false
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", false
	}
	token := strings.TrimSpace(parts[1])
	if token == "" {
		return "", false
	}
	return token, true
}
