# NEXUS — Technical Interview Preparation Guide

This guide contains 50 rigorous technical interview questions and concise, high-signal model answers based strictly on the actual code and architecture implemented in **NEXUS — Cloud Identity & Access Platform**.

---

## Part 1: 15 Core Technical Questions (Go, Python, TypeScript)

### 1. How did you structure the HTTP routing and middleware chain in Go without a framework?
**Answer:** We utilized Go 1.22's enhanced standard library `net/http.ServeMux` which natively supports HTTP method matching and path parameters (e.g. `POST /api/v1/auth/register`). Middleware was implemented as standard idiomatic decorators (`func(http.Handler) http.Handler`). Request-scoped data (such as authenticated JWT claims) is passed down the handler chain using Go's `context.WithValue` with an unexported private type key to prevent key collision.

### 2. How did you prevent goroutine resource leaks during server shutdown?
**Answer:** In `cmd/server/main.go`, we listen for OS termination signals (`SIGINT`, `SIGTERM`) on a buffered channel. Upon signal reception, we call `srv.Shutdown(ctx)` with a 30-second deadline context. This stops accepting new connections and gives in-flight HTTP requests and background database operations time to complete before closing the process.

### 3. How does your Go TOTP implementation avoid third-party libraries while complying with RFC 6238?
**Answer:** In `internal/auth/totp.go`, we implemented RFC 6238 on top of RFC 4226 HOTP using standard library `crypto/hmac`, `crypto/sha1`, `encoding/binary`, and `encoding/base32`. We convert Unix time to a 64-bit big-endian counter divided by 30, compute the HMAC-SHA1 digest, perform dynamic truncation using the last byte's lower nibble as an offset to extract a 31-bit unsigned integer, and apply modulo $10^6$ with zero-padding.

### 4. How did you test the RFC 6238 implementation against the official standard?
**Answer:** We implemented automated tests verifying the official RFC 6238 Appendix B test vector: using secret ASCII `12345678901234567890` (Base32 `GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ`) at timestamp $T=59s$ ($Counter=1$), the 8-digit HOTP is `94287082` and the 6-digit result is exactly `287082`. Both our Go unit tests and Python `pytest` suites verify this value.

### 5. Why did you use Python for the standalone security component?
**Answer:** Python served as an independent reference security utility to mathematically verify the RFC 6238 TOTP algorithm and dynamic truncation logic outside of the Go runtime, ensuring algorithmic correctness could be tested in isolation with `pytest`.

### 6. How is the database connection pool configured in Go?
**Answer:** In `internal/database/postgres.go`, we configure the `sql.DB` connection pool with `SetMaxOpenConns(25)`, `SetMaxIdleConns(5)`, and `SetConnMaxIdleTime(15 * time.Minute)`. This prevents connection exhaustion under traffic spikes while pruning stale database connections.

### 7. How are database migrations executed automatically on startup?
**Answer:** We used Go's `//go:embed migrations/*.sql` directive to embed raw SQL migration files directly into the compiled binary. On server boot, `database.RunMigrations()` reads and executes these scripts in lexicographical order inside a transaction before the HTTP listener accepts traffic.

### 8. How did you structure the TypeScript types to reflect domain models?
**Answer:** In `frontend/src/types/index.ts`, we defined strict TypeScript union types for roles (`'super_admin' | 'admin' | 'security_manager' | 'developer' | 'analyst' | 'viewer'`) and status, ensuring compile-time type safety across the API client, route guards, and UI components.

### 9. How does the frontend handle authentication state without persistent storage vulnerabilities?
**Answer:** The JWT is stored in React context memory and `sessionStorage`. It is attached to outbound requests via an `Authorization: Bearer <token>` header in `ApiClient`. When the tab closes, `sessionStorage` is purged, mitigating persistent XSS token theft.

### 10. How did you avoid cyclic dependencies in Go packages?
**Answer:** We designed a strict layered hierarchy: `users` (domain models) at the base, `rbac` and `audit` on top of `users`, `auth` and `policy` consuming `users`/`rbac`/`audit`, and `cmd/server/main.go` wiring all dependencies together. Interfaces like `auth.UserStore` and `audit.Logger` decouple implementations.

### 11. How does the Go rate limiter handle Redis outages?
**Answer:** We implemented a `security.Limiter` interface with two implementations: `RateLimiter` (Redis-backed) and `NilRateLimiter` (no-op fallback). If Redis is unreachable on startup, the application logs a warning and gracefully degrades to `NilRateLimiter`, ensuring user authentication remains operational.

### 12. How does the policy engine handle wildcard matches?
**Answer:** In `internal/policy/engine.go`, rules support wildcard application matching (`*`) and wildcard role matching. The engine filters for applicable policies, enforces risk thresholds and MFA requirements, and defaults to `DENY` if no granting policy matches.

### 13. How did you implement CORS safely in Go?
**Answer:** In `internal/middleware/http.go`, the CORS middleware verifies the `Origin` header against an explicit list of allowed origins (e.g. `http://localhost:5173`, `http://localhost:3000`). It responds to `OPTIONS` preflight requests immediately with `204 No Content` and attaches `Access-Control-Allow-Credentials` and `Access-Control-Max-Age` headers.

### 14. What is the benefit of Go multi-stage Docker builds?
**Answer:** In `backend/Dockerfile`, the build stage compiles a statically linked binary with `CGO_ENABLED=0` and `-ldflags="-w -s"`. The final stage copies only the binary and CA certificates into a clean Alpine image, yielding a lightweight container (<25MB) running as a non-root `nexus` user.

### 15. How do you prevent JSON decoding memory exhaustion attacks?
**Answer:** In `internal/middleware/http.go`, we wrapped all incoming request bodies with `http.MaxBytesReader(w, r.Body, 1 << 20)` (1MB limit). Any request body exceeding 1MB is rejected immediately with HTTP 413, preventing memory exhaustion Denial of Service.

---

## Part 2: 15 Project-Specific Questions (NEXUS Features & Flows)

### 16. Walk me through what happens when a user registers on NEXUS.
**Answer:** 
1. `POST /api/v1/auth/register` receives username, password, and requested role.
2. Input is validated (username 3–50 chars, password $\ge 8$ chars, role in `ValidRoles`).
3. Password is hashed using `bcrypt.GenerateFromPassword` at cost 12.
4. User record is persisted with an active status and UUID v4 ID.
5. An audit event `USER_REGISTERED` is recorded.
6. A safe `PublicUser` object (omitting password hash and MFA secret) is returned with HTTP 201.

### 17. How does NEXUS prevent username enumeration during login?
**Answer:** If `GetUserByUsername` fails to find the user in the database, the backend executes a dummy `bcrypt.CompareHashAndPassword` against a dummy hash before returning `ErrInvalidCredentials`. This ensures the response latency is identical whether the username exists or not, neutralizing timing attacks.

### 18. How are RBAC permissions evaluated differently from simple role checks?
**Answer:** Handlers do not check `if user.Role == "admin"`. Instead, `internal/rbac/permissions.go` defines fine-grained permissions (`users.read`, `applications.manage`, etc.) and a centralized role-permission map. Middleware and policy checks evaluate `rbac.HasPermission(role, permission)`, allowing role definitions to be modified in one place without altering route handlers.

### 19. How does the policy engine decide between `DENY` and `REQUIRE_MFA`?
**Answer:** In `internal/policy/engine.go`, if a policy rule allows access but requires MFA (`require_mfa == true`) and the incoming request has `mfa_verified == false`, the engine returns decision `REQUIRE_MFA`. If a risk score exceeds the maximum or a trusted device is required but not present, the engine returns a hard `DENY`.

### 20. What is the difference between RBAC and PBAC in NEXUS?
**Answer:** RBAC determines coarse capability (e.g. "Can a developer manage applications?"). PBAC (Policy-Based Access Control) evaluates runtime context (e.g. "Can this developer access the AWS Management Console right now from an untrusted laptop with a risk score of 85?").

### 21. How does the Redis rate limiter prevent brute force attacks?
**Answer:** In `internal/security/ratelimit.go`, each failed login increments `nexus:rate:login:<ip>` using a Redis pipeline (`INCR` + `EXPIRE 900s`). When the counter reaches 5, the login handler returns HTTP 429 (`Too Many Requests`), sets a `Retry-After: 900` header, and emits a `RATE_LIMIT_TRIGGERED` audit event.

### 22. How is MFA enrollment and verification handled?
**Answer:**
1. User requests `POST /api/v1/mfa/setup` → backend generates a 20-byte cryptographically secure random Base32 secret using `crypto/rand` and returns an `otpauth://` URI.
2. User enters the 6-digit code in `POST /api/v1/mfa/verify`.
3. Backend validates the code using `VerifyTOTP()` within a $\pm 1$ time-step window. On success, `mfa_enabled` is set to true and an `MFA_SUCCESS` audit event is logged.

### 23. What audit metadata is captured for security events?
**Answer:** Every audit event captures UUID `id`, `user_id`, `action` enum, `resource`, `ip_address`, `user_agent`, arbitrary JSONB `metadata` (e.g. policy name, failure reasons), and a UTC `timestamp`.

### 24. How does the frontend enforce RBAC in the navigation UI?
**Answer:** In `frontend/src/components/Sidebar.tsx`, navigation items define `allowedRoles`. The `useAuth()` hook evaluates `hasRole()`. Routes are further protected by `ProtectedRoute.tsx`. Even if a user attempts direct URL navigation, the backend independently enforces authorization and returns HTTP 403.

### 25. How is AWS Secrets Manager integrated into the auth service?
**Answer:** In `internal/auth/service.go`, `LoadSigningKey()` attempts to fetch secret `nexus/jwt-signing-key` from AWS Secrets Manager using the AWS SDK for Go v2. If AWS credentials are not found or timeout occurs (5-second limit), it falls back to the `JWT_SIGNING_KEY` environment variable and logs the source used.

### 26. How do you test that user tokens cannot access admin endpoints?
**Answer:** In `backend/tests/auth_test.go`, `TestAdminOnly_UserToken_Returns403` registers a user with role `user`, logs in to receive a JWT, and sends a `GET /api/v1/admin-only` request. The test asserts that the HTTP response code is strictly `403 Forbidden`.

### 27. How do you test JWT tampering?
**Answer:** In `backend/tests/auth_test.go`, `TestRequireAuth_TamperedToken` logs in a valid user, modifies the signature segment of the JWT (changing a single character in the third period-delimited block), and asserts that the backend returns `401 Unauthorized`.

### 28. What happens during a token expiration test?
**Answer:** The `golang-jwt/jwt/v5` parser validates the `exp` claim against current Unix time. An expired token fails standard claim verification and returns `401 Unauthorized`.

### 29. How does the application seed default users in development mode?
**Answer:** If the environment variable `DEV_SEED="true"` is set, `cmd/server/main.go` runs `seedDevUsers()` which creates pre-hashed accounts (`admin`, `developer`, `viewer`, `secmgr`) with cost-12 Bcrypt passwords.

### 30. How is the frontend production build served in Docker?
**Answer:** The frontend Dockerfile builds static assets with `npm run build` and copies `dist/` into an Nginx Alpine container. `nginx.conf` proxies `/api/*` and `/health` requests to the backend container while serving static HTML/CSS/JS with gzip compression and SPA route fallbacks.

---

## Part 3: 10 Security Questions (Threat Modeling & Controls)

### 31. Why is bcrypt preferred over SHA-256 for password hashing?
**Answer:** SHA-256 is designed for speed (gigahashes/second on modern GPUs), making it vulnerable to brute-force and dictionary attacks. Bcrypt is an intentionally slow, memory-hard adaptive hashing algorithm with a configurable work factor ($2^{12}$ rounds in NEXUS) and automatic per-password 128-bit salt generation.

### 32. What threat does clock drift pose to TOTP and how is it mitigated?
**Answer:** Client and server clocks can drift by several seconds. If validation only checked the exact 30-second window, legitimate codes would be rejected. NEXUS checks window $T \in [-1, 0, +1]$ (a 90-second acceptance window), accommodating normal clock drift while maintaining high security.

### 33. Why is storing JWTs in localStorage discouraged?
**Answer:** JavaScript running in the browser has unrestricted read access to `localStorage`. Any Cross-Site Scripting (XSS) vulnerability in the application or third-party dependencies allows attackers to exfiltrate tokens. Storing tokens in memory/sessionStorage limits persistent token exposure.

### 34. What security headers are implemented on the HTTP response?
**Answer:** In `internal/middleware/http.go`:
- `X-Content-Type-Options: nosniff` (prevents MIME type sniffing)
- `X-Frame-Options: DENY` (prevents clickjacking attacks)
- `X-XSS-Protection: 1; mode=block` (activates browser XSS filtering)
- `Referrer-Policy: strict-origin-when-cross-origin` (prevents referrer leak)
- `Content-Security-Policy: default-src 'self'` (restricts resource loading)

### 35. How does the system defend against SQL injection?
**Answer:** All SQL queries in `internal/auth/store_postgres.go` and `internal/audit/logger_postgres.go` use parameterized queries (`$1`, `$2`, etc.) via `database/sql`. User input is never concatenated into SQL strings.

### 36. Why should JWT signing keys be rotated and how is it done?
**Answer:** If a signing key is compromised, an attacker can forge tokens for any identity. In production, keys are stored in AWS Secrets Manager and rotated periodically using AWS Lambda rotation functions, with verification supporting both the current and previous key during the transition window.

### 37. How does NEXUS protect against replay attacks on sensitive endpoints?
**Answer:** Sensitive operations require short-lived tokens and fresh MFA verification. Furthermore, JWTs include a unique `jti` (JWT ID) claim generated via UUID v4, allowing the backend to blacklist or track individual token usage.

### 38. What is the risk of logging JWT tokens or passwords in application logs?
**Answer:** Application logs are frequently ingested into centralized log aggregators (CloudWatch, Datadog, Elasticsearch) accessed by broad engineering teams. Logging plaintext passwords or valid JWT tokens compromises credentials. NEXUS logs only user IDs, IP addresses, and action names.

### 39. What prevents an attacker from spamming the `/api/v1/mfa/verify` endpoint?
**Answer:** MFA verification endpoints are protected by the authenticated JWT requirement and IP-based rate limiting via Redis, preventing automated 6-digit brute force attempts ($10^6$ combinations).

### 40. Why is symmetric signing (HS256) used in NEXUS and when would you switch to RS256?
**Answer:** HS256 uses a shared symmetric secret, which is fast and appropriate when the token issuer and token verifier are the same service. When token verification is distributed across multiple microservices or third-party resource servers, asymmetric RS256 (private key signs, public key verifies) is preferred so verifiers cannot forge tokens.

---

## Part 4: 10 System Design & Scalability Questions

### 41. How would you scale NEXUS to support 100,000 requests per second?
**Answer:**
1. **Stateless Backend**: Deploy multiple Go backend replicas behind an AWS Application Load Balancer in an ECS Fargate autoscaling group.
2. **Read Replicas**: Deploy PostgreSQL Read Replicas for high-volume user and policy read queries.
3. **Redis Cluster**: Shard Redis across multiple nodes for distributed rate limiting.
4. **Edge Caching**: Cache static frontend assets on AWS CloudFront.

### 42. How does the stateless nature of JWT benefit horizontal scaling?
**Answer:** Because JWTs contain cryptographically signed claims, any backend replica can verify the token signature and extract user permissions without performing a database lookup on every single incoming HTTP request.

### 43. When would you introduce token revocation in a stateless JWT architecture?
**Answer:** If an account is suspended or a token compromised before its 24-hour expiration, stateless verification would still accept it. To handle revocation, we can store revoked token IDs (`jti`) in Redis with a TTL equal to the token's remaining lifespan, checking Redis only during token validation.

### 44. How does PostgreSQL handle high-volume audit logging?
**Answer:** In `internal/audit/logger_postgres.go`, audit logs are written asynchronously in non-blocking goroutines. For hyper-scale workloads, audit logs can be published to an Apache Kafka or AWS Kinesis topic and batched into PostgreSQL or Amazon Timestream / OpenSearch for long-term analytics.

### 45. How would you handle disaster recovery for the identity database?
**Answer:** Use AWS RDS Multi-AZ deployment for synchronous standby replication, combined with automated daily snapshots, point-in-time recovery (PITR) enabled for 35 days, and cross-region snapshot replication for regional disaster recovery.

### 46. Why is Redis preferred over Memcached for rate limiting in NEXUS?
**Answer:** Redis natively supports atomic data structures and commands (`INCR`, `EXPIRE`, sliding window sorted sets `ZADD`/`ZREMRANGEBYSCORE`) executed in a single round-trip pipeline, eliminating race conditions without distributed locks.

### 47. How would you migrate from in-memory user storage to PostgreSQL in zero downtime?
**Answer:** The repository pattern (`auth.UserStore` interface) enables dual-write deployment:
1. Deploy PostgreSQL and apply migrations.
2. Update backend to write to both stores and read from PostgreSQL with in-memory fallback.
3. Verify data parity and remove the in-memory fallback.

### 48. How would you design multi-tenant organization isolation in NEXUS?
**Answer:** Every user, application, policy, and audit log has an `organization_id` foreign key. PostgreSQL Row-Level Security (RLS) policies can enforce tenant isolation at the database layer (`WHERE organization_id = current_setting('app.current_org')`), ensuring no cross-tenant data leaks even in the event of application bugs.

### 49. How would you implement distributed tracing across the access decision pipeline?
**Answer:** Integrate OpenTelemetry (OTel) into the Go backend. Inject W3C `traceparent` headers at the ingress proxy, propagate the `context.Context` through HTTP middleware, database queries, and policy evaluation, and export traces to AWS X-Ray or Jaeger.

### 50. How would you evolve NEXUS to support Single Sign-On (SSO) with SAML 2.0 and OIDC?
**Answer:** Implement an identity federation layer in Go using `coreos/go-oidc` for OpenID Connect and `crewjam/saml` for SAML 2.0. When a user authenticates with Google Workspace or Okta, NEXUS validates the upstream assertion, JIT (Just-In-Time) provisions the user into PostgreSQL, and issues a standard NEXUS JWT with appropriate role mappings.
