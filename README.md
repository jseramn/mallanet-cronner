# Mallanet Cronner

Coordinación horaria para equipos distribuidos. Parte del ecosistema [mallanet.org](https://mallanet.org).

Permite a equipos en múltiples zonas horarias ver de un vistazo quién está disponible, cuándo coinciden franjas de trabajo y proponer reuniones de colaboración.

## Funcionalidades

- **Autenticación** — registro e inicio de sesión con email/contraseña (Better Auth)
- **Perfil** — nombre, zona horaria, color, modo de trabajo y horario semanal recurrente
- **Equipos** — crear, unirse, salir, expulsar, transferir ownership, regenerar invite y enlace `?code=`
- **Timeline** — disponibilidad del equipo alineada a tu hora, heatmap de overlaps, bloques puntuales
- **Galaxia** — visualización orbital según distancia horaria
- **Slots** — proponer ventanas de colaboración, apuntarse, sugerencias con IA (OpenRouter) y crear slot desde sugerencia
- **Notificaciones** — avisos in-app con enlaces a team/slots
- **Asistente IA** — chat con knowledge base del producto, captura de requerimientos
- **Health** — `GET /api/health` para canary post-deploy

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
- [Better Auth](https://www.better-auth.com/) — autenticación
- [Neon](https://neon.tech/) — PostgreSQL serverless
- [OpenRouter](https://openrouter.ai/) — sugerencias de slots con IA
- [Tailwind CSS 4](https://tailwindcss.com/)

## Requisitos

- Node.js 20+
- [pnpm](https://pnpm.io/) 10+
- Cuenta en [Neon](https://console.neon.tech) (free tier)
- Cuenta en [OpenRouter](https://openrouter.ai/) (opcional, para sugerencias IA)

## Setup local

```bash
# 1. Clonar e instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus valores (ver sección Variables de entorno)

# 3. Aplicar migraciones (schema + índices de equipo + rate limit IA)
pnpm db:migrate

# 4. Verificar tablas (opcional)
pnpm db:tables

# 5. Arrancar servidor de desarrollo
pnpm dev
```

La app estará disponible en [http://localhost:3000](http://localhost:3000).

Guías:

- [docs/DEPLOY.md](docs/DEPLOY.md) — producción Vercel + Neon
- [docs/TEAM.md](docs/TEAM.md) — flujo del equipo (onboarding y roles)

## Desarrollo con datos simulados (sin Neon)

Para explorar la app con un equipo demo precargado, sin tocar tu base de datos de Neon:

```bash
# 1. Copiar entorno de semilla
cp .env.seed.local.example .env.seed.local
# PowerShell: Copy-Item .env.seed.local.example .env.seed.local

# 2. Levantar Postgres local (requiere Docker)
pnpm db:up

# 3. Arrancar dev con semilla (recrea datos y lanza Next.js)
pnpm dev:seed
```

Esto usa Postgres en `localhost:5433` (ver `docker-compose.yml`), no Neon. **Requiere Docker Desktop en ejecución.**

> Alternativa sin Docker: creá un segundo proyecto en Neon solo para demos y poné su `DATABASE_URL` en `.env.seed.local`.

**Cuentas de prueba** (contraseña `demo1234` para todas):

| Email | Rol | Zona horaria |
|-------|-----|--------------|
| `ana@demo.mallanet.org` | Owner | America/Bogota |
| `marco@demo.mallanet.org` | Miembro | Europe/Madrid |
| `yuki@demo.mallanet.org` | Miembro | Asia/Tokyo |
| `sam@demo.mallanet.org` | Miembro | America/New_York |
| `priya@demo.mallanet.org` | Miembro | Asia/Kolkata |

La semilla incluye horarios recurrentes, bloques puntuales, slots de colaboración y notificaciones. En `/login` verás un panel con las cuentas demo.

Para re-sembrar sin reiniciar el servidor: `pnpm db:seed` (usa `.env.seed.local`).

Para apagar Postgres local: `pnpm db:down`

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | Sí | Connection string de Neon (pooled connection) |
| `BETTER_AUTH_SECRET` | Sí | String aleatorio de al menos 32 caracteres |
| `BETTER_AUTH_URL` | No* | URL base de la app; **recomendado en producción** (también se añade a trustedOrigins) |
| `OPENROUTER_API_KEY` | No** | API key de OpenRouter (slots IA + asistente) |
| `OPENROUTER_MODEL_ID` | No | Modelo por defecto (`anthropic/claude-3-haiku`) |
| `ASSISTANT_MODEL_ID` | No | Override de modelo solo para el asistente |
| `ASSISTANT_RATE_LIMIT_MAX` | No | Mensajes del asistente por hora (default 30) |

\* En local el default es `http://localhost:3000`. En Vercel se usan `VERCEL_URL` / `VERCEL_PROJECT_PRODUCTION_URL` si no defines `BETTER_AUTH_URL`.

\*\* Sin `OPENROUTER_API_KEY` la app funciona, pero el botón "Sugerir con IA" mostrará un mensaje de error.

**Nunca** actives `SEED_MODE` / `NEXT_PUBLIC_SEED_MODE` en producción.

Generar un secreto para Better Auth:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm start` | Servidor de producción |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Verificación de tipos TypeScript |
| `pnpm test` | Tests unitarios (Vitest) |
| `pnpm check` | lint + typecheck + test |
| `pnpm db:migrate` | Aplicar migraciones versionadas |
| `pnpm db:schema` | Aplicar solo schema base `001` |
| `pnpm db:tables` | Listar tablas de la base de datos |
| `pnpm db:up` | Levantar Postgres local para semilla (Docker) |
| `pnpm db:down` | Apagar Postgres local |
| `pnpm db:seed` | Sembrar BD con datos simulados |
| `pnpm dev:seed` | Dev con semilla local (sin Neon) |

## Despliegue en Vercel

Ver la guía completa en [docs/DEPLOY.md](docs/DEPLOY.md).

Resumen:

1. Importar el repositorio en [Vercel](https://vercel.com)
2. Configurar env: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, opcional OpenRouter
3. Aplicar migraciones: `DATABASE_URL=... pnpm db:migrate`
4. Deploy y verificar `GET /api/health`

Better Auth resuelve la URL base automáticamente en Vercel si `BETTER_AUTH_URL` no está definida; con dominio custom **sí conviene** definirla.

## Estructura del proyecto

```
app/
  (auth)/          # Login y registro
  (app)/           # Páginas autenticadas + error/loading
  api/auth/        # Handler de Better Auth
  api/health/      # Healthcheck
components/        # Componentes React por feature
lib/
  actions/         # Server Actions (perfil, equipo, disponibilidad, slots, IA)
  auth.ts          # Configuración Better Auth
  db.ts            # Pool de conexión Postgres
  time.ts          # Utilidades de timezone y disponibilidad
content/knowledge/ # Corpus del asistente (markdown)
docs/
  DEPLOY.md        # Runbook de producción
  TEAM.md          # Guía de uso del equipo
scripts/
  001-setup-schema.sql
  migrations/      # Migraciones versionadas (001–003)
  migrate.mts
  seed.mts
```

## Licencia

Privado — Mallanet.
