import { test, expect, type Page } from '@playwright/test'
import { goTo, startGuestSession } from './helpers'

async function addSubjectWithSubsections(page: Page, name: string, subsections: string[]) {
  await page.getByRole('button', { name: 'Add subject' }).click()
  await page.getByPlaceholder('Subject name').fill(name)
  await page.getByPlaceholder('Subject name').press('Enter')

  await page.getByTitle('Edit').click()
  for (const sub of subsections) {
    await page.getByPlaceholder('Add subsection').fill(sub)
    await page.getByPlaceholder('Add subsection').press('Enter')
  }
  await page.getByRole('button', { name: 'Save' }).click()
}

const recentSessions = (page: Page) => page.locator('.glass-panel', { hasText: 'Recent Sessions' })

test.beforeEach(async ({ page }) => {
  await startGuestSession(page)
  await goTo(page, 'Focus')
  await addSubjectWithSubsections(page, 'EE 370', ['Lab', 'HW'])
  await page.getByTitle('Drag to reorder, click to select').click()
})

test('a timed session is logged under the chosen subsection', async ({ page }) => {
  await page.getByRole('button', { name: 'Lab', exact: true }).click()
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByText('EE 370 · Lab')).toBeVisible()

  await page.clock.runFor(5 * 60 * 1000)
  await page.getByRole('button', { name: 'Finish' }).click()

  // Regression: guest-mode timer sessions used to vanish from the shared cache.
  await expect(recentSessions(page)).toContainText('EE 370 · Lab')
  await expect(recentSessions(page)).toContainText('5m')

  await goTo(page, 'Stats')
  const breakdown = page.locator('.glass-panel', { hasText: 'Study Breakdown' })
  await expect(breakdown).toContainText('EE 370')
  await expect(breakdown).toContainText('Lab')
})

test('a manual session defaults to the selected subsection', async ({ page }) => {
  await page.getByRole('button', { name: 'HW', exact: true }).click()
  await page.getByRole('button', { name: 'Add session' }).click()
  await page.getByRole('button', { name: 'Add Session' }).click()

  await expect(recentSessions(page)).toContainText('EE 370 · HW')
  await expect(recentSessions(page)).toContainText('60m')
})

test('pomodoro settings accept typed values', async ({ page }) => {
  await page.getByRole('button', { name: 'Pomodoro' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  const focusMinutes = page.getByRole('textbox').first()
  await expect(focusMinutes).toHaveValue('25')

  await focusMinutes.fill('40')
  await focusMinutes.press('Enter') // commits on blur
  await expect(focusMinutes).toHaveValue('40')

  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByText('40:00')).toBeVisible()
})

test('the complaint form is hidden for guests', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'File a complaint' })).toHaveCount(0)
})
