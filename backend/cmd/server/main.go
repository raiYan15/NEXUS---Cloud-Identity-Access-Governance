package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nexus/identity-platform/internal/audit"
	"github.com/nexus/identity-platform/internal/auth"
	"github.com/nexus/identity-platform/internal/database"
	"github.com/nexus/identity-platform/internal/middleware"
	"github.com/nexus/identity-platform/internal/policy"
	"github.com/nexus/identity-platform/internal/security"
	"github.com/nexus/identity-platform/internal/users"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("[INFO] Starting NEXUS Identity Platform")

	// --- Data Layer & Audit Logger (PostgreSQL if DATABASE_URL is set, else In-Memory) ---
	var userStore auth.UserStore
	var auditLogger audit.Logger

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL != "" {
		db, err := database.ConnectPostgres(database.Config{
			URL:          dbURL,
			MaxOpenConns: 25,
			MaxIdleConns: 5,
		})
		if err != nil {
			log.Fatalf("[FATAL] Failed to connect to PostgreSQL: %v", err)
		}
		userStore = auth.NewPostgresUserStore(db)
		auditLogger = audit.NewPostgresLogger(db)
		log.Println("[INFO] Persistence layer: PostgreSQL (database/sql + lib/pq)")
	} else {
		userStore = auth.NewMemoryUserStore()
		auditLogger = audit.NewMemoryLogger()
		log.Println("[INFO] Persistence layer: Thread-safe In-Memory Store")
	}

	// Seed development users if DEV_SEED=true, or automatically when using in-memory store
	if os.Getenv("DEV_SEED") == "true" || dbURL == "" {
		seedDevUsers(userStore)
	}

	// --- Auth Service (loads JWT key from AWS Secrets Manager or env) ---
	signingKey, err := auth.LoadSigningKey(context.Background())
	if err != nil {
		log.Fatalf("[FATAL] Failed to load JWT signing key: %v", err)
	}

	authSvc, err := auth.NewService(userStore, signingKey)
	if err != nil {
		log.Fatalf("[FATAL] Failed to initialize auth service: %v", err)
	}

	// --- Rate Limiter (Redis-backed, falls back to no-op) ---
	rateLimiter := initRateLimiter()

	// --- Policy Engine ---
	policyEngine := policy.NewEngine()

	// --- HTTP Handlers ---
	authHandler := auth.NewHandler(authSvc, auditLogger)
	auditHandler := audit.NewHandler(auditLogger)
	policyHandler := policy.NewHandler(policyEngine, auditLogger)

	// --- Router ---
	mux := http.NewServeMux()
	registerRoutes(mux, authSvc, authHandler, auditHandler, policyHandler, rateLimiter, auditLogger)

	// --- Global Middleware Stack ---
	allowedOrigins := []string{
		getEnv("CORS_ORIGIN", "http://localhost:5173"),
		"http://localhost:3000",
	}
	handler := middleware.CORS(allowedOrigins)(
		middleware.SecurityHeaders(
			middleware.BodyLimit(1<<20)( // 1 MB max body
				mux,
			),
		),
	)

	// --- HTTP Server ---
	addr := ":" + getEnv("PORT", "8080")
	srv := &http.Server{
		Addr:         addr,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	done := make(chan struct{})
	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		<-quit
		log.Println("[INFO] Shutting down server...")
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if err := srv.Shutdown(ctx); err != nil {
			log.Printf("[ERROR] Server shutdown: %v", err)
		}
		close(done)
	}()

	log.Printf("[INFO] NEXUS backend listening on %s", addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("[FATAL] ListenAndServe: %v", err)
	}
	<-done
	log.Println("[INFO] NEXUS backend stopped")
}

// registerRoutes wires all API routes.
func registerRoutes(
	mux *http.ServeMux,
	authSvc *auth.Service,
	authH *auth.Handler,
	auditH *audit.Handler,
	policyH *policy.Handler,
	rl security.Limiter,
	auditLogger audit.Logger,
) {
	// Health check — unauthenticated
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","service":"nexus-identity-platform"}`))
	})

	// Auth public
	mux.HandleFunc("POST /api/v1/auth/register", authH.Register)
	mux.HandleFunc("POST /api/v1/auth/login",
		withRateLimit(authH.Login, rl, auditLogger))

	// Auth protected
	mux.Handle("GET /api/v1/auth/me",
		authSvc.RequireAuth(http.HandlerFunc(authH.Me)))

	// MFA
	mux.Handle("POST /api/v1/mfa/setup",
		authSvc.RequireAuth(http.HandlerFunc(authH.MFASetup)))
	mux.Handle("POST /api/v1/mfa/verify",
		authSvc.RequireAuth(http.HandlerFunc(authH.MFAVerify)))

	// Demo RBAC endpoints
	mux.Handle("GET /api/v1/admin-only",
		authSvc.RequireAuth(
			auth.RequireRole(users.RoleAdmin)(
				http.HandlerFunc(authH.AdminOnly))))

	mux.Handle("GET /api/v1/user-or-admin",
		authSvc.RequireAuth(
			http.HandlerFunc(authH.UserOrAdmin)))

	// Users — admin only
	mux.Handle("GET /api/v1/users",
		authSvc.RequireAuth(
			auth.RequireRole(users.RoleAdmin)(
				http.HandlerFunc(authH.ListUsers))))

	// Policy
	mux.Handle("GET /api/v1/policies",
		authSvc.RequireAuth(http.HandlerFunc(policyH.ListPolicies)))

	mux.Handle("POST /api/v1/policies",
		authSvc.RequireAuth(
			auth.RequireAnyRole(users.RoleAdmin, users.RoleSecurityManager)(
				http.HandlerFunc(policyH.CreatePolicy))))

	mux.Handle("DELETE /api/v1/policies/{id}",
		authSvc.RequireAuth(
			auth.RequireAnyRole(users.RoleAdmin, users.RoleSecurityManager)(
				http.HandlerFunc(policyH.DeletePolicy))))

	// Access check
	mux.Handle("POST /api/v1/access/check",
		authSvc.RequireAuth(http.HandlerFunc(policyH.CheckAccess)))

	// Audit
	mux.Handle("GET /api/v1/audit",
		authSvc.RequireAuth(
			auth.RequireAnyRole(users.RoleAdmin, users.RoleSecurityManager)(
				http.HandlerFunc(auditH.List))))
}

// withRateLimit wraps a handler with IP-based rate limit checking.
func withRateLimit(next http.HandlerFunc, rl security.Limiter, auditLogger audit.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		limited, err := rl.IsRateLimited(r.Context(), ip)
		if err != nil {
			log.Printf("[WARN] Rate limit check error: %v", err)
		}
		if limited {
			auditLogger.Log(audit.Event{
				Action:    audit.ActionRateLimitTriggered,
				IPAddress: ip,
				UserAgent: r.UserAgent(),
			})
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Retry-After", "900")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"error":"too many failed login attempts; try again in 15 minutes"}`))
			return
		}
		next(w, r)
	}
}

// initRateLimiter connects to Redis; returns NilRateLimiter on failure.
func initRateLimiter() security.Limiter {
	redisAddr := getEnv("REDIS_URL", "redis://localhost:6379")
	opts, err := redis.ParseURL(redisAddr)
	if err != nil {
		log.Printf("[WARN] Invalid REDIS_URL (%v); rate limiting disabled", err)
		return &security.NilRateLimiter{}
	}

	client := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("[WARN] Redis unavailable (%v); rate limiting disabled", err)
		return &security.NilRateLimiter{}
	}

	log.Println("[INFO] Redis connected; rate limiting enabled")
	return security.NewRateLimiter(client)
}

// seedDevUsers creates default accounts for local development.
// Passwords are bcrypt-hashed — never stored in plaintext.
func seedDevUsers(store auth.UserStore) {
	type seedUser struct {
		username string
		password string
		role     users.Role
	}

	seeds := []seedUser{
		{"admin", "AdminPassword123!", users.RoleAdmin},
		{"developer", "DevPassword123!", users.RoleDeveloper},
		{"viewer", "ViewerPassword123!", users.RoleViewer},
		{"secmgr", "SecPassword123!", users.RoleSecurityManager},
	}

	for _, s := range seeds {
		hash, err := bcrypt.GenerateFromPassword([]byte(s.password), 12)
		if err != nil {
			log.Printf("[WARN] seedDevUsers: bcrypt failed for %s: %v", s.username, err)
			continue
		}
		u := &users.User{
			Username:     s.username,
			PasswordHash: string(hash),
			Role:         s.role,
			Status:       users.StatusActive,
		}
		if err := store.CreateUser(u); err != nil {
			log.Printf("[WARN] seedDevUsers: could not create %s: %v", s.username, err)
		}
	}
	log.Println("[INFO] Dev seed users created: admin / developer / viewer / secmgr")
}

// getEnv returns the env var or the default value.
func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
