#!/usr/bin/env bash
# Build cronner image locally on Hostinger VPS and apply via cronner-deploy-release.
# Mirrors mallanet/Terremotoapp scripts/vps-local-release-deploy.sh
#
# Uso (root en el VPS):
#   cronner-vps-release <gitSha40>
#   GIT_SHA=<gitSha40> cronner-vps-release
set -euo pipefail
umask 077

[ "${EUID:-$(id -u)}" -eq 0 ] || {
  echo "[cronner-vps-release] debe ejecutarse como root" >&2
  exit 1
}

GIT_SHA=${1:-${GIT_SHA:-}}
[[ "$GIT_SHA" =~ ^[0-9a-f]{7,40}$ ]] || {
  echo "uso: cronner-vps-release <git-sha>" >&2
  exit 64
}

REPO=${CRONNER_RELEASE_REPO:-/opt/cronner-release}
STATE_DIR=${CRONNER_DEPLOY_STATE_DIR:-/var/lib/cronner-deploy}
ENV_FILE=${CRONNER_CONFIG_DIR:-/etc/cronner}/prod.env
GIT_REMOTE=${CRONNER_GIT_REMOTE:-git@github.com-mallanet-cronner:mallanet/mallanet-cronner.git}

resolve_git_sha() {
  local ref=$1 dir
  for dir in "$REPO" "${CRONNER_BOOTSTRAP_SRC:-/opt/cronner}"; do
    [ -d "$dir/.git" ] || continue
    git -C "$dir" fetch --depth=1 origin "$ref" >/dev/null 2>&1 || true
    if git -C "$dir" rev-parse --verify "${ref}^{commit}" 2>/dev/null; then
      return 0
    fi
  done
  return 1
}

if [[ "$GIT_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  :
elif resolved=$(resolve_git_sha "$GIT_SHA"); then
  GIT_SHA=$resolved
else
  echo "[cronner-vps-release] no se pudo resolver SHA: ${1:-$GIT_SHA}" >&2
  exit 64
fi

command -v cronner-deploy-release >/dev/null || {
  echo "[cronner-vps-release] falta cronner-deploy-release en PATH" >&2
  exit 1
}
[ -f "$ENV_FILE" ] || {
  echo "[cronner-vps-release] falta $ENV_FILE" >&2
  exit 1
}

if [ ! -d "$REPO/.git" ]; then
  git clone --filter=blob:none "$GIT_REMOTE" "$REPO"
fi

cd "$REPO"
git fetch --depth=1 origin "$GIT_SHA"
git checkout --force --detach "$GIT_SHA"
git reset --hard "$GIT_SHA"
git clean -fdx -e node_modules

export DOCKER_BUILDKIT=1
echo "[cronner-vps-release] building image for $GIT_SHA"

docker build -t "cronner-release:${GIT_SHA}" .

image_id() {
  local id
  id=$(docker inspect --format '{{.Id}}' "$1")
  [[ "$id" =~ ^sha256:[0-9a-f]{64}$ ]] || {
    echo "[cronner-vps-release] id de imagen inesperado: $id" >&2
    exit 1
  }
  printf '%s\n' "$id"
}

CRONNER_ID=$(image_id "cronner-release:${GIT_SHA}")

mkdir -p "$STATE_DIR/releases"
MANIFEST="$STATE_DIR/releases/manifest-${GIT_SHA}-local.json"
jq -n \
  --arg gitSha "$GIT_SHA" \
  --arg cronner "$CRONNER_ID" \
  '{schemaVersion:1, gitSha:$gitSha, images:{cronner:$cronner}}' \
  >"$MANIFEST"
chmod 600 "$MANIFEST"

echo "[cronner-vps-release] applying $MANIFEST"
cronner-deploy-release "$MANIFEST"
echo "[cronner-vps-release] ok $(jq -r .gitSha "$STATE_DIR/current-manifest.json")"
