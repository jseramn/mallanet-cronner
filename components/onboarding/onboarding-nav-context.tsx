'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type OnboardingNavContextValue = {
  activeStepHint: string | undefined
  setActiveStepHint: (href: string | undefined) => void
}

const OnboardingNavContext = createContext<OnboardingNavContextValue | null>(null)

export function OnboardingNavProvider({ children }: { children: React.ReactNode }) {
  const [activeStepHint, setActiveStepHintState] = useState<string | undefined>()
  const setActiveStepHint = useCallback((href: string | undefined) => {
    setActiveStepHintState(href)
  }, [])
  const value = useMemo(
    () => ({ activeStepHint, setActiveStepHint }),
    [activeStepHint, setActiveStepHint],
  )
  return <OnboardingNavContext.Provider value={value}>{children}</OnboardingNavContext.Provider>
}

export function useOnboardingNavHint() {
  return useContext(OnboardingNavContext)
}
