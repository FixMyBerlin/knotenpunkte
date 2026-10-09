import type {
  RapidAttributeKey,
  RapidDraft,
  RapidValue,
  SuggestionAudit,
} from '@/shared/ratings/schema'
import type { SuggestionRow } from './schema'

export function applySuggestions(draft: RapidDraft, rows: SuggestionRow[]): RapidDraft {
  const next: RapidDraft = { ...draft }
  for (const row of rows) {
    if (next[row.attribute] !== undefined) continue
    Object.assign(next, { [row.attribute]: row.value })
  }
  return next
}

export function suggestionMismatch(
  chosen: RapidValue | undefined,
  suggested: RapidValue | undefined,
) {
  if (chosen === undefined || suggested === undefined) return false
  return chosen !== suggested
}

export function buildSuggestionAudit(
  draft: RapidDraft,
  rows: SuggestionRow[],
): Partial<Record<RapidAttributeKey, SuggestionAudit>> {
  const audit: Partial<Record<RapidAttributeKey, SuggestionAudit>> = {}
  for (const row of rows) {
    const chosen = draft[row.attribute]
    audit[row.attribute] = {
      suggested: row.value,
      confidence: row.confidence,
      accepted: chosen !== undefined && chosen === row.value,
    }
  }
  return audit
}

export function formatSuggestionValue(value: RapidValue) {
  if (value === 0) return 'Nein'
  if (value === 1) return 'Ja'
  return value
}

export type ProbabilityRank = 'high' | 'mid' | 'low'

/**
 * Rang je Wahrscheinlichkeit: höchste = high, niedrigste = low, dazwischen mid.
 * Gleiche Werte (auf ganze Prozent gerundet, wie angezeigt) sind immer mid.
 */
export function rankProbabilities(probabilities: (number | undefined)[]) {
  const percents = probabilities.map((value) =>
    value === undefined ? undefined : Math.round(value * 100),
  )
  return percents.map((percent, index): ProbabilityRank | undefined => {
    if (percent === undefined) return undefined
    const others = percents.filter(
      (other, otherIndex): other is number => otherIndex !== index && other !== undefined,
    )
    if (others.includes(percent)) return 'mid'
    if (others.every((other) => other < percent)) return 'high'
    if (others.every((other) => other > percent)) return 'low'
    return 'mid'
  })
}
