import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { SignupForm } from '@/components/auth/signup-form'

export const metadata: Metadata = { title: 'Crear cuenta — Mallanet Cronner' }

export default async function SignupPage() {
  const user = await getSessionUser()
  if (user) redirect('/dashboard')
  return <SignupForm />
}
