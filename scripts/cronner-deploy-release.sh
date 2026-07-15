#!/usr/bin/env bash
# Apply a cronner release manifest (local digest or GHCR). Installed as /usr/local/sbin/cronner-deploy-release
set -euo pipefail
umask 077

[ "${EUID:-$(id -u)}" -eq 0 ] || {
  echo "[cronner-deploy] debe ejecutarse como root" >&2
  exit 1
}
[ "$#" -eq 1 ] || {
  echo "uso: cronner-deploy-release /ruta/release-manifest.json" >&2
  exit 64
}
for command in curl docker flock jq stat; do
  command -v "$command" >/dev/null || {
    echo "[cronner-deploy] falta dependencia: $command" >&2
    exit 1
  }
done

MANIFEST=$(readlink -f "$1")
CONFIG_DIR="${CRONNER_CONFIG_DIR:-/etc/cronner}"
STATE_DIR="${CRONNER_DEPLOY_STATE_DIR:-/var/lib/cronner-deploy}"
ENV_FILE="$CONFIG_DIR/prod.env"
BASE_COMPOSE="$CONFIG_DIR/docker-compose.prod.yml"
RELEASE_COMPOSE="$CONFIG_DIR/docker-compose.release.yml"
CURRENT_MANIFEST="$STATE_DIR/current-manifest.json"
LOCK_FILE=/run/lock/cronner-deploy.lock
HEALTH_URL="${CRONNER_HEALTH_URL:-http://127.0.0.1:8333/api/health}"

for path in "$MANIFEST" "$ENV_FILE" "$BASE_COMPOSE" "$RELEASE_COMPOSE"; do
  [ -f "$path" ] && [ ! -L "$path" ] || {
    echo "[cronner-deploy] falta archivo regular o es symlink: $path" >&2
    exit 1
  }
done
case "$(stat -c %a "$ENV_FILE")" in
  600|400) ;;
  *) echo "[cronner-deploy] prod.env debe tener modo 0600 o 0400" >&2; exit 1 ;;
esac

exec 9>"$LOCK_FILE"
flock -n 9 || { echo "[cronner-deploy] ya hay un despliegue activo" >&2; exit 1; }
mkdir -p "$STATE_DIR/releases"
chmod 0700 "$STATE_DIR" "$STATE_DIR/releases"

compose() {
  docker compose --project-name cronner \
    --file "$BASE_COMPOSE" --file "$RELEASE_COMPOSE" \
    --env-file "$ENV_FILE" "$@"
}

read_manifest() {
  local manifest=$1 image_root='ghcr.io/mallanet/mallanet-cronner'
  jq -e '.schemaVersion == 1 and (.gitSha | test("^[0-9a-f]{40}$"))' "$manifest" >/dev/null
  CRONNER_IMAGE=$(jq -er '.images.cronner' "$manifest")
  if [[ "$CRONNER_IMAGE" =~ ^$image_root@sha256:[0-9a-f]{64}$ ]]; then
    RELEASE_PULL_POLICY=always
  elif [[ "$CRONNER_IMAGE" =~ ^sha256:[0-9a-f]{64}$ ]]; then
    RELEASE_PULL_POLICY=never
  else
    echo "[cronner-deploy] referencia de imagen no permitida" >&2
    exit 1
  fi
  export CRONNER_IMAGE RELEASE_PULL_POLICY
}

wait_for_health() {
  local url=$1
  for attempt in $(seq 1 30); do
    curl --fail --silent --show-error --max-time 5 "$url" >/dev/null && return 0
    sleep 2
  done
  echo "[cronner-deploy] healthcheck falló: $url" >&2
  return 1
}

apply_manifest() {
  local manifest=$1
  read_manifest "$manifest"
  if [ "$RELEASE_PULL_POLICY" = always ]; then compose pull cronner; fi
  compose up -d --no-build cronner-db
  compose up -d --no-build --remove-orphans cronner
  wait_for_health "$HEALTH_URL"
}

ROLLBACK_MANIFEST=""
if [ -f "$CURRENT_MANIFEST" ]; then
  ROLLBACK_MANIFEST="$STATE_DIR/releases/rollback-$(date -u +%Y%m%dT%H%M%SZ).json"
  install -o root -g root -m 0600 "$CURRENT_MANIFEST" "$ROLLBACK_MANIFEST"
fi

if ! apply_manifest "$MANIFEST"; then
  if [ -n "$ROLLBACK_MANIFEST" ]; then
    echo "[cronner-deploy] fallo; restaurando release anterior" >&2
    apply_manifest "$ROLLBACK_MANIFEST" || {
      echo "[cronner-deploy] ROLLBACK FALLÓ; intervención manual" >&2
      exit 2
    }
  fi
  exit 1
fi
install -o root -g root -m 0600 "$MANIFEST" "$CURRENT_MANIFEST"
echo "[cronner-deploy] release aplicada: $(jq -r .gitSha "$MANIFEST")"
