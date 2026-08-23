# --- Build Stage ---
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /app/nexus-server \
    ./cmd/server

# --- Final Production Image ---
FROM alpine:3.20

WORKDIR /app

# Security: run as non-root user
RUN addgroup -S nexus && adduser -S nexus -G nexus

# Copy certificates and compiled binary
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/nexus-server /app/nexus-server

USER nexus:nexus

EXPOSE 8080

ENV PORT=8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["/app/nexus-server"]
