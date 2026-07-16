export type AvailabilityStatus = 'available' | 'limited' | 'blocked'

export interface Profile {
  user_id: string
  display_name: string
  timezone: string
  color: string
  work_mode: 'full-time' | 'part-time'
  onboarding_completed_at: string | null
}

export interface Team {
  id: string
  name: string
  invite_code: string
  created_by: string
}

export interface TeamMember extends Profile {
  role: 'owner' | 'member'
}

export interface RecurringSchedule {
  id: number
  user_id: string
  day_of_week: number // 0=domingo ... 6=sábado (en la TZ del usuario)
  start_minute: number
  end_minute: number
  status: AvailabilityStatus
}

export interface TimeBlock {
  id: number
  user_id: string
  starts_at: string // ISO UTC
  ends_at: string
  status: AvailabilityStatus
  title: string | null
  note: string | null
}

export interface CollabSlot {
  id: number
  team_id: string
  created_by: string
  starts_at: string
  ends_at: string
  title: string
  capacity: number
  claims: { user_id: string; display_name: string; color: string }[]
}

export interface Notification {
  id: number
  user_id: string
  type: string
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
}

export const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  available: 'Mallanet',
  limited: 'Ocupado',
  blocked: 'No disponible',
}

export const STATUS_COLORS: Record<AvailabilityStatus, string> = {
  available: 'var(--status-available)',
  limited: 'var(--status-limited)',
  blocked: 'var(--status-blocked)',
}
