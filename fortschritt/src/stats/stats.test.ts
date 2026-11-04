import { describe, expect, test } from 'vitest'
import { accountRows, ampelFor } from '@/stats/accounts'
import { bezirkRows, gebietStats } from '@/stats/bezirke'
import { accountSummaryText } from '@/stats/copy'
import { fixtureEdges, fixtureMarks, fixtureNow } from '@/stats/fixtures.test-data'
import { formatKm, formatPercent } from '@/stats/format'
import { filteredBezirke, mapLayerFilter, markdownLinkUrl } from '@/stats/map-filter'
import { buildDataset, sortAccounts } from '@/stats/model'
import { bezirkName, runningDelivery } from '@/stats/plan'
import { cumulativePoints, forecastDay, paceKmPerWeek, sollAt, weeklyBuckets } from '@/stats/series'
import { scopes, scopeStatus } from '@/stats/status'
import { monthStarts, niceTicks } from '@/stats/ticks'
import { berlinTime, dayFromIso, isoFromDay, weekStart } from '@/stats/time'

const now = berlinTime(fixtureNow)
const start = dayFromIso('2026-10-26')
const deadline2 = dayFromIso('2027-03-01')
const deadline3 = dayFromIso('2027-08-01')
const dataset = buildDataset(fixtureEdges, fixtureMarks)

describe('time in Europe/Berlin', () => {
  test('winter time is UTC+1', () => {
    expect(berlinTime('2026-11-01T23:30:00Z')).toBeCloseTo(dayFromIso('2026-11-02') + 0.5 / 24)
  })
  test('summer time is UTC+2', () => {
    expect(berlinTime('2026-10-24T22:30:00Z')).toBeCloseTo(dayFromIso('2026-10-25') + 0.5 / 24)
  })
  test('weeks start on Monday', () => {
    expect(isoFromDay(weekStart(dayFromIso('2026-11-01')))).toBe('2026-10-26')
    expect(isoFromDay(weekStart(dayFromIso('2026-11-02')))).toBe('2026-11-02')
    expect(isoFromDay(weekStart(berlinTime('2026-11-01T23:30:00Z')))).toBe('2026-11-02')
  })
})

describe('plan and data', () => {
  test('Bezirk names lose their number', () => {
    expect(bezirkName('08 - Neukölln')).toBe('Neukölln')
    expect(bezirkName('Mitte')).toBe('Mitte')
  })
  test('accounts come from the data, sorted by number', () => {
    expect(dataset.accounts).toEqual(['fmc_7', 'fmc_8', 'fmc_11'])
    expect(sortAccounts(['fmc_12', 'fmc_9'])).toEqual(['fmc_9', 'fmc_12'])
  })
  test('start is the Monday of the first completion', () => {
    expect(dataset.start).toBe(start)
  })
  test('marks without an edge are counted, unknown Bezirke listed', () => {
    expect(dataset.orphanMarks).toBe(1)
    expect(dataset.done).toHaveLength(3)
    expect(dataset.unknownBezirke).toEqual(['Nirgendwo'])
    expect(dataset.rawBezirke.get('Neukölln')).toEqual(['08 - Neukölln'])
  })
  test('the running delivery switches at the deadline', () => {
    expect(runningDelivery(dataset.deliveries, now).nr).toBe(2)
    expect(runningDelivery(dataset.deliveries, deadline2).nr).toBe(3)
    expect(runningDelivery(dataset.deliveries, deadline3 + 10).nr).toBe(3)
  })
})

describe('series', () => {
  const [gesamt, l2, l3] = scopes(dataset)
  test('Soll of a delivery is a straight line to its deadline', () => {
    expect(l2!.segments).toEqual([{ from: start, to: deadline2, km: 6 }])
    expect(sollAt(l2!.segments, start)).toBe(0)
    expect(sollAt(l2!.segments, start + 63)).toBeCloseTo(3)
    expect(sollAt(l2!.segments, deadline2 + 5)).toBe(6)
  })
  test('Lieferung 3 runs from the deadline of Lieferung 2', () => {
    expect(l3!.segments).toEqual([{ from: deadline2, to: deadline3, km: 4 }])
    expect(sollAt(l3!.segments, now)).toBe(0)
  })
  test('the Gesamt Soll line has a kink at the first deadline', () => {
    expect(sollAt(gesamt!.segments, deadline2)).toBeCloseTo(6)
    // Before: 6 km in 126 days. After: 4 km in 153 days.
    const before = sollAt(gesamt!.segments, deadline2) - sollAt(gesamt!.segments, deadline2 - 7)
    const after = sollAt(gesamt!.segments, deadline2 + 7) - sollAt(gesamt!.segments, deadline2)
    expect(before).toBeCloseTo((6 / 126) * 7)
    expect(after).toBeCloseTo((4 / 153) * 7)
    expect(sollAt(gesamt!.segments, deadline3)).toBeCloseTo(10)
  })
  test('weekly buckets use Berlin weeks and mark the running week', () => {
    const l2Done = dataset.done.filter((item) => item.delivery === 2)
    expect(weeklyBuckets(l2Done, start, now)).toEqual([
      { week: start, km: 1, edges: 1, partial: false },
      { week: start + 7, km: 2, edges: 1, partial: true },
    ])
  })
  test('cumulative points: start, end of each full week, now', () => {
    const l2Done = dataset.done.filter((item) => item.delivery === 2)
    expect(cumulativePoints(l2Done, start, now)).toEqual([
      { t: start, km: 0 },
      { t: start + 7, km: 1 },
      { t: now, km: 3 },
    ])
  })
  test('pace is a rolling window, never before the start and at least 7 days', () => {
    const items = [{ t: start + 0.5, km: 7 }]
    expect(paceKmPerWeek(items, start + 1, 14, start)).toBeCloseTo(7)
    expect(paceKmPerWeek(items, start + 14, 14, start)).toBeCloseTo(3.5)
    expect(paceKmPerWeek(items, start + 21, 14, start)).toBe(0)
  })
  test('forecast', () => {
    expect(forecastDay(3, 6, 3, now)).toBeCloseTo(now + 7)
    expect(forecastDay(6, 6, 0, now)).toBe(now)
    expect(forecastDay(3, 6, 0, now)).toBeNull()
  })
})

describe('status of a delivery', () => {
  const status = scopeStatus(dataset, scopes(dataset)[1]!, now)
  const elapsed = now - start
  test('done, Soll and plan state', () => {
    expect(status.targetKm).toBe(6)
    expect(status.doneKm).toBe(3)
    expect(status.share).toBe(0.5)
    expect(status.edgesDone).toBe(2)
    expect(status.sollKm).toBeCloseTo((6 * elapsed) / 126)
    expect(status.planState).toBe('voraus')
  })
  test('needed per week, pace of 4 weeks and forecast', () => {
    expect(status.weeksLeft).toBeCloseTo((126 - elapsed) / 7)
    expect(status.neededPerWeek).toBeCloseTo(3 / ((126 - elapsed) / 7))
    expect(status.pace).toBeCloseTo((3 / elapsed) * 7)
    expect(status.forecast).toBeCloseTo(now + (3 / status.pace) * 7)
  })
})

describe('accounts', () => {
  const rows = accountRows(dataset, now)
  const [fmc7, fmc8, fmc11] = rows
  test('rest, needed and pace in the running delivery', () => {
    expect(fmc7).toMatchObject({ account: 'fmc_7', delivery: 2, totalKm: 4, doneKm: 1, restKm: 3 })
    expect(fmc7!.neededPerWeek).toBeCloseTo(3 / ((126 - (now - start)) / 7))
    expect(fmc7!.pace).toBeCloseTo((1 / (now - start)) * 7)
    expect(fmc7!.ampel).toBe('gruen')
  })
  test('later delivery and foreign areas are their own numbers', () => {
    expect(fmc7!.laterDoneKm).toBe(4)
    expect(fmc7!.foreignKm).toBe(2)
    expect(fmc7!.foreignEdges).toBe(1)
    expect(fmc8!.foreignKm).toBe(0)
  })
  test('nothing left is done', () => {
    expect(fmc8).toMatchObject({ restKm: 0, ampel: 'fertig', ratio: null })
    expect(fmc11!.totalKm).toBe(0)
  })
  test('Ampel thresholds', () => {
    expect(ampelFor(10, 10, 10)).toBe('gruen')
    expect(ampelFor(10, 8, 10)).toBe('gelb')
    expect(ampelFor(10, 7.9, 10)).toBe('rot')
    expect(ampelFor(10, 50, Infinity)).toBe('rot')
    expect(ampelFor(0, 0, 0)).toBe('fertig')
  })
  test('copy text names every account', () => {
    const text = accountSummaryText(rows, deadline2, '04.11.2026, 23:00')
    expect(text).toContain('Lieferung 2: Deadline Mapping 01.03.2027')
    expect(text).toContain('fmc_7: 1,0 km von 4,0 km erledigt, Rest 3,0 km.')
    expect(text).toContain('fmc_8')
  })
})

describe('Bezirke and Gebiete', () => {
  test('rows in plan order with their delivery', () => {
    const rows = bezirkRows(dataset)
    expect(rows).toHaveLength(12)
    expect(rows[0]).toMatchObject({ bezirk: 'Neukölln', delivery: 2, km: 3, doneKm: 3, edges: 2 })
    expect(rows.find((row) => row.bezirk === 'Mitte')).toMatchObject({ delivery: 3, share: 1 })
  })
  test('a Gebiet is one account in one Bezirk', () => {
    expect(gebietStats(dataset, 'Neukölln', 'fmc_8')).toMatchObject({ km: 2, doneKm: 2 })
    expect(gebietStats(dataset, 'Treptow-Köpenick', 'fmc_7')).toMatchObject({ doneKm: 0, share: 0 })
  })
})

describe('format', () => {
  test('German numbers', () => {
    expect(formatKm(80.452)).toBe('80,5 km')
    expect(formatKm(1996.39)).toBe('1.996 km')
    expect(formatPercent(0.0403)).toBe('4,0 %')
  })
})

describe('ticks', () => {
  test('nice ticks reach the maximum', () => {
    expect(niceTicks(1131)).toEqual([0, 500, 1000, 1500])
    expect(niceTicks(1178, 5)).toEqual([0, 250, 500, 750, 1000, 1250])
    expect(niceTicks(6)).toEqual([0, 2, 4, 6])
    expect(niceTicks(0)).toEqual([0])
  })
  test('month starts', () => {
    expect(monthStarts(start, deadline2).map(isoFromDay)).toEqual([
      '2026-11-01',
      '2026-12-01',
      '2027-01-01',
      '2027-02-01',
      '2027-03-01',
    ])
  })
})

describe('map filter', () => {
  test('Lieferung, Bezirk and account', () => {
    expect(mapLayerFilter(dataset, {})).toEqual(['all'])
    expect(mapLayerFilter(dataset, { bezirk: 'Neukölln', account: 'fmc_7' })).toEqual([
      'all',
      ['in', ['get', 'bezirk'], ['literal', ['08 - Neukölln']]],
      ['==', ['get', 'account'], 'fmc_7'],
    ])
    expect(filteredBezirke(dataset, { lieferung: '3' })).toHaveLength(6)
  })
  test('editor link from markdown', () => {
    expect(
      markdownLinkUrl('[Im Editor öffnen](https://radnetz-mapping.netlify.app/#map=1/2/3)'),
    ).toBe('https://radnetz-mapping.netlify.app/#map=1/2/3')
    expect(markdownLinkUrl(null)).toBeNull()
  })
})
