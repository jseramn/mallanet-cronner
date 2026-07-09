import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Iniciar sesión — Mallanet Cronner' }

export default async function LoginPage() {
  const user = await getSessionUser()
  if (user) redirect('/dashboard')
  return <LoginForm />
}
