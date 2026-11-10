import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const key = 'vue-floor-plan-studio:v1'
const fixture = JSON.parse(
  await readFile(new URL('../../public/sample-workspace.json', import.meta.url), 'utf8'),
)

async function importData(page: Page, value: unknown) {
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await page.getByLabel('Workspace JSON', { exact: true }).fill(JSON.stringify(value))
  await page.getByRole('button', { name: 'Import workspace', exact: true }).click()
}

test('valid import persists across reload and JSON download preserves provenance', async ({
  page,
}) => {
  await page.goto('/')
  const value = structuredClone(fixture)
  value.name = 'A freshly imported workspace'
  await importData(page, value)
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await expect(page.getByText(value.name, { exact: true })).toBeVisible()
  await expect
    .poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).name, key))
    .toBe(value.name)
  await page.reload()
  await expect(page.getByText(value.name, { exact: true })).toBeVisible()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'JSON', exact: true }).click()
  const download = await pending
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'))
  expect(exported.name).toBe(value.name)
  expect(exported.provenance.project).toBe('vue-floor-plan-studio')
  expect(exported.provenance.author).toBe('CodeSculptor')
  expect(exported.provenance.marker).toMatch(/^FP-[A-F0-9]{8}$/)
  expect(download.suggestedFilename()).toBe(`${exported.provenance.marker}.json`)
})

test('invalid import keeps the current workspace and Escape returns focus', async ({ page }) => {
  await page.goto('/')
  await importData(page, fixture)
  const before = await page.evaluate((key) => localStorage.getItem(key), key)
  await importData(page, { ...fixture, name: [fixture.name] })
  await expect(page.getByRole('alert')).toContainText('must be')
  await expect(page.locator('dialog[open]')).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(before)
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeFocused()
  await expect(page.getByText(fixture.name, { exact: true })).toBeVisible()
})

test('a queued native close event preserves a reopened dialog', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Import', exact: true })
  await trigger.click()
  await trigger.evaluate(async (element) => {
    const dialog = document.querySelector<HTMLDialogElement>('dialog[open]')!
    dialog.querySelector<HTMLButtonElement>('button[aria-label="Close dialog"]')!.click()
    await Promise.resolve()
    await Promise.resolve()
    if (dialog.open) throw new Error('Close button did not close the dialog')
    ;(element as HTMLButtonElement).click()
    await Promise.resolve()
    await Promise.resolve()
    if (!dialog.open) throw new Error('Trigger did not reopen the dialog')
  })
  await page.waitForTimeout(100)
  await expect(page.locator('dialog[open]')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('corrupt storage recovers to the sample without overwriting the invalid draft', async ({
  page,
}) => {
  await page.addInitScript((key) => localStorage.setItem(key, '{broken'), key)
  await page.goto('/')
  await expect(page.getByText('Draft unavailable; sample restored', { exact: true })).toBeVisible()
  await expect(page.getByText(fixture.name, { exact: true })).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe('{broken')
})

test('blocked storage keeps imports and downloads usable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException('Blocked', 'SecurityError')
    }
    Storage.prototype.setItem = () => {
      throw new DOMException('Blocked', 'SecurityError')
    }
  })
  await page.goto('/')
  await importData(page, { ...fixture, name: 'Work without storage' })
  await expect(
    page.getByText('Storage unavailable; export to keep your work', { exact: true }),
  ).toBeVisible()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'JSON', exact: true }).click()
  const download = await pending
  expect(JSON.parse(await readFile((await download.path())!, 'utf8')).name).toBe(
    'Work without storage',
  )
})

test('sample restoration requires confirmation and replaces the local draft', async ({ page }) => {
  await page.goto('/')
  await importData(page, { ...fixture, name: 'Keep this until confirmed' })
  await page.getByRole('button', { name: 'Restore sample', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByText('Keep this until confirmed', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Restore sample', exact: true }).click()
  await page
    .locator('dialog[open]')
    .getByRole('button', { name: 'Restore sample', exact: true })
    .click()
  await expect(page.getByText(fixture.name, { exact: true })).toBeVisible()
  await expect
    .poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).name, key))
    .toBe(fixture.name)
})

test('Tailwind layout, visible controls, and narrow screens remain usable', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  const workspace = page.locator('[data-ui="workspace"]')
  await expect(workspace).toHaveCSS('display', 'grid')
  expect(
    await workspace.evaluate((element) => {
      element.classList.remove('grid')
      const result = getComputedStyle(element).display
      element.classList.add('grid')
      return result
    }),
  ).toBe('block')
  for (const width of [320, 700, 900, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await expect(page.getByRole('main')).toHaveCount(1)
    for (const role of ['button', 'textbox', 'combobox', 'spinbutton', 'checkbox'] as const) {
      for (const control of await page.getByRole(role).all()) {
        if (await control.isVisible()) await expect(control).toHaveAccessibleName(/\S/)
      }
    }
  }
  expect(errors).toEqual([])
})
