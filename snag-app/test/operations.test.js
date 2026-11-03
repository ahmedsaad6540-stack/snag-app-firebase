import test from 'node:test'
import assert from 'node:assert/strict'
import { todayCairo, periodRange, isDue, buildReport, summarize, validateExecution, occurrenceId } from '../src/operations/model.js'
import { canUser } from '../src/constants/permissions.js'
import { readFileSync } from 'node:fs'

test('Cairo date rolls over while UTC is still yesterday', () => {
  assert.equal(todayCairo(new Date('2026-11-03T22:30:00Z')), '2026-11-04')
  assert.equal(todayCairo(new Date('2026-07-03T21:30:00Z')), '2026-07-04')
})
test('period boundaries span year end and leap February correctly', () => {
  assert.deepEqual(periodRange('2027-01-01', 'week'), ['2026-12-26', '2027-01-01'])
  assert.deepEqual(periodRange('2028-02-29', 'month'), ['2028-02-01', '2028-02-29'])
  assert.throws(() => periodRange('2026-02-30', 'day'))
})
test('recurrence crosses months and respects activation, retirement and review', () => {
  const p = { enabled: true, frequency: 'weekly', days: [2], start: '2026-11-03' }
  assert.equal(isDue(p, '2026-11-03'), true)
  assert.equal(isDue(p, '2026-12-01'), true)
  assert.equal(isDue(p, '2026-10-27'), false)
  assert.equal(isDue({ ...p, review: 'يتطلب مراجعة' }, '2026-11-03'), false)
  assert.equal(isDue({ ...p, end: '2026-11-30' }, '2026-12-01'), false)
  const monthly = { enabled: true, frequency: 'monthly', monthDays: [31] }
  assert.equal(isDue(monthly, '2026-11-31'), false)
  assert.equal(isDue(monthly, '2026-12-31'), true)
})
test('reports distinguish pending from blocked and exclude future and approved exceptions from denominator', () => {
  const plan = { id: 'p', enabled: true, frequency: 'daily', department: 'pest' }
  const records = { 'p__2026-11-01': { status: 'done' }, 'p__2026-11-02': { status: 'na' }, 'p__2026-11-03': { status: 'blocked' } }
  const rows = buildReport([plan], records, '2026-11-01', '2026-11-05', 'all', '2026-11-04')
  assert.deepEqual(summarize(rows), { planned: 5, future: 1, due: 4, required: 3, done: 1, partial: 0, blocked: 1, pending: 1, na: 1, percent: 33 })
  assert.equal(buildReport([plan], records, '2026-11-01', '2026-11-05', 'landscape').length, 0)
})
test('saved occurrence retains historical standard and late completion stays with its due date', () => {
  const plan = { id: 'p', enabled: true, frequency: 'daily', title: 'new' }
  const rows = buildReport([plan], { 'p__2026-11-03': { plan: { title: 'old' }, status: 'done', actualDate: '2026-11-04' } }, '2026-11-03', '2026-11-03', 'all', '2026-11-04')
  assert.equal(rows[0].title, 'old'); assert.equal(rows[0].date, '2026-11-03')
  assert.equal(occurrenceId('p', '2026-11-03'), 'p__2026-11-03')
})
test('execution requires accountable reason, corrective action and followup', () => {
  const valid = { status: 'done', owner: 'مشرف', actualDate: todayCairo(), quality: 'unreviewed', photos: [] }
  assert.doesNotThrow(() => validateExecution(valid))
  assert.throws(() => validateExecution({ ...valid, status: 'blocked' }))
  assert.throws(() => validateExecution({ ...valid, evidence: 'javascript:alert(1)' }))
  assert.throws(() => validateExecution({ ...valid, status: 'partial', quality: 'accepted' }))
})
test('source plans are recurrent and the three morning departments never have another shift', () => {
  const seeds = JSON.parse(readFileSync(new URL('../src/operations/seed.json', import.meta.url)))
  assert.ok(seeds.length > 700)
  assert.ok(seeds.every(p => ['daily', 'weekly', 'monthly'].includes(p.frequency) && !p.date && !p.start && !p.end))
  assert.ok(seeds.filter(p => ['pest', 'landscape', 'spider'].includes(p.department)).every(p => p.shift === 'صباحية'))
  assert.ok(seeds.some(p => p.department === 'housekeeping' && p.review))
})
test('permissions distinguish supervisor execution, viewer read access and technician exclusion', () => {
  assert.equal(canUser({ role: 'viewer' }, 'operations', 'view'), true)
  assert.equal(canUser({ role: 'viewer' }, 'operations', 'add'), false)
  assert.equal(canUser({ role: 'supervisor' }, 'operations', 'add'), true)
  assert.equal(canUser({ role: 'maintenance_tech' }, 'operations', 'view'), false)
  assert.equal(canUser({ role: 'supervisor', permissions: { matrix: { operations: { view: false } } } }, 'operations', 'add'), false)
})
