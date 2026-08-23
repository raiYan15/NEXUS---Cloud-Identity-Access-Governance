# NEXUS — Cloud Identity & Access Platform

[![CI Pipeline](https://github.com/nexus/identity-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/nexus/identity-platform/actions)
[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go&logoColor=white)](https://golang.org)
[![Python Version](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![React Version](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![AWS Secrets Manager](https://img.shields.io/badge/AWS-Secrets%20Manager-FF9900?logo=amazonaws&logoColor=white)](https://aws.amazon.com/secrets-manager/)

A production-style Zero-Trust Cloud Identity & Access Management (IAM) platform built in **Go**, **Python**, **TypeScript**, and **PostgreSQL**. Demonstrates end-to-end authentication, fine-grained Role-Based Access Control (RBAC), Contextual Policy-Based Access Control (PBAC), RFC 6238 TOTP Multi-Factor Authentication, Redis distributed rate-limiting, and AWS Secrets Manager key retrieval.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Why I Built This](#2-why-i-built-this)
3. [Key Features](#3-key-features)
4. [Architecture & Decision Pipeline](#4-architecture--decision-pipeline)
5. [Technology Stack](#5-technology-stack)
6. [Project Structure](#6-project-structure)
7. [Authentication & JWT Security](#7-authentication--jwt-security)
8. [RBAC & Permissions Matrix](#8-rbac--permissions-matrix)
9. [Policy Engine (PBAC)](#9-policy-engine-pbac)
10. [MFA & RFC 6238 TOTP](#10-mfa--rfc-6238-totp)
11. [Audit Logging & Compliance](#11-audit-logging--compliance)
12. [Redis Rate Limiting](#12-redis-rate-limiting)
13. [AWS Secrets Manager Integration](#13-aws-secrets-manager-integration)
14. [API Reference & curl Walkthrough](#14-api-reference--curl-walkthrough)
15. [Local Development Guide](#15-local-development-guide)
16. [Docker Deployment](#16-docker-deployment)
17. [Testing Verification](#17-testing-verification)
18. [Design Decisions & Tradeoffs](#18-design-decisions--tradeoffs)
19. [Production Limitations](#19-production-limitations)
20. [AWS Cloud Architecture](#20-aws-cloud-architecture)

---

## 1. Overview

NEXUS is designed as a foundational cloud security system that enforces a strict zero-trust posture:
- **Never trust passwords alone**: Multi-factor authentication (TOTP) and risk evaluation are required for sensitive workloads.
- **Least-privilege authorization**: Fine-grained capabilities decoupled from hardcoded route handlers.
- **Dynamic Contextual Policies**: Access decisions consider device trust, risk score, application sensitivity, and MFA status.
- **Cryptographic Independence**: Signing keys are loaded dynamically from cloud vaults (AWS Secrets Manager) with seamless fallback to environment variables.
- **Full Traceability**: All state-changing and access-evaluation events are recorded in an indexed PostgreSQL audit trail.

---

## 2. Why I Built This

Most developer authentication samples stop at a simple username/password login that stores a token in `localStorage`. In real enterprise cloud environments:
1. **Access decisions are dynamic**, requiring evaluation of context (risk score, network, device state).
2. **Secrets should never reside in code** or static `.env` files.
3. **Audit trails are mandatory** for regulatory compliance (SOC2, ISO 27001, HIPAA).
4. **Brute-force protection must be distributed**, not tied to a single application instance's memory.

NEXUS was engineered to demonstrate how these production concerns are solved cleanly using a high-performance Go backend, Python security utilities, PostgreSQL, Redis, and React/TypeScript.

---

## 3. Key Features

- 🔐 **Bcrypt Password Hashing**: Work factor 12 with constant-time dummy comparisons preventing timing attacks and user enumeration.
- 🎟️ **Stateless JWT Tokens**: Signed via HMAC-SHA256 (HS256) with 24-hour expiration and issuer validation.
- 🛡️ **Role-Based Access Control (RBAC)**: Fine-grained capabilities mapped across `super_admin`, `admin`, `security_manager`, `developer`, `analyst`, and `viewer`.
- 🧠 **Contextual Policy Engine (PBAC)**: Evaluates complex rules (`IF role == DEVELOPER AND app == AWS_CONSOLE AND risk < 70 AND mfa == true THEN ALLOW`).
- ⏱️ **RFC 6238 TOTP Engine**: Mathematically verified HMAC-SHA1 dynamic truncation with clock drift tolerance windows.
- 🚦 **Redis Rate Limiter**: Atomic sliding window limiting failed login attempts to 5 per 15-minute window.
- ☁️ **AWS Secrets Manager**: Go SDK v2 integration loading signing keys with automated timeout protection.
- 📊 **Security Dashboard**: React 18 + TypeScript SPA with live RBAC tester, interactive policy sandbox, and audit stream viewer.

---

## 4. Architecture & Decision Pipeline

```text
USER REQUEST
     ↓
AUTHENTICATION (Bcrypt Cost 12)
     ↓
JWT GENERATION (Key from AWS Secrets Manager)
     ↓
MFA VERIFICATION (RFC 6238 TOTP HMAC-SHA1)
     ↓
RBAC CAPABILITIES CHECK (Role-to-Permission Table)
     ↓
POLICY ENGINE EVALUATION (Device Trust + Risk Score)
     ↓
ACCESS DECISION [ ALLOW / DENY / REQUIRE_MFA ]
     ↓
AUDIT EVENT LOGGED (PostgreSQL JSONB Audit Trail)
```

---

## 5. Technology Stack

- **Backend**: Go 1.22+ (`net/http` standard library, zero framework bloat)
- **Security Utilities**: Python 3.10+ (RFC 6238 / RFC 4226 implementation)
- **Frontend**: React 18, TypeScript 5.5, Vite 5, React Router 6, Plain CSS
- **Database**: PostgreSQL 16 (`database/sql` + `lib/pq` with automated migrations)
- **Cache / Rate Limiting**: Redis 7 (`redis/go-redis/v9`)
- **Cloud**: AWS SDK for Go v2 (`aws-sdk-go-v2/service/secretsmanager`)
- **DevOps**: Docker, Docker Compose, GitHub Actions, Terraform

---

## 6. Project Structure

```text
nexus-identity-platform/
│
├── backend/
│   ├── cmd/server/
│   │   └── main.go                    # Entry point, router, graceful shutdown, dev seed
│   ├── internal/
│   │   ├── audit/                     # Audit event dispatcher & Postgres/memory stores
│   │   ├── auth/                      # Login, register, JWT service, TOTP, MFA handler
│   │   ├── database/                  # Postgres connection & embedded SQL migrations
│   │   │   └── migrations/            # 001–006 SQL schema definitions
│   │   ├── middleware/                # CORS, Security Headers, BodyLimit, JWT auth
│   │   ├── policy/                    # Contextual policy evaluation engine & handlers
│   │   ├── rbac/                      # Role-permission mapping & capability checkers
│   │   ├── security/                  # Redis-backed sliding window rate limiter
│   │   └── users/                     # User model & safe public projections
│   ├── tests/                         # Go table-driven unit & integration tests
│   ├── Dockerfile                     # Multi-stage Go production image
│   ├── go.mod
│   └── go.sum
│
├── security/
│   ├── totp_verify.py                 # Standalone Python RFC 6238 TOTP engine
│   ├── requirements.txt               # Pytest dependencies
│   └── tests/
│       └── test_totp.py               # RFC 6238 official test vector & edge case tests
│
├── frontend/
│   ├── src/
│   │   ├── components/                # Sidebar, Navbar, ProtectedRoute
│   │   ├── hooks/                     # useAuth Context hook
│   │   ├── pages/                     # Dashboard, Users, Roles, Policies, Audit, Security
│   │   ├── services/                  # Typed API Client
│   │   ├── types/                     # TypeScript domain models
│   │   ├── App.tsx                    # Route definitions
│   │   ├── index.css                  # Dark SOC theme design system
│   │   └── main.tsx                   # React root mount
│   ├── nginx.conf                     # Production reverse proxy config
│   ├── Dockerfile                     # Multi-stage Node build → Nginx serve
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── infrastructure/
│   └── terraform/
│       └── main.tf                    # AWS VPC, ALB, ECS Fargate, RDS, ElastiCache blueprint
│
├── .github/
│   └── workflows/
│       └── ci.yml                     # Multi-stage automated CI pipeline
│
├── docker-compose.yml                 # Full stack containerization
├── .gitignore
├── README.md
└── architecture.md
```

---

## 7. Authentication & JWT Security

### Password Security
- **Bcrypt Work Factor**: 12 (4,096 iterations).
- **Anti-Enumeration**: Dummy comparison `$2a$12$...` is executed for non-existent users so response timing remains indistinguishable.
- **Zero Plaintext Logging**: Passwords and secrets are omitted from all logging formats.

### Token Security
- **Algorithm**: HMAC-SHA256 (`HS256`).
- **Standard Claims**: `user_id`, `username`, `role`, `iss` (`nexus-identity-platform`), `iat`, `exp` (24h), `jti` (UUID v4).
- **Client Storage**: Tokens are kept in React application memory and `sessionStorage`, mitigating persistent browser XSS risks.

---

## 8. RBAC & Permissions Matrix

Capabilities are decoupled from roles to prevent fragile handler logic:

| Role | Users Read | Users Write | Users Delete | Apps Read | Apps Manage | Policies Read | Policies Manage | Audit Logs | Security Controls |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **SUPER_ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ADMIN** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **SECURITY_MANAGER** | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **DEVELOPER** | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **ANALYST** | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **VIEWER** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 9. Policy Engine (PBAC)

The policy engine evaluates incoming access requests against stored rules using a **default-deny** architecture:

```go
type Request struct {
    UserID        string
    Role          users.Role
    Application   string
    DeviceTrusted bool
    MFAVerified   bool
    RiskScore     int  // 0-100
}
```

### Policy Evaluation Logic:
1. Matches all enabled policies for user's role and target application.
2. If no policies match → **`DENY`** ("no policy grants access").
3. If risk score exceeds policy maximum → **`DENY`**.
4. If trusted device required and device is untrusted → **`DENY`**.
5. If MFA required and `mfa_verified == false` → **`REQUIRE_MFA`**.
6. If all constraints satisfied → **`ALLOW`**.

---

## 10. MFA & RFC 6238 TOTP

NEXUS implements the RFC 6238 TOTP standard from first principles:
- **Base Algorithm**: RFC 4226 HOTP.
- **Hash Function**: HMAC-SHA1.
- **Dynamic Truncation**: Extracts low 4 bits of the HMAC digest as byte offset, extracts 31-bit unsigned integer, and applies modulo $10^6$.
- **Clock Drift Tolerance**: Accepts tokens in window $T \in [-1, +1]$ (90-second total window).

### Test Vector Verification:
- Secret ASCII: `12345678901234567890` (Base32: `GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ`)
- Time $T=59s$ ($Counter = 1$) → Expected 6-digit TOTP: **`287082`** (Verified in both Go and Python test suites).

---

## 11. Audit Logging & Compliance

Every security-sensitive event emits a structured audit record:
- Actions: `USER_REGISTERED`, `LOGIN_SUCCESS`, `LOGIN_FAILED`, `MFA_SUCCESS`, `MFA_FAILED`, `ACCESS_GRANTED`, `ACCESS_DENIED`, `POLICY_CREATED`, `POLICY_DELETED`, `RATE_LIMIT_TRIGGERED`.
- Stored in PostgreSQL with indexed timestamps and JSONB metadata.
- Exposed via `GET /api/v1/audit` for Administrators and Security Managers.

---

## 12. Redis Rate Limiting

- Tracks failed login attempts using the key pattern `nexus:rate:login:<ip>`.
- Executed via Redis atomic pipelines (`INCR` + `EXPIRE`).
- After **5 failed attempts**, returns HTTP 429 (`Too Many Requests`) with a `Retry-After: 900` header and records a `RATE_LIMIT_TRIGGERED` audit event.

---

## 13. AWS Secrets Manager Integration

The backend loads the JWT signing key using a priority cascade:
1. Queries AWS Secrets Manager for secret ID `nexus/jwt-signing-key` (using AWS SDK for Go v2).
2. If AWS is unavailable or credentials are not configured, falls back seamlessly to the `JWT_SIGNING_KEY` environment variable.
3. Protected by a 5-second context timeout to prevent IMDS blocking in local or non-AWS test environments.

**Status**: `LIVE VERIFIED` — Cryptographic signing key created in AWS Secrets Manager (`nexus/jwt-signing-key`) and verified dynamically with AWS SDK for Go v2.

---

## 14. API Reference & curl Walkthrough

### 1. Register a new user
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "raiyan",
    "password": "SecurePassword123!",
    "role": "developer"
  }'
```
**Response (HTTP 201 Created):**
```json
{
  "message": "user registered successfully",
  "user": {
    "id": "c6a2e46f-871d-44a6-9538-6f1da4570087",
    "username": "raiyan",
    "role": "developer",
    "status": "active",
    "mfa_enabled": false,
    "created_at": "2026-08-23T13:35:00Z"
  }
}
```

### 2. Login to receive JWT
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "raiyan",
    "password": "SecurePassword123!"
  }'
```
**Response (HTTP 200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Access general authenticated endpoint
```bash
curl -X GET http://localhost:8080/api/v1/user-or-admin \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```
**Response (HTTP 200 OK):**
```json
{
  "message": "authenticated access granted",
  "user": "raiyan",
  "role": "developer"
}
```

### 4. Attempt admin-only endpoint as Developer (RBAC Enforcement)
```bash
curl -X GET http://localhost:8080/api/v1/admin-only \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```
**Response (HTTP 403 Forbidden):**
```json
{
  "error": "insufficient role: admin required"
}
```

### 5. Evaluate Contextual Access Policy
```bash
curl -X POST http://localhost:8080/api/v1/access/check \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "application": "aws-console",
    "device_trusted": true,
    "mfa_verified": true,
    "risk_score": 25
  }'
```
**Response (HTTP 200 OK):**
```json
{
  "decision": "ALLOW",
  "reason": "access granted by policy"
}
```

### 6. Inspect Audit Trail (Admin Token)
```bash
curl -X GET "http://localhost:8080/api/v1/audit?page=1&page_size=10" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

---

## 15. Local Development Guide

### Prerequisites
- **Go** 1.22+
- **Node.js** 20+
- **Python** 3.10+

### Starting the Backend
```bash
cd backend
$env:JWT_SIGNING_KEY="dev_local_secret_key_32_bytes" # Windows PowerShell
# export JWT_SIGNING_KEY="dev_local_secret_key_32_bytes" # Linux/macOS
$env:DEV_SEED="true"
go run ./cmd/server
```
*Backend starts on `http://localhost:8080` with in-memory storage and pre-seeded demo accounts (`admin`, `developer`, `viewer`).*

### Starting the Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend will open on `http://localhost:5173`.*

---

## 16. Docker Deployment

To launch the full stack with PostgreSQL, Redis, Go Backend, and React Frontend in isolated containers:

```bash
docker compose up --build
```

- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:8080`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

---

## 17. Testing Verification

### Backend Go Test Suite
```bash
cd backend
go test ./... -v
```
**Result**: 25/25 PASS (0.00s failures, table-driven tests for registration, login, JWT tampering, expiry, RBAC 403 checks, TOTP RFC vectors, policy engine rules).

### Python TOTP Security Suite
```bash
cd nexus-identity-platform
python -m pytest security/tests -v
```
**Result**: 19/19 PASS (RFC 6238 Appendix B test vector, clock drift acceptance, dynamic truncation, invalid code rejection).

### Frontend Build Check
```bash
cd frontend
npm run build
```
**Result**: `tsc -b && vite build` completed with 0 errors.

---

## 18. Design Decisions & Tradeoffs

1. **Why Go net/http over Gin/Echo?**  
   Go's standard library `net/http` is fast, has zero external framework dependencies, and enables clean architectural boundaries.
2. **Why Bcrypt with Cost 12?**  
   Bcrypt automatically incorporates a 128-bit salt and adapts iteration count ($2^{12} = 4096$ rounds) to balance verification latency (~250ms) with resistance against offline attacks.
3. **Why Policy Engine (PBAC) in addition to RBAC?**  
   RBAC answers *"Who are you and what role do you have?"*. PBAC answers *"Under what conditions (risk, device, MFA status) should you be granted access right now?"*.
4. **Why Redis for Rate Limiting?**  
   Redis atomic increment operations (`INCR`) maintain state across distributed horizontal backend replicas without locking database tables.
5. **Why sessionStorage over localStorage for JWT?**  
   `sessionStorage` clears immediately when the browser tab closes, significantly reducing persistence exposure to XSS.

---

## 19. Production Limitations

In a full enterprise multi-region deployment, consider the following enhancements:
- **Refresh Token Rotation**: Implement short-lived access tokens (15m) paired with rotating refresh tokens stored in `httpOnly` secure cookies.
- **Asymmetric Key Pairs**: Migrate from HS256 (symmetric) to RS256/ES256 (asymmetric) with automated AWS KMS key rotation.
- **Hardware Security Modules (HSM)**: FIPS 140-2 Level 3 protection for root cryptographic secrets.
- **Enterprise SAML / OIDC Federation**: Single Sign-On (SSO) integration with Okta, Azure AD, and Google Workspace.
- **Centralized Distributed Tracing**: OpenTelemetry instrumentation with AWS X-Ray and Grafana Tempo.

---

## 20. AWS Cloud Architecture

The provided Terraform configuration (`infrastructure/terraform/main.tf`) scaffolds the complete AWS production infrastructure:

```text
Internet
   ↓
CloudFront CDN (Static Frontend Assets in S3)
   ↓
Application Load Balancer (ALB)
   ↓
ECS Fargate Tasks (Go Backend Container Cluster)
   ├── AWS Secrets Manager (JWT Signing Secrets)
   ├── RDS PostgreSQL (Multi-AZ Multi-Tenant DB)
   ├── ElastiCache Redis (Rate Limiting Cluster)
   └── CloudWatch Logs (Centralized Audit Telemetry)
```
