import { expect, type Page } from '@playwright/test'

/** Thursday of the week Mon Sep 21 - Sun Sep 27, 2026, at noon Pacific. */
export const FIXED_NOW = new Date('2026-09-24T12:00:00-07:00')
export const HOUR_HEIGHT = 60

/** Opens the app with a controllable clock and enters guest mode. */
export async function startGuestSession(page: Page) {
  await page.clock.install({ time: FIXED_NOW })
  await page.goto('/')
  await page.getByRole('button', { name: /try as a guest/i }).click()
  await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible()
}

export async function goTo(page: Page, view: 'Events' | 'Focus' | 'Stats') {
  await page.getByRole('button', { name: view, exact: true }).click()
  await expect(page.getByRole('heading', { name: view === 'Stats' ? 'Study Statistics' : view })).toBeVisible()
}

/** Scrolls the week grid so the given hour is at the top of the viewport. */
export async function scrollGridToHour(page: Page, hour: number) {
  await page
    .locator('[data-day]')
    .first()
    .evaluate((column, top) => {
      let el: Element | null = column
      while (el && el.scrollHeight <= el.clientHeight) el = el.parentElement
      if (el) el.scrollTop = top
    }, hour * HOUR_HEIGHT)
}

/** Viewport coordinates of a time on a given day column (yyyy-MM-dd). */
export async function pointAt(page: Page, day: string, hour: number) {
  const box = await page.locator(`[data-day="${day}"]`).boundingBox()
  if (!box) throw new Error(`Day column ${day} not rendered`)
  return { x: box.x + box.width / 2, y: box.y + hour * HOUR_HEIGHT }
}
