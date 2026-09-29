#!/usr/bin/env bash
# ── BookWorm — Deploy Script ──────────────────────────────────────────────────
# Run on the server as the deploy user (or in CI) to pull latest code and
# rebuild + restart all containers.
#
# Usage:
#   bash bookworm/scripts/deploy.sh
#
# Environment:
#   APP_DIR  — root of the cloned repo (default: /opt/bookworm)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/bookworm}"
BOOKWORM_DIR="${APP_DIR}/bookworm"
ENV_FILE="${BOOKWORM_DIR}/.env.production"
COMPOSE_FILE="${BOOKWORM_DIR}/docker-compose.prod.yml"

echo "════════════════════════════════════════"
echo "  BookWorm Deploy — $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "════════════════════════════════════════"

# ── Validate env file ─────────────────────────────────────────────────────────
if [ ! -f "${ENV_FILE}" ]; then
  echo "ERROR: ${ENV_FILE} not found."
  echo "  Copy .env.production.example to .env.production and fill it in."
  exit 1
fi

# Check required vars are set
source "${ENV_FILE}"
: "${DOMAIN:?DOMAIN must be set in .env.production}"
: "${ACME_EMAIL:?ACME_EMAIL must be set in .env.production}"
: "${DB_PASSWORD:?DB_PASSWORD must be set in .env.production}"
: "${JWT_SECRET:?JWT_SECRET must be set in .env.production}"
: "${JWT_REFRESH_SECRET:?JWT_REFRESH_SECRET must be set in .env.production}"

echo "  Domain:  ${DOMAIN}"
echo "  App dir: ${BOOKWORM_DIR}"

# ── Pull latest code ──────────────────────────────────────────────────────────
echo ""
echo "[1/4] Pulling latest code..."
git -C "${APP_DIR}" pull --ff-only

# ── Build images ──────────────────────────────────────────────────────────────
echo ""
echo "[2/4] Building Docker images (this takes a few minutes on first run)..."
docker compose \
  -f "${COMPOSE_FILE}" \
  --env-file "${ENV_FILE}" \
  build --parallel

# ── Run DB migrations ─────────────────────────────────────────────────────────
echo ""
echo "[3/4] Running database migrations..."
docker compose \
  -f "${COMPOSE_FILE}" \
  --env-file "${ENV_FILE}" \
  run --rm migrate

# ── Start / restart services ──────────────────────────────────────────────────
echo ""
echo "[4/4] Starting services..."
docker compose \
  -f "${COMPOSE_FILE}" \
  --env-file "${ENV_FILE}" \
  up -d --remove-orphans

# ── Health check ──────────────────────────────────────────────────────────────
echo ""
echo "Waiting for backend health check..."
for i in $(seq 1 12); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' bookworm-backend 2>/dev/null || echo "starting")
  if [ "${STATUS}" = "healthy" ]; then
    echo "  ✓ Backend is healthy"
    break
  fi
  echo "  … waiting (${i}/12) — status: ${STATUS}"
  sleep 5
done

echo ""
echo "════════════════════════════════════════"
echo "  Deploy complete!"
echo "  App:     https://${DOMAIN}"
echo "  Logs:    docker compose -f ${COMPOSE_FILE} logs -f"
echo "  Status:  docker compose -f ${COMPOSE_FILE} ps"
echo "════════════════════════════════════════"
