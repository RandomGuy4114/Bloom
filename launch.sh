#!/usr/bin/env bash
#
# launch.sh — bring up Bloom locally, fully self-contained.
#
# Starts the local Supabase backend (Postgres, Auth, REST API, ... in Docker),
# applies the database schema, builds+starts the static frontend, then opens
# the site in your browser. After the first run (which downloads Docker images)
# everything runs offline.
#
# Usage:
#   ./launch.sh                    # backend + frontend + open browser
#   BLOOM_PORT=9000 ./launch.sh    # use a different frontend port
#   ./launch.sh --frontend-only    # skip Supabase (use the hosted backend)
#
set -euo pipefail

cd "$(dirname "$0")"

PORT="${BLOOM_PORT:-8080}"
URL="http://localhost:${PORT}/Site/index.html"
FRONTEND_ONLY=0
[[ "${1:-}" == "--frontend-only" ]] && FRONTEND_ONLY=1

# --- pick tools --------------------------------------------------------------

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "Error: Docker Compose is not installed. Install Docker Desktop or the compose plugin." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker daemon is not running. Start Docker and try again." >&2
  exit 1
fi

# The Supabase CLI ships as a devDependency (npx) but may also be installed
# globally; prefer whichever is available.
if [[ -x node_modules/.bin/supabase ]]; then
  SUPABASE=(npx --no-install supabase)
elif command -v supabase >/dev/null 2>&1; then
  SUPABASE=(supabase)
else
  SUPABASE=()
fi

# --- backend -----------------------------------------------------------------

if [[ "${FRONTEND_ONLY}" -eq 0 ]]; then
  if [[ ${#SUPABASE[@]} -eq 0 ]]; then
    echo "Error: Supabase CLI not found. Run 'npm install' first, or pass --frontend-only." >&2
    exit 1
  fi
  echo "==> Starting local Supabase backend (first run downloads images)..."
  "${SUPABASE[@]}" start
  # Apply any migrations not yet in the running database, without wiping data.
  echo "==> Applying database migrations..."
  "${SUPABASE[@]}" migration up --local
fi

# --- frontend ----------------------------------------------------------------

echo "==> Building and starting the Bloom frontend on port ${PORT}..."
BLOOM_PORT="${PORT}" "${COMPOSE[@]}" up -d --build

echo "==> Waiting for Bloom to become available at ${URL} ..."
for _ in $(seq 1 30); do
  if curl -fsS "${URL}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> Opening ${URL}"
case "$(uname -s)" in
  Darwin) open "${URL}" ;;
  Linux)  xdg-open "${URL}" >/dev/null 2>&1 || echo "Open ${URL} in your browser." ;;
  *)      echo "Open ${URL} in your browser." ;;
esac

echo ""
echo "Bloom is running:"
echo "  Site .......... ${URL}"
if [[ "${FRONTEND_ONLY}" -eq 0 ]]; then
  echo "  Supabase API .. http://127.0.0.1:54321"
  echo "  Supabase Studio http://127.0.0.1:54323   (browse the database)"
  echo "  Email inbox ... http://127.0.0.1:54324   (signup/login emails land here)"
fi
echo ""
echo "Stop it with:"
echo "  ${COMPOSE[*]} down          # stop the frontend"
if [[ "${FRONTEND_ONLY}" -eq 0 ]]; then
  echo "  ${SUPABASE[*]} stop        # stop the backend"
fi
