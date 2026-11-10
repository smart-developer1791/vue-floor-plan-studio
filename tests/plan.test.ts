import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  addItem,
  changeItem,
  exportPlan,
  exportSvg,
  importPlan,
  overlaps,
  parsePlan,
  planMarker,
  sample,
} from '../src/domain/plan.ts'
import { clone } from '../src/services/files.ts'

test('bundled sample, canonical export, and provenance round-trip', () => {
  const bundled = readFileSync(new URL('../public/sample-workspace.json', import.meta.url), 'utf8')
  assert.deepEqual(importPlan(bundled), sample)
  assert.deepEqual(importPlan(exportPlan(sample)), sample)
  const exported = JSON.parse(exportPlan(sample))
  assert.equal(exported.provenance.marker, planMarker(sample))
  assert.match(exported.provenance.marker, /^FP-[A-F0-9]{8}$/)
  assert.equal(exportPlan(sample), exportPlan(parsePlan({ ...sample, unexpected: true })))
})

test('touching edges are allowed; overlaps and out-of-room moves preserve the source', () => {
  const original = clone(sample)
  const a = sample.items[0]!
  assert.equal(overlaps(a, { ...a, id: 'adjacent', x: a.x + a.width }), false)
  assert.throws(() => changeItem(sample, a.id, { x: 16, y: 3 }), /overlaps/)
  assert.throws(() => changeItem(sample, a.id, { x: 23 }), /inside the room/)
  assert.deepEqual(sample, original)
  assert.equal(changeItem(sample, a.id, { x: 3 }).items[0]!.x, 3)
})

test('placement searches free cells and reports a genuinely full room', () => {
  const next = addItem(sample, 'plant')
  assert.equal(next.items.length, sample.items.length + 1)
  assert.equal(next.items.at(-1)!.id, 'plant-2')
  const full = parsePlan({
    ...sample,
    width: 12,
    height: 12,
    items: [{ ...sample.items[0], x: 0, y: 0, width: 12, height: 12 }],
  })
  assert.throws(() => addItem(full, 'desk'), /No free area/)
})

test('rejects coerced enum arrays, bad primitive types, duplicates, and excessive collections', () => {
  for (const field of ['kind', 'tone'] as const) {
    for (const bad of [[sample.items[0]![field]], {}, null, true, 1]) {
      const next = clone(sample) as unknown as { items: Record<string, unknown>[] }
      next.items[0]![field] = bad
      assert.throws(() => parsePlan(next))
    }
  }
  assert.throws(() => parsePlan({ ...sample, width: '24' }))
  assert.throws(() => changeItem(sample, 'desk-1', { x: 0.5 }))
  assert.throws(() => parsePlan({ ...sample, items: [...sample.items, sample.items[0]] }), /unique/)
  assert.throws(
    () => parsePlan({ ...sample, items: Array(31).fill(sample.items[0]) }),
    /at most 30/,
  )
  assert.throws(() => importPlan(' '.repeat(120001)), /120,000/)
})

test('SVG is standalone and escapes room names, furniture labels, and metadata', () => {
  const plan = clone(sample)
  plan.name = 'The <sun> & studio'
  plan.items[0]!.label = '</text><script>alert(1)</script>'
  const svg = exportSvg(plan)
  assert.match(svg, /xmlns="http:\/\/www.w3.org\/2000\/svg"/)
  assert.match(svg, /The &lt;sun&gt; &amp; studio/)
  assert.ok(!svg.includes('<script>'))
  assert.ok(svg.includes(planMarker(plan)))
  assert.ok(!svg.includes('href='))
})
