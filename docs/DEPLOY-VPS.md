# Deploy en VPS Hostinger (mallanet)

Mismo patrón que **mallanet/Terremotoapp**: GitHub Actions en runner self-hosted `hostinger` → build local en VPS → `cronner-deploy-release`.

## Arquitectura

```
push master → deploy-selfhosted.yml
  → runs-on: [self-hosted, hostinger]
  → sudo cronner-vps-release $SHA
      → git fetch en /opt/cronner-release
      → docker build
      → manifest con digest
      → cronner-deploy-release manifest.json
          → docker compose -f prod -f release up
```

## Bootstrap único en VPS

Desde el workspace `hostinger`:

```bash
python scripts/hostinger_cronner.py bootstrap-cd
```

Eso instala:

| Path | Rol |
|------|-----|
| `/usr/local/sbin/cronner-vps-release` | Build + manifest |
| `/usr/local/sbin/cronner-deploy-release` | Apply compose |
| `/etc/cronner/prod.env` | Secretos (desde deploy actual) |
| `/etc/cronner/docker-compose.prod.yml` | Base |
| `/etc/cronner/docker-compose.release.yml` | Overlay imagen |
| `/root/.ssh/mallanet-cronner-deploy` | Deploy key read-only |
| `/etc/sudoers.d/gha-runner-cronner` | NOPASSWD para gha-runner |

Añadir la pubkey en GitHub → `mallanet/mallanet-cronner` → Deploy keys.

## Repo canónico

`git@github.com-mallanet-cronner:mallanet/mallanet-cronner.git` (SSH config en VPS).

## Manual

```bash
sudo cronner-vps-release <git-sha-40>
```

## Health

`curl -fsS http://127.0.0.1:8333/api/health`

Tailnet: `https://mallanet-vault.tail39b53b.ts.net:8444` (Tailscale serve).
