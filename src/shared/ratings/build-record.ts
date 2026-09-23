import { clearedRapidAttributes, isRatingComplete, isSkipped } from '@/shared/ratings/completeness'
import type { HistoryKind, RapidDraft, RatingRecord } from '@/shared/ratings/schema'
import { buildSuggestionAudit } from '@/shared/suggestions/apply'
import type { SuggestionRow } from '@/shared/suggestions/schema'

type BuildArgs = {
  previous?: RatingRecord
  draft: RapidDraft
  suggestions: SuggestionRow[]
  actor: string
  at?: string
  kind?: HistoryKind
}

export function buildRatingRecord({
  previous,
  draft,
  suggestions,
  actor,
  at = new Date().toISOString(),
  kind = 'save',
}: BuildArgs): RatingRecord {
  const skipped = isSkipped(draft)
  const attributes = skipped ? { ...draft, ...clearedRapidAttributes() } : draft
  const status = isRatingComplete(attributes) ? 'complete' : 'incomplete'
  const nextValues = {
    KP_HVS: attributes.KP_HVS,
    LSA_KP: attributes.LSA_KP,
    Mar_RVF_KP: attributes.Mar_RVF_KP,
    Furt_rot: attributes.Furt_rot,
    RFS_Mitte: attributes.RFS_Mitte,
    Fl_Linksab: attributes.Fl_Linksab,
    vorgez_Fl: attributes.vorgez_Fl,
    KP_Nichtbetrachten: attributes.KP_Nichtbetrachten,
    ist_virtuell: attributes.ist_virtuell,
    'Mapillary-ID': attributes['Mapillary-ID'],
    Kommentar: attributes.Kommentar,
  }
  const history = [
    ...(previous?.history ?? []),
    {
      at,
      by: actor,
      kind,
      previous: previous
        ? {
            KP_HVS: previous.KP_HVS,
            LSA_KP: previous.LSA_KP,
            Mar_RVF_KP: previous.Mar_RVF_KP,
            Furt_rot: previous.Furt_rot,
            RFS_Mitte: previous.RFS_Mitte,
            Fl_Linksab: previous.Fl_Linksab,
            vorgez_Fl: previous.vorgez_Fl,
            KP_Nichtbetrachten: previous.KP_Nichtbetrachten,
            qa: previous.qa,
          }
        : null,
      next: {
        ...nextValues,
        qa:
          kind === 'confirmed'
            ? 'confirmed'
            : kind === 'corrected'
              ? 'corrected'
              : (previous?.qa ?? 'none'),
      },
    },
  ]
  const qa =
    kind === 'confirmed'
      ? 'confirmed'
      : kind === 'corrected'
        ? 'corrected'
        : (previous?.qa ?? 'none')
  return {
    ...nextValues,
    suggestions: buildSuggestionAudit(attributes, suggestions),
    created_by: previous?.created_by ?? actor,
    created_at: previous?.created_at ?? at,
    updated_by: actor,
    updated_at: at,
    status,
    qa,
    history,
  }
}
