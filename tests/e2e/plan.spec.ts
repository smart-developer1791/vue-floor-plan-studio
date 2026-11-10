import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { sample } from '../../src/domain/plan.ts'
const key = 'vue-floor-plan-studio:v1'

test('keyboard moves, collision checks, rotation, and locking preserve valid positions', async ({
  page,
}) => {
  await page.goto('/')
  const desk = page.locator('[data-piece="desk-1"]')
  await desk.focus()
  await page.keyboard.press('ArrowRight')
  await expect(desk).toHaveAttribute('aria-label', /75 by 50/)
  await page.getByLabel('X (cells)', { exact: true }).fill('16')
  await page.getByLabel('Y (cells)', { exact: true }).fill('3')
  await page.getByRole('button', { name: 'Apply furniture', exact: true }).click()
  await expect(page.locator('[data-ui="status"]')).toContainText('overlaps')
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).items[0].x, key)).toBe(
    3,
  )
  await page.getByRole('button', { name: 'Rotate', exact: true }).click()
  await expect(page.getByLabel('Width (cells)', { exact: true }).last()).toHaveValue('3')
  await expect(page.getByLabel('Depth (cells)', { exact: true }).last()).toHaveValue('6')
  await page.getByLabel('Lock position and size', { exact: true }).check()
  await page.getByRole('button', { name: 'Apply furniture', exact: true }).click()
  await desk.focus()
  await page.keyboard.press('ArrowRight')
  await expect(desk).toHaveAttribute('aria-label', /75 by 50 centimeters, locked/)
  await expect(page.getByRole('button', { name: 'Rotate', exact: true })).toBeDisabled()
})

test('directive dragging commits snapped coordinates and Escape cancels the next drag', async ({
  page,
}) => {
  await page.goto('/')
  const room = await page.locator('[data-ui="room"]').boundingBox()
  const desk = page.locator('[data-piece="desk-1"]')
  const box = await desk.boundingBox()
  const step = (room!.width - 4) / 24
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + step * 2, box!.y + box!.height / 2 + step * 2, {
    steps: 8,
  })
  await page.mouse.up()
  await expect(desk).toHaveAttribute('aria-label', /100 by 100/)
  const moved = await desk.boundingBox()
  await page.mouse.move(moved!.x + moved!.width / 2, moved!.y + moved!.height / 2)
  await page.mouse.down()
  await page.mouse.move(moved!.x + moved!.width / 2 + step * 2, moved!.y + moved!.height / 2, {
    steps: 8,
  })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(desk).toHaveAttribute('aria-label', /100 by 100/)
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).items[0].x, key)).toBe(
    4,
  )
})

test('adding and confirmed removal update the room; SVG download is valid standalone XML', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add furniture', exact: true }).click()
  await expect(page.locator('[data-piece]')).toHaveCount(6)
  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.locator('[data-piece]')).toHaveCount(6)
  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await page.getByRole('button', { name: 'Remove furniture', exact: true }).click()
  await expect(page.locator('[data-piece]')).toHaveCount(5)
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export SVG', exact: true }).click()
  const download = await pending
  const svg = await readFile((await download.path())!, 'utf8')
  const parsed = await page.evaluate((svg) => {
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
    return {
      errors: document.querySelectorAll('parsererror').length,
      scripts: document.querySelectorAll('script').length,
      title: document.querySelector('title')?.textContent,
      metadata: document.querySelector('metadata')?.textContent,
    }
  }, svg)
  expect(parsed.errors).toBe(0)
  expect(parsed.scripts).toBe(0)
  expect(parsed.title).toBe('A small creative studio')
  expect(JSON.parse(parsed.metadata!).marker + '.svg').toBe(download.suggestedFilename())
})

test('room shrink failures and selection changes preserve the canvas frame', async ({ page }) => {
  await page.goto('/')
  const frame = page.locator('[data-ui="canvas-frame"]')
  const before = await frame.boundingBox()
  await page
    .getByRole('combobox', { name: 'Selected furniture', exact: true })
    .selectOption('sofa-1')
  expect(await frame.boundingBox()).toEqual(before)
  await page.getByLabel('Width (cells)', { exact: true }).first().fill('12')
  await page.getByRole('button', { name: 'Apply room', exact: true }).click()
  await expect(page.locator('[data-ui="status"]')).toContainText('inside the room')
  await expect(page.getByText('600 × 450 cm · Top view', { exact: true })).toBeVisible()
  expect(await frame.boundingBox()).toEqual(before)
})

test('maximum-length SVG labels fit the room and furniture footprints', async ({ page }) => {
  await page.goto('/')
  const plan = structuredClone(sample)
  plan.name = 'W'.repeat(80)
  plan.items[3]!.label = 'W'.repeat(45)
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await page.getByLabel('Workspace JSON', { exact: true }).fill(JSON.stringify(plan))
  await page.getByRole('button', { name: 'Import workspace', exact: true }).click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export SVG', exact: true }).click()
  const svg = await readFile((await (await pending).path())!, 'utf8')
  const result = await page.evaluate((svg) => {
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const host = document.createElement('div')
    Object.assign(host.style, { position: 'fixed', width: '0', height: '0', overflow: 'hidden' })
    const root = document.importNode(parsed.documentElement, true) as unknown as SVGSVGElement
    host.append(root)
    document.body.append(host)
    const header = root.querySelector<SVGTextElement>(':scope > text')!.getBBox()
    const pieces = [...root.querySelectorAll<SVGGElement>('g > g')].map((group) => {
      const shape = group.querySelector('rect')!.getBBox(),
        label = group.querySelector('text')!.getBBox()
      return label.x >= shape.x && label.x + label.width <= shape.x + shape.width
    })
    const fits = header.x >= 0 && header.x + header.width <= root.viewBox.baseVal.width
    host.remove()
    return { fits, pieces }
  }, svg)
  expect(result.fits).toBe(true)
  expect(result.pieces).toEqual([true, true, true, true, true])
})
