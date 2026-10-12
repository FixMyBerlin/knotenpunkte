import { describe, expect, it } from 'vitest'
import { buildRatingRecord } from './build-record'
import { emptyRapidDraft, type RapidDraft } from './schema'

const complete: RapidDraft = {
  ...emptyRapidDraft(),
  KP_HVS: 1,
  LSA_KP: 1,
  Mar_RVF_KP: 'keine',
  Furt_rot: 'keine',
  RFS_Mitte: 'keine',
  Fl_Linksab: 'keine',
  vorgez_Fl: 'keine',
}

const build = (args: Partial<Parameters<typeof buildRatingRecord>[0]>) =>
  buildRatingRecord({ draft: complete, suggestions: [], actor: 'a', ...args })

describe('buildRatingRecord', () => {
  it('completes a node on a normal save', () => {
    expect(build({}).status).toBe('complete')
  })

  it('keeps an open node open on an autosave', () => {
    expect(build({ autosave: true }).status).toBe('incomplete')
  })

  it('keeps a finished node finished on an autosave', () => {
    const previous = build({})
    const next = build({ previous, autosave: true, draft: { ...complete, Kommentar: 'x' } })
    expect(next.status).toBe('complete')
    expect(next.Kommentar).toBe('x')
  })

  it('keeps a node that is put off open, with all answers', () => {
    const record = build({ draft: { ...complete, Zurueckgestellt: 1 } })
    expect(record.status).toBe('incomplete')
    expect(record.Zurueckgestellt).toBe(1)
    expect(record.Furt_rot).toBe('keine')
  })

  it('sets HVS and LSA to Nein and clears the rest for a node that is not relevant', () => {
    const record = build({ draft: { ...complete, KP_Nichtbetrachten: 1, Kommentar: 'x' } })
    expect(record).toMatchObject({ status: 'complete', KP_HVS: 0, LSA_KP: 0, Kommentar: 'x' })
    expect(record.Furt_rot).toBeUndefined()
  })

  it('merges autosaves of the same person into one history entry', () => {
    const first = build({ autosave: true, at: '2026-01-01T10:00:00.000Z' })
    const second = build({
      previous: first,
      autosave: true,
      at: '2026-01-01T10:01:00.000Z',
      draft: { ...complete, Kommentar: 'x' },
    })
    expect(second.history).toHaveLength(1)
    expect(second.history[0]).toMatchObject({ previous: null, at: '2026-01-01T10:01:00.000Z' })

    const other = build({ previous: second, autosave: true, actor: 'b' })
    expect(other.history).toHaveLength(2)
  })
})
