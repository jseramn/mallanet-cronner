# Despliegue — Mallanet Cronner

Guía para poner Cronner en producción (Vercel + Neon).

## 1. Base de datos (Neon)

1. Crea un proyecto en [console.neon.tech](https://console.neon.tech) (free tier sirve).
2. Copia la **connection string pooled** (`?sslmode=require`).
3. Aplica el esquema y migraciones desde tu máquina:

```bash
# Con la URL de producción (no uses la de seed local)
$env:DATABASE_URL="postgresql://..."   # PowerShell
# export DATABASE_URL="postgresql://..."  # bash

pnpm db:migrate
```

`pnpm db:migrate` aplica en orden `scripts/migrations/*.sql` y registra cada una en `schema_migrations`. Es seguro re-ejecutarlo.

Alternativa (solo schema base): `pnpm db:schema` y luego `pnpm db:migrate`.

## 2. Proyecto Vercel

1. Importa el repositorio en [vercel.com](https://vercel.com).
2. Framework: Next.js (autodetectado).
3. Variables de entorno (Production y Preview):

| Variable | Valor |
|----------|--------|
| `DATABASE_URL` | Neon pooled URL |
| `BETTER_AUTH_SECRET` | ≥32 chars aleatorios |
| `BETTER_AUTH_URL` | URL pública final, p.ej. `https://cronner.mallanet.org` |
| `OPENROUTER_API_KEY` | (opcional) key de OpenRouter — slots IA + asistente |
| `OPENROUTER_MODEL_ID` | (opcional) default `anthropic/claude-3-haiku` |
| `ASSISTANT_MODEL_ID` | (opcional) modelo solo del asistente |
| `ASSISTANT_RATE_LIMIT_MAX` | (opcional) default `30` mensajes/hora |

**No** configures en producción:

- `SEED_MODE`
- `NEXT_PUBLIC_SEED_MODE`

## 3. Dominio custom

1. Añade el dominio en Vercel.
2. Asegura que `BETTER_AUTH_URL` sea exactamente ese origen (sin slash final).
3. Cronner añade `BETTER_AUTH_URL` a `trustedOrigins` de Better Auth.

## 4. Verificación post-deploy

```bash
curl -sS https://TU-DOMINIO/api/health
# Esperado: {"ok":true,"db":"ok","version":"0.1.0",...}
```

Checklist manual:

- [ ] Signup de un usuario de prueba
- [ ] Completar perfil y horario semanal
- [ ] Crear equipo y copiar enlace de invitación
- [ ] Segundo usuario se une con `?code=`
- [ ] Timeline y slot de colaboración
- [ ] Owner: regenerar invite / transferir / salir
- [ ] Asistente: pregunta de uso + guardar un requerimiento (con OpenRouter)

## 5. Rotación de secretos

Si el repo o un `.env.local` se compartió fuera del equipo:

1. Regenera `BETTER_AUTH_SECRET` (invalida sesiones).
2. Rota la password/URL de Neon.
3. Rota `OPENROUTER_API_KEY`.
4. Redeploy en Vercel.

Generar secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 6. CI

GitHub Actions (`.github/workflows/ci.yml`) ejecuta `lint`, `typecheck`, `test` y `build` en cada push/PR a `main`/`master`.

## 7. Health / canary

- Endpoint: `GET /api/health`
- `200` + `ok: true` si Postgres responde
- `503` si la BD no está disponible

Úsalo en monitores o en el check post-deploy de Vercel.
