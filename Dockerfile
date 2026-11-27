# ==============================================================================
# Multi-stage Dockerfile for Vizag Transit
# Produces a self-contained, single-binary production image with embedded UI,
# cached GTFS data, dynamic $PORT cloud binding, and zero runtime dependencies.
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Frontend Build (React + Vite + Tailwind CSS)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies caching package manifests
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build static bundle
COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Backend Build (Go 1.24 with embedded frontend & SQLite)
# ------------------------------------------------------------------------------
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app/backend

# Install system certificates and build toolchain
RUN apk add --no-cache ca-certificates tzdata gcc musl-dev

# Cache Go modules
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source code
COPY backend/ ./

# Integrate frontend assets into Go embed.FS directory
COPY --from=frontend-builder /app/frontend/dist /app/backend/internal/web/dist

# Compile single unified static binary
# modernc.org/sqlite enables pure Go CGO_ENABLED=0 builds with zero libc dynamic linkage
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w -extldflags '-static'" \
    -trimpath \
    -o /app/vizag-transit \
    ./cmd/server

# ------------------------------------------------------------------------------
# Stage 3: Lightweight Production Container
# ------------------------------------------------------------------------------
FROM alpine:3.21 AS runner

# Install TLS certificates for live RT fetch and wget for container healthcheck
RUN apk add --no-cache ca-certificates tzdata wget \
    && addgroup -S -g 10001 transit \
    && adduser -S -u 10001 -G transit transit

WORKDIR /app

# Prepare writable data directory for SQLite database
RUN mkdir -p /app/data && chown -R transit:transit /app

# Copy cached GTFS static bundle (avoids cold-start network downloads)
COPY --chown=transit:transit backend/data/apsrtc.zip /app/data/apsrtc.zip
COPY --chown=transit:transit backend/data/route_catalogue.json* /app/data/

# Copy unified single binary from backend builder
COPY --from=backend-builder --chown=transit:transit /app/vizag-transit /app/vizag-transit

# Environment configuration (dynamic $PORT respected by Render/Fly/Koyeb/HF Spaces)
ENV PORT=8080 \
    DATA_DIR=/app/data \
    DB_PATH=/app/data/vizag_transit.db \
    GTFS_ZIP_PATH=/app/data/apsrtc.zip

# Run as non-root user
USER transit

# Document exposed HTTP port
EXPOSE 8080

# Container healthcheck against /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/api/health || exit 1

ENTRYPOINT ["/app/vizag-transit"]
