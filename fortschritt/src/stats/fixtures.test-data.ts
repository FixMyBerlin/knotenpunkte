import type { EdgeRecord, MarkRecord } from '@/stats/model'

/** Small network: 6 km in Lieferung 2, 4 km in Lieferung 3, one Bezirk outside the plan. */
export const fixtureEdges: EdgeRecord[] = [
  { id: 1, lengthM: 1000, bezirk: '08 - Neukölln', account: 'fmc_7' },
  { id: 2, lengthM: 2000, bezirk: '08 - Neukölln', account: 'fmc_8' },
  { id: 3, lengthM: 3000, bezirk: '09 - Treptow-Köpenick', account: 'fmc_7' },
  { id: 4, lengthM: 4000, bezirk: '01 - Mitte', account: 'fmc_7' },
  { id: 5, lengthM: 500, bezirk: '99 - Nirgendwo', account: 'fmc_11' },
]

export const fixtureMarks: MarkRecord[] = [
  { id: '1', createdAt: '2026-10-28T10:00:00.000Z', createdBy: 'fmc_7' },
  // Sunday 23:30 in UTC, but already Monday 00:30 in Berlin: belongs to the second week.
  { id: '2', createdAt: '2026-11-01T23:30:00.000Z', createdBy: 'fmc_7' },
  { id: '4', createdAt: '2026-11-03T12:00:00.000Z', createdBy: 'fmc_7' },
  { id: '999', createdAt: '2026-11-03T12:00:00.000Z', createdBy: 'fmc_8' },
]

/** Wednesday 4 November 2026, 23:00 in Berlin. */
export const fixtureNow = '2026-11-04T22:00:00.000Z'
