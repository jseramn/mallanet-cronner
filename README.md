# Mallanet Cronner

Coordinación horaria para equipos distribuidos. Parte del ecosistema [mallanet.org](https://mallanet.org).

Permite a equipos en múltiples zonas horarias ver de un vistazo quién está disponible, cuándo coinciden franjas de trabajo y proponer reuniones de colaboración.

## Funcionalidades

- **Autenticación** — registro e inicio de sesión con email/contraseña (Better Auth)
- **Perfil** — nombre, zona horaria, color, modo de trabajo y horario semanal recurrente
- **Equipos** — crear equipo o unirse con código de invitación
- **Timeline** — disponibilidad del equipo alineada a tu hora, heatmap de overlaps, bloques puntuales
- **Galaxia** — visualización orbital según distancia horaria
- **Slots** — proponer ventanas de colaboración, apuntarse, sugerencias con IA (OpenRouter)
- **Notificaciones** — avisos cuando alguien se une al equipo, crea un slot o se apunta a uno

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

# 3. Aplicar esquema de base de datos en Neon
pnpm db:schema

# 4. Verificar tablas (opcional)
pnpm db:tables

# 5. Arrancar servidor de desarrollo
pnpm dev
```

La app estará disponible en [http://localhost:3000](http://localhost:3000).

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | Sí | Connection string de Neon (pooled connection) |
| `BETTER_AUTH_SECRET` | Sí | String aleatorio de al menos 32 caracteres |
| `BETTER_AUTH_URL` | No | URL base de la app (default: `http://localhost:3000`) |
| `OPENROUTER_API_KEY` | No* | API key de OpenRouter para sugerencias IA |
| `OPENROUTER_MODEL_ID` | No | Modelo a usar (default: `anthropic/claude-3-haiku`) |

\* Sin `OPENROUTER_API_KEY` la app funciona, pero el botón "Sugerir con IA" mostrará un mensaje de error.

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
| `pnpm db:schema` | Aplicar esquema SQL en Neon |
| `pnpm db:tables` | Listar tablas de la base de datos |

## Despliegue en Vercel

1. Importar el repositorio en [Vercel](https://vercel.com)
2. Configurar las variables de entorno en el dashboard del proyecto:

   - `DATABASE_URL` — connection string de Neon (pooled)
   - `BETTER_AUTH_SECRET` — mismo valor que en local
   - `BETTER_AUTH_URL` — URL de producción (ej. `https://cronner.mallanet.org`)
   - `OPENROUTER_API_KEY` — API key de OpenRouter
   - `OPENROUTER_MODEL_ID` — modelo deseado (opcional)

3. Deploy. Vercel detecta Next.js automáticamente.

Better Auth resuelve la URL base automáticamente en Vercel usando `VERCEL_URL` y `VERCEL_PROJECT_PRODUCTION_URL` si `BETTER_AUTH_URL` no está definida.

### Base de datos en producción

El esquema se aplica una sola vez contra la base de datos de Neon:

```bash
DATABASE_URL="postgresql://..." pnpm db:schema
```

## Estructura del proyecto

```
app/
  (auth)/          # Login y registro
  (app)/           # Páginas autenticadas (dashboard, galaxy, slots, team, profile)
  api/auth/        # Handler de Better Auth
components/        # Componentes React por feature
lib/
  actions/         # Server Actions (perfil, equipo, disponibilidad, slots, IA)
  auth.ts          # Configuración Better Auth
  db.ts            # Pool de conexión Postgres
  time.ts          # Utilidades de timezone y disponibilidad
scripts/
  001-setup-schema.sql   # Esquema completo de la BD
  run-schema.mts         # Script para aplicar el esquema
  list-tables.mts        # Script para listar tablas
```

## Licencia

Privado — Mallanet.
