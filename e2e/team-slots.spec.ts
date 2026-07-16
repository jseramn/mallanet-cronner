import { expect, test } from '@playwright/test'

test.describe('team + slots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder(/tu@equipo/i).fill('ana@demo.mallanet.org')
    await page.getByPlaceholder('********').fill('demo1234')
    await page.getByRole('button', { name: /^Entrar$/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('team page shows members for seed owner', async ({ page }) => {
    await page.goto('/team')
    await expect(page.getByText(/Equipo Mallanet Demo|miembro/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('slots page loads for team member', async ({ page }) => {
    await page.goto('/slots')
    await expect(
      page.getByText(/Slots|colaboración|No hay slots/i).first(),
    ).toBeVisible({ timeout: 15_000 })
  })
})
