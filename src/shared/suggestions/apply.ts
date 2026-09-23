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
