import { expect, test } from '@playwright/test'

test.describe('auth + seed smoke', () => {
  test('login with seed account reaches timeline', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder(/tu@equipo/i).fill('ana@demo.mallanet.org')
    await page.getByPlaceholder('********').fill('demo1234')
    await page.getByRole('button', { name: /^Entrar$/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: /Timeline Unificado/i })).toBeVisible({
      timeout: 15_000,
    })
  })
})
