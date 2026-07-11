# Guía del equipo — Mallanet Cronner

Flujo recomendado para que el equipo empiece a coordinarse en minutos.

## 1. Crear cuenta

1. Abre la app → **Crear cuenta**.
2. Completa nombre, email, contraseña (≥8), zona horaria (se detecta sola) y color.
3. Entras al shell autenticado.

> Recuperación de contraseña por email no está incluida aún (requiere proveedor SMTP/Resend). Guarda tu contraseña o usa un gestor.

## 2. Perfil y horario

1. Ve a **Perfil**.
2. Confirma zona horaria y modo de trabajo.
3. Pinta tu **horario semanal** (disponible / limitado / bloqueado / deep focus).
4. En el **Timeline** puedes arrastrar bloques puntuales (reuniones, vacaciones, etc.).

Sin horario recurrente el timeline te verá como “sin horario” la mayor parte del tiempo.

## 3. Equipo

### Primer miembro (owner)

1. **Equipo** → **Crear equipo** → nombre.
2. Copia el **código** o el **enlace de invitación** (`/team?code=XXXX`).
3. Compártelo por chat/email.

### Resto del equipo

1. Crear cuenta propia.
2. Abrir el enlace o ir a **Equipo** → **Unirse con código**.

### Administración (owner)

| Acción | Efecto |
|--------|--------|
| Regenerar código | Invalida el invite anterior |
| Hacer owner | Transfiere la propiedad a otro miembro |
| Expulsar | Saca a un miembro del equipo |
| Eliminar equipo | Borra equipo, slots e invites (CASCADE) |
| Salir del equipo | Si eres owner y hay más gente, **transfiere** primero |

Cada persona solo puede estar en **un** equipo a la vez. Para cambiar, sal del actual y únete al nuevo.

## 4. Día a día

- **Timeline**: disponibilidad del equipo alineada a **tu** zona horaria + heatmap de overlaps.
- **Galaxia**: vista orbital por distancia horaria.
- **Slots**: propón ventanas de colaboración; el resto se apunta. Capacidad `0` = ilimitado.
- **Sugerir con IA** (si hay `OPENROUTER_API_KEY`): hasta 3 sugerencias/hora; si devuelve JSON, puedes **crear el slot** con un clic.
- **Campana**: notificaciones in-app (unión, slots, ownership).
- **Asistente** (`/assistant` o botón flotante): dudas de uso y envío de **requerimientos** de producto (Mis ideas).

## 5. Asistente y requerimientos

1. Abre **Asistente** en el menú o el botón flotante 🤖.
2. Pregunta p.ej. “¿cómo invito a alguien?” o “quiero exportar a Google Calendar”.
3. Para ideas de producto, el asistente puede **guardar un requerimiento** (título, detalle, categoría).
4. En la pestaña **Mis ideas** ves lo que enviaste.

Requiere `OPENROUTER_API_KEY` en el servidor. Límite por defecto: 30 mensajes/hora.

## 6. Cuentas demo (solo local)

Con `pnpm dev:seed` (Docker Postgres):

| Email | Rol | TZ |
|-------|-----|-----|
| ana@demo.mallanet.org | Owner | America/Bogota |
| marco@demo.mallanet.org | Miembro | Europe/Madrid |
| yuki@demo.mallanet.org | Miembro | Asia/Tokyo |
| sam@demo.mallanet.org | Miembro | America/New_York |
| priya@demo.mallanet.org | Miembro | Asia/Kolkata |

Contraseña de todas: `demo1234`.

**Nunca** actives `NEXT_PUBLIC_SEED_MODE` en producción.
