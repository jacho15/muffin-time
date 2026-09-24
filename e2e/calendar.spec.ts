import { test, expect, type Page } from '@playwright/test'
import { pointAt, scrollGridToHour, startGuestSession } from './helpers'

const MON = '2026-09-21'
const TUE = '2026-09-22'
const WED = '2026-09-23'
const FRI = '2026-09-25'

async function createCalendar(page: Page, name: string) {
  await page.getByRole('button', { name: 'Add calendar' }).click()
  await page.getByPlaceholder('Calendar name').fill(name)
  await page.getByRole('button', { name: 'Create Calendar' }).click()
  await expect(page.getByRole('button', { name })).toBeVisible()
}

/** Drags across a day column to open the new-event modal, then saves it. */
async function createEventByDrag(page: Page, day: string, fromHour: number, toHour: number, title: string) {
  const from = await pointAt(page, day, fromHour)
  const to = await pointAt(page, day, toHour)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 5 })
  await page.mouse.up()
  await page.getByPlaceholder('Event title').fill(title)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
}

const eventsOn = (page: Page, day: string) => page.locator(`[data-day="${day}"] [data-event]`)

test.beforeEach(async ({ page }) => {
  await startGuestSession(page)
  await createCalendar(page, 'Classes')
  await scrollGridToHour(page, 15)
})

test('a new calendar is visible by default', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Classes' }).locator('svg.lucide-eye')).toBeVisible()
})

test('an evening event stays on its local day', async ({ page }) => {
  // 6-8 PM Pacific is already the next day in UTC.
  await createEventByDrag(page, MON, 18.25, 19.75, 'EE 444 Lecture')

  await expect(eventsOn(page, MON)).toHaveCount(1)
  await expect(eventsOn(page, MON)).toContainText('6:00 PM - 8:00 PM')
  await expect(eventsOn(page, TUE)).toHaveCount(0)
})

test('Ctrl+C / Ctrl+V copies an event to the slot under the cursor', async ({ page }) => {
  await createEventByDrag(page, MON, 18.25, 19.75, 'EE 444 Lecture')

  await eventsOn(page, MON).hover()
  await page.keyboard.press('Control+c')
  const target = await pointAt(page, WED, 19.1) // snaps down to 7:00 PM
  await page.mouse.move(target.x, target.y)
  await page.keyboard.press('Control+v')

  await expect(eventsOn(page, WED)).toContainText('EE 444 Lecture')
  await expect(eventsOn(page, WED)).toContainText('7:00 PM - 9:00 PM')
  await expect(eventsOn(page, MON)).toHaveCount(1) // the original is untouched
})

test('shortcuts are ignored while typing in a form', async ({ page }) => {
  await createEventByDrag(page, MON, 18.25, 19.75, 'EE 444 Lecture')
  await eventsOn(page, MON).hover()
  await page.keyboard.press('Control+c')

  await page.getByRole('button', { name: 'Add calendar' }).click()
  await page.getByPlaceholder('Calendar name').press('Control+v')

  await expect(page.locator('[data-event]')).toHaveCount(1)
})

test('dragging an event moves it to another day', async ({ page }) => {
  await createEventByDrag(page, MON, 18.25, 19.75, 'EE 444 Lecture')

  const box = await eventsOn(page, MON).boundingBox()
  if (!box) throw new Error('event not rendered')
  const target = await pointAt(page, FRI, 18.5)
  await page.mouse.move(box.x + box.width / 2, box.y + 30)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps: 10 })
  await page.mouse.up()

  await expect(eventsOn(page, FRI)).toContainText('6:00 PM - 8:00 PM')
  await expect(eventsOn(page, MON)).toHaveCount(0)
})
