import { clone, escapeXml, stamp } from '../services/files.ts'
import { boolean, choice, integer, jsonText, list, record, text, unique } from './validation.ts'

export const kinds = ['desk', 'sofa', 'table', 'shelf', 'plant'] as const
export const tones = ['clay', 'moss', 'slate'] as const
export type Kind = (typeof kinds)[number]
export type Tone = (typeof tones)[number]
export interface Furniture {
  id: string
  label: string
  kind: Kind
  tone: Tone
  x: number
  y: number
  width: number
  height: number
  locked: boolean
}
export interface Plan {
  version: 1
  name: string
  width: number
  height: number
  items: Furniture[]
}
export const palettes: Record<Tone, { fill: string; ink: string }> = {
  clay: { fill: '#ecd2bc', ink: '#864c35' },
  moss: { fill: '#d7e3c7', ink: '#4d633b' },
  slate: { fill: '#d4dfe8', ink: '#415b70' },
}

export const sample: Plan = {
  version: 1,
  name: 'A small creative studio',
  width: 24,
  height: 18,
  items: [
    {
      id: 'desk-1',
      label: 'Window desk',
      kind: 'desk',
      tone: 'clay',
      x: 2,
      y: 2,
      width: 6,
      height: 3,
      locked: false,
    },
    {
      id: 'sofa-1',
      label: 'Reading sofa',
      kind: 'sofa',
      tone: 'moss',
      x: 15,
      y: 3,
      width: 7,
      height: 4,
      locked: false,
    },
    {
      id: 'table-1',
      label: 'Project table',
      kind: 'table',
      tone: 'slate',
      x: 9,
      y: 9,
      width: 6,
      height: 4,
      locked: false,
    },
    {
      id: 'shelf-1',
      label: 'Materials shelf',
      kind: 'shelf',
      tone: 'clay',
      x: 2,
      y: 12,
      width: 2,
      height: 5,
      locked: true,
    },
    {
      id: 'plant-1',
      label: 'Corner plant',
      kind: 'plant',
      tone: 'moss',
      x: 20,
      y: 14,
      width: 2,
      height: 2,
      locked: false,
    },
  ],
}

export function overlaps(a: Furniture, b: Furniture) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

export function placementError(plan: Plan, item: Furniture) {
  if (
    item.x < 0 ||
    item.y < 0 ||
    item.x + item.width > plan.width ||
    item.y + item.height > plan.height
  )
    return 'Keep every piece inside the room.'
  const neighbor = plan.items.find((other) => other.id !== item.id && overlaps(item, other))
  return neighbor ? `${item.label} overlaps ${neighbor.label}.` : ''
}

export function parsePlan(value: unknown): Plan {
  const raw = record(value, 'Workspace')
  if (raw.version !== 1) throw new Error('Unsupported workspace version.')
  const items = list(raw.items, 'Furniture', 30).map((value, index): Furniture => {
    const item = record(value, `Furniture ${index + 1}`)
    const id = text(item.id, 'Furniture ID', 40)
    if (!/^[a-zA-Z0-9_-]+$/.test(id))
      throw new Error('Furniture IDs may contain letters, numbers, hyphens, and underscores.')
    return {
      id,
      label: text(item.label, 'Furniture label', 45),
      kind: choice(item.kind, 'Furniture kind', kinds),
      tone: choice(item.tone, 'Furniture tone', tones),
      x: integer(item.x, 'X position', 0, 39),
      y: integer(item.y, 'Y position', 0, 39),
      width: integer(item.width, 'Furniture width', 1, 12),
      height: integer(item.height, 'Furniture depth', 1, 12),
      locked: boolean(item.locked, 'Locked'),
    }
  })
  unique(
    items.map((item) => item.id),
    'Furniture IDs',
  )
  const plan: Plan = {
    version: 1,
    name: text(raw.name, 'Room name', 80),
    width: integer(raw.width, 'Room width', 12, 40),
    height: integer(raw.height, 'Room depth', 12, 40),
    items,
  }
  for (const item of items) {
    const error = placementError(plan, item)
    if (error) throw new Error(error)
  }
  return plan
}

export function importPlan(source: string) {
  return parsePlan(jsonText(source))
}
export function planMarker(plan: Plan) {
  return stamp('FP', parsePlan(plan))
}
export function exportPlan(plan: Plan) {
  const valid = parsePlan(plan)
  return JSON.stringify(
    {
      ...valid,
      provenance: {
        project: 'vue-floor-plan-studio',
        author: 'CodeSculptor',
        marker: planMarker(valid),
      },
    },
    null,
    2,
  )
}

export function changeItem(plan: Plan, id: string, changes: Partial<Omit<Furniture, 'id'>>): Plan {
  const next = clone(plan)
  const item = next.items.find((item) => item.id === id)
  if (!item) throw new Error('That piece no longer exists.')
  Object.assign(item, changes)
  return parsePlan(next)
}

export function addItem(plan: Plan, kind: Kind): Plan {
  if (plan.items.length >= 30) throw new Error('The room can hold at most 30 pieces.')
  const sizes: Record<Kind, [number, number]> = {
    desk: [6, 3],
    sofa: [7, 4],
    table: [5, 4],
    shelf: [2, 5],
    plant: [2, 2],
  }
  const [width, height] = sizes[kind]
  let serial = 1
  while (plan.items.some((item) => item.id === `${kind}-${serial}`)) serial++
  const item: Furniture = {
    id: `${kind}-${serial}`,
    label: `New ${kind}`,
    kind,
    tone: kind === 'plant' ? 'moss' : 'clay',
    x: 0,
    y: 0,
    width,
    height,
    locked: false,
  }
  for (let y = 0; y <= plan.height - height; y++) {
    for (let x = 0; x <= plan.width - width; x++) {
      item.x = x
      item.y = y
      if (!placementError(plan, item)) return parsePlan({ ...plan, items: [...plan.items, item] })
    }
  }
  throw new Error('No free area fits that piece. Move or remove furniture first.')
}

export function exportSvg(plan: Plan) {
  const valid = parsePlan(plan)
  const unit = 32
  const width = valid.width * unit
  const height = valid.height * unit
  const textWidth = (value: string, size: number, available: number) =>
    Math.min(available, value.length * size * 0.55)
  const pieces = valid.items
    .map((item) => {
      const colors = palettes[item.tone]
      const w = item.width * unit,
        h = item.height * unit
      const fontSize = Math.min(15, Math.max(8, w / (item.label.length * 0.62)))
      return `<g transform="translate(${item.x * unit} ${item.y * unit})"><rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="${item.kind === 'plant' ? Math.min(w, h) / 2 : 10}" fill="${colors.fill}" stroke="${colors.ink}" stroke-width="2"/><text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="${fontSize}" textLength="${textWidth(item.label, fontSize, w - 12)}" lengthAdjust="spacingAndGlyphs" fill="${colors.ink}">${escapeXml(item.label)}</text></g>`
    })
    .join('')
  const footer = `${valid.width * 25} × ${valid.height * 25} cm · 25 cm grid · ${planMarker(valid)} · CodeSculptor`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width + 64}" height="${height + 136}" viewBox="0 0 ${width + 64} ${height + 136}" role="img" aria-labelledby="title description"><title id="title">${escapeXml(valid.name)}</title><desc id="description">${valid.width * 25} by ${valid.height * 25} cm room. One grid cell is 25 cm. ${valid.items.length} pieces of furniture.</desc><metadata>${escapeXml(JSON.stringify({ project: 'vue-floor-plan-studio', author: 'CodeSculptor', marker: planMarker(valid) }))}</metadata><defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#d7cabb" stroke-width=".7"/></pattern></defs><rect width="100%" height="100%" fill="#f7f2e9"/><text x="32" y="38" font-family="sans-serif" font-size="22" font-weight="700" textLength="${textWidth(valid.name, 22, width)}" lengthAdjust="spacingAndGlyphs" fill="#413a32">${escapeXml(valid.name)}</text><g transform="translate(32 64)"><rect width="${width}" height="${height}" fill="url(#grid)" stroke="#887666" stroke-width="2"/>${pieces}</g><text x="32" y="${height + 103}" font-family="monospace" font-size="12" textLength="${textWidth(footer, 12, width)}" lengthAdjust="spacingAndGlyphs" fill="#736658">${footer}</text></svg>`
}
