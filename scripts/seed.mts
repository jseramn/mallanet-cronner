import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Client } from 'pg'
import { nanoid } from 'nanoid'
import { hashPassword } from 'better-auth/crypto'
import { loadEnvFile } from './load-env.mts'
import { localDateToUtcMs } from '../lib/time'

const SEED_PASSWORD = 'demo1234'
const TEAM_INVITE = 'DEMO-SEED'

interface SeedUser {
  id: string
  name: string
  email: string
  displayName: string
  timezone: string
  color: string
  workMode: 'full-time' | 'part-time'
  role: 'owner' | 'member'
}

const USERS: Omit<SeedUser, 'id'>[] = [
  {
    name: 'Ana Restrepo',
    email: 'ana@demo.mallanet.org',
    displayName: 'Ana',
    timezone: 'America/Bogota',
    color: '#3b82f6',
    workMode: 'full-time',
    role: 'owner',
  },
  {
    name: 'Marco Silva',
    email: 'marco@demo.mallanet.org',
    displayName: 'Marco',
    timezone: 'Europe/Madrid',
    color: '#22c55e',
    workMode: 'full-time',
    role: 'member',
  },
  {
    name: 'Yuki Tanaka',
    email: 'yuki@demo.mallanet.org',
    displayName: 'Yuki',
    timezone: 'Asia/Tokyo',
    color: '#a855f7',
    workMode: 'full-time',
    role: 'member',
  },
  {
    name: 'Sam Okafor',
    email: 'sam@demo.mallanet.org',
    displayName: 'Sam',
    timezone: 'America/New_York',
    color: '#f97316',
    workMode: 'part-time',
    role: 'member',
  },
  {
    name: 'Priya Sharma',
    email: 'priya@demo.mallanet.org',
    displayName: 'Priya',
    timezone: 'Asia/Kolkata',
    color: '#14b8a6',
    workMode: 'full-time',
    role: 'member',
  },
]

function dateKeyInTz(timeZone: string, offsetDays = 0): string {
  const at = new Date(Date.now() + offsetDays * 24 * 3600_000)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
}

function utcFromLocal(timeZone: string, dayOffset: number, hour: number, minute = 0): string {
  const key = dateKeyInTz(timeZone, dayOffset)
  return new Date(localDateToUtcMs(key, hour * 60 + minute, timeZone)).toISOString()
}

function weekdaySchedule(
  userId: string,
  days: number[],
  startMinute: number,
  endMinute: number,
  status: 'available' | 'limited' | 'focus' = 'available',
) {
  return days.map((day_of_week) => ({
    user_id: userId,
    day_of_week,
    start_minute: startMinute,
    end_minute: endMinute,
    status,
  }))
}

async function main() {
  const envFile = process.argv.includes('--env')
    ? process.argv[process.argv.indexOf('--env') + 1]
    : '.env.seed.local'
  const loaded = loadEnvFile(envFile)
  if (!loaded) loadEnvFile('.env.local')

  const url = process.env.DATABASE_URL
  if (!url) {
    console.error(`❌ DATABASE_URL no definida. Copiá .env.seed.local.example → ${envFile}`)
    process.exit(1)
  }

  const client = new Client({ connectionString: url })
  await client.connect()

  try {
    const schemaPath = resolve(process.cwd(), 'scripts/001-setup-schema.sql')
    const schema = await readFile(schemaPath, 'utf8')
    await client.query(schema)
    // Migraciones incrementales (idempotentes)
    for (const file of [
      '002-team-lifecycle.sql',
      '003-ai-rate-limit.sql',
      '004-assistant.sql',
    ]) {
      try {
        const sql = await readFile(resolve(process.cwd(), 'scripts/migrations', file), 'utf8')
        await client.query(sql)
      } catch (e) {
        console.warn(`⚠ ${file}:`, (e as Error).message)
      }
    }

    await client.query(`
      TRUNCATE TABLE
        user_requirements,
        assistant_messages,
        assistant_conversations,
        ai_rate_limits,
        notifications,
        collab_slot_claims,
        collab_slots,
        time_blocks,
        recurring_schedules,
        team_members,
        teams,
        profiles,
        session,
        account,
        verification,
        "user"
      RESTART IDENTITY CASCADE
    `)

    const passwordHash = await hashPassword(SEED_PASSWORD)
    const now = new Date().toISOString()
    const seedUsers: SeedUser[] = USERS.map((u) => ({ ...u, id: nanoid() }))
    const owner = seedUsers[0]
    const teamId = nanoid()

    for (const u of seedUsers) {
      await client.query(
        `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, TRUE, $4, $4)`,
        [u.id, u.name, u.email, now],
      )
      await client.query(
        `INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         VALUES ($1, $2, 'credential', $3, $4, $5, $5)`,
        [nanoid(), u.id, u.id, passwordHash, now],
      )
      await client.query(
        `INSERT INTO profiles (user_id, display_name, timezone, color, work_mode)
         VALUES ($1, $2, $3, $4, $5)`,
        [u.id, u.displayName, u.timezone, u.color, u.workMode],
      )
    }

    await client.query(
      `INSERT INTO teams (id, name, invite_code, created_by) VALUES ($1, $2, $3, $4)`,
      [teamId, 'Equipo Mallanet Demo', TEAM_INVITE, owner.id],
    )

    for (const u of seedUsers) {
      await client.query(
        `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)`,
        [teamId, u.id, u.role],
      )
    }

    const schedules: {
      user_id: string
      day_of_week: number
      start_minute: number
      end_minute: number
      status: string
    }[] = []

    const [ana, marco, yuki, sam, priya] = seedUsers
    schedules.push(...weekdaySchedule(ana.id, [1, 2, 3, 4, 5], 540, 1020))
    schedules.push(...weekdaySchedule(marco.id, [1, 2, 3, 4, 5], 540, 1080))
    schedules.push(...weekdaySchedule(yuki.id, [1, 2, 3, 4, 5], 600, 1080))
    schedules.push(...weekdaySchedule(sam.id, [1, 3, 5], 600, 840))
    schedules.push(...weekdaySchedule(priya.id, [1, 2, 3, 4, 5], 570, 1050))
    schedules.push(...weekdaySchedule(marco.id, [3], 720, 780, 'focus'))
    schedules.push(...weekdaySchedule(yuki.id, [2, 4], 900, 960, 'limited'))

    for (const s of schedules) {
      await client.query(
        `INSERT INTO recurring_schedules (user_id, day_of_week, start_minute, end_minute, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [s.user_id, s.day_of_week, s.start_minute, s.end_minute, s.status],
      )
    }

    const timeBlocks = [
      {
        user_id: ana.id,
        starts_at: utcFromLocal(ana.timezone, 1, 14, 0),
        ends_at: utcFromLocal(ana.timezone, 1, 16, 0),
        status: 'blocked',
        title: 'Reunión externa',
      },
      {
        user_id: marco.id,
        starts_at: utcFromLocal(marco.timezone, 0, 10, 0),
        ends_at: utcFromLocal(marco.timezone, 0, 12, 0),
        status: 'focus',
        title: 'Sprint planning',
      },
      {
        user_id: sam.id,
        starts_at: utcFromLocal(sam.timezone, 2, 11, 0),
        ends_at: utcFromLocal(sam.timezone, 2, 13, 0),
        status: 'available',
        title: 'Ventana extra',
      },
    ]

    for (const b of timeBlocks) {
      await client.query(
        `INSERT INTO time_blocks (user_id, starts_at, ends_at, status, title)
         VALUES ($1, $2, $3, $4, $5)`,
        [b.user_id, b.starts_at, b.ends_at, b.status, b.title],
      )
    }

    const slot1Start = utcFromLocal('UTC', 1, 15, 0)
    const slot1End = utcFromLocal('UTC', 1, 16, 0)
    const slot2Start = utcFromLocal('UTC', 3, 14, 0)
    const slot2End = utcFromLocal('UTC', 3, 15, 30)

    const slot1 = await client.query(
      `INSERT INTO collab_slots (team_id, created_by, starts_at, ends_at, title, capacity)
       VALUES ($1, $2, $3, $4, $5, 0) RETURNING id`,
      [teamId, ana.id, slot1Start, slot1End, 'Sync semanal del equipo'],
    )
    const slot2 = await client.query(
      `INSERT INTO collab_slots (team_id, created_by, starts_at, ends_at, title, capacity)
       VALUES ($1, $2, $3, $4, $5, 3) RETURNING id`,
      [teamId, marco.id, slot2Start, slot2End, 'Pairing frontend', 3],
    )

    const slot1Id = slot1.rows[0].id
    const slot2Id = slot2.rows[0].id

    for (const uid of [ana.id, marco.id, yuki.id]) {
      await client.query(
        `INSERT INTO collab_slot_claims (slot_id, user_id) VALUES ($1, $2)`,
        [slot1Id, uid],
      )
    }
    await client.query(
      `INSERT INTO collab_slot_claims (slot_id, user_id) VALUES ($1, $2)`,
      [slot2Id, marco.id],
    )
    await client.query(
      `INSERT INTO collab_slot_claims (slot_id, user_id) VALUES ($1, $2)`,
      [slot2Id, sam.id],
    )

    const notifications = [
      {
        user_id: ana.id,
        type: 'member_joined',
        payload: { member: priya.displayName },
      },
      {
        user_id: ana.id,
        type: 'slot_created',
        payload: { creator: marco.displayName, title: 'Pairing frontend' },
      },
      {
        user_id: marco.id,
        type: 'slot_claimed',
        payload: { claimer: sam.displayName, title: 'Pairing frontend' },
      },
      {
        user_id: yuki.id,
        type: 'slot_created',
        payload: { creator: ana.displayName, title: 'Sync semanal del equipo' },
      },
    ]

    for (const n of notifications) {
      await client.query(
        `INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3::jsonb)`,
        [n.user_id, n.type, JSON.stringify(n.payload)],
      )
    }

    console.log('')
    console.log('✅ Base de datos sembrada con datos simulados')
    console.log('')
    console.log('  Equipo:  Equipo Mallanet Demo')
    console.log(`  Código:  ${TEAM_INVITE}`)
    console.log(`  Miembros: ${seedUsers.length}`)
    console.log('')
    console.log('  Cuentas de prueba (contraseña para todas: demo1234):')
    for (const u of seedUsers) {
      console.log(`    · ${u.email}  (${u.displayName}, ${u.timezone})`)
    }
    console.log('')
    console.log('  Sugerencia: iniciá sesión como ana@demo.mallanet.org')
    console.log('')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message || err.cause : String(err)
  console.error('❌ Error al sembrar:', msg || 'error desconocido')
  if (err instanceof Error && 'code' in err) {
    console.error(`   (${(err as NodeJS.ErrnoException).code})`)
  }
  process.exit(1)
})
