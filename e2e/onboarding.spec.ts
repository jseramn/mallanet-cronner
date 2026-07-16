import { expect, test } from '@playwright/test'

test.describe('onboarding gate', () => {
  test('new signup lands on onboarding wizard', async ({ page }) => {
    const email = `e2e-${Date.now()}@demo.mallanet.org`
    await page.goto('/signup')
    await page.getByPlaceholder(/Juliana/i).fill('E2E User')
    await page.getByPlaceholder(/tu@equipo/i).fill(email)
    await page.getByPlaceholder('********').fill('password1')
    await page.getByRole('button', { name: /Crear cuenta/i }).click()
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 20_000 })
    await expect(page.getByText(/Paso 1 de 3/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: /Horario semanal/i })).toBeVisible()

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/onboarding/)
  })
})
