'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScheduleEditor } from '@/components/profile/schedule-editor'
import { TeamSetup } from '@/components/team/team-setup'
import { OrientationStep } from '@/components/onboarding/orientation-step'
import { useOnboardingNavHint } from '@/components/onboarding/onboarding-nav-context'
import { completeOnboarding } from '@/lib/actions/onboarding'
import { Button } from '@/components/ui/button'
import type { RecurringSchedule } from '@/lib/types'

const STEPS = [
  { id: 1, title: 'Horario semanal', hint: '/profile' },
  { id: 2, title: 'Equipo', hint: '/team' },
  { id: 3, title: 'Orientación', hint: '/dashboard' },
] as const

function initialStep(hasSchedule: boolean, hasTeam: boolean): 1 | 2 | 3 {
  if (hasSchedule && hasTeam) return 3
  if (hasSchedule) return 2
  return 1
}

export function OnboardingWizard({
  timezone,
  initialSchedule,
  hasSchedule: initialHasSchedule,
  hasTeam: initialHasTeam,
  inviteCode = '',
}: {
  timezone: string
  initialSchedule: RecurringSchedule[]
  hasSchedule: boolean
  hasTeam: boolean
  inviteCode?: string
}) {
  const router = useRouter()
  const onboardingNav = useOnboardingNavHint()
  const setActiveStepHint = onboardingNav?.setActiveStepHint
  const [step, setStep] = useState<1 | 2 | 3>(() => initialStep(initialHasSchedule, initialHasTeam))
  const [hasSchedule, setHasSchedule] = useState(initialHasSchedule)
  const [hasTeam, setHasTeam] = useState(initialHasTeam)
  const [continueError, setContinueError] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [finishError, setFinishError] = useState<string | null>(null)

  useEffect(() => {
    const hint = STEPS.find((s) => s.id === step)?.hint
    setActiveStepHint?.(hint)
    return () => setActiveStepHint?.(undefined)
  }, [step, setActiveStepHint])

  function goTo(next: 1 | 2 | 3) {
    setContinueError(null)
    setStep(next)
  }

  function handleScheduleSaved(slotCount: number) {
    setHasSchedule(slotCount > 0)
    setContinueError(null)
  }

  function handleContinueFromSchedule() {
    if (!hasSchedule) {
      setContinueError('Pinta al menos una franja y pulsa Guardar horario antes de continuar.')
      return
    }
    goTo(2)
  }

  function handleTeamSuccess() {
    setHasTeam(true)
    goTo(3)
    router.refresh()
  }

  async function handleFinish() {
    setFinishing(true)
    setFinishError(null)
    const res = await completeOnboarding()
    setFinishing(false)
    if (res?.error) {
      setFinishError(res.error)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 max-w-4xl">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Paso {step} de {STEPS.length}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Configura tu Cronner</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            En tres pasos quedas listo para coordinarte con el equipo. La barra lateral muestra dónde
            vivirás cada función.
          </p>
        </div>

        <ol className="flex flex-wrap gap-2" aria-label="Progreso del onboarding">
          {STEPS.map((s) => {
            const done =
              s.id < step ||
              (s.id === 1 && hasSchedule && step > 1) ||
              (s.id === 2 && hasTeam && step > 2)
            const current = s.id === step
            return (
              <li
                key={s.id}
                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs ${
                  current
                    ? 'border-primary/40 bg-primary/5 text-foreground'
                    : done
                      ? 'border-border text-muted-foreground'
                      : 'border-border/60 text-muted-foreground/80'
                }`}
              >
                <span
                  className={`flex size-5 items-center justify-center rounded-full text-[10px] font-mono ${
                    current ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  {s.id}
                </span>
                {s.title}
              </li>
            )
          })}
        </ol>
      </header>

      {step === 1 && (
        <section aria-labelledby="onboarding-schedule" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="onboarding-schedule" className="text-lg font-medium">
              Horario semanal
            </h2>
            <p className="text-sm text-muted-foreground text-pretty">
              Pinta tus franjas en tu hora local ({timezone}). Sin horario, en el Timeline aparecerás
              como «sin horario». Selecciona un estado, arrastra sobre el grid y guarda.
            </p>
          </div>
          <ScheduleEditor initial={initialSchedule} onSaved={handleScheduleSaved} />
          {continueError && (
            <p role="alert" className="text-sm text-destructive">
              {continueError}
            </p>
          )}
          <Button onClick={handleContinueFromSchedule} disabled={!hasSchedule} className="self-start">
            Continuar
          </Button>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="onboarding-team" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="onboarding-team" className="text-lg font-medium">
              Tu equipo
            </h2>
            <p className="text-sm text-muted-foreground text-pretty">
              Crea un equipo y comparte el código, o únete con una invitación. Timeline, Galaxia y Slots
              necesitan un equipo.
            </p>
          </div>
          {hasTeam ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">Ya perteneces a un equipo.</p>
              <Button onClick={() => goTo(3)} className="self-start">
                Continuar
              </Button>
            </div>
          ) : (
            <TeamSetup initialCode={inviteCode} onSuccess={handleTeamSuccess} />
          )}
        </section>
      )}

      {step === 3 && (
        <OrientationStep onFinish={handleFinish} loading={finishing} error={finishError} />
      )}
    </div>
  )
}
