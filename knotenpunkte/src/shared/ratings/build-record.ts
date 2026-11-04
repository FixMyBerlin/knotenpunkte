import { isRatingComplete, isSkipped } from '@/shared/ratings/completeness'
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
  /**
   * Saved in the background while editing. It never finishes a node: only "Speichern",
   * "Nicht relevant" and "Nicht betrachten" make an open node complete. The last history entry is
   * updated instead of a new one added, when it is a recent save by the same person.
   */
  autosave?: boolean
}

/** Autosaves this close together count as one step in the history. */
const AUTOSAVE_MERGE_MS = 15 * 60 * 1000

export function buildRatingRecord({
  previous,
  draft,
  suggestions,
  actor,
  at = new Date().toISOString(),
  kind = 'save',
  autosave = false,
}: BuildArgs): RatingRecord {
  const skipped = isSkipped(draft)
  // A node that is not considered is finished as it is; "Nicht relevant" sets its attributes
  // before the save.
  const attributes = draft
  // A node that is put off stays open, whatever is filled in.
  const deferred = !skipped && draft.Zurueckgestellt === 1
  const staysOpen = deferred || (autosave && previous?.status !== 'complete')
  const status = !staysOpen && isRatingComplete(attributes) ? 'complete' : 'incomplete'
  const nextValues = {
    KP_HVS: attributes.KP_HVS,
    LSA_KP: attributes.LSA_KP,
    Mar_RVF_KP: attributes.Mar_RVF_KP,
    Furt_rot: attributes.Furt_rot,
    RFS_Mitte: attributes.RFS_Mitte,
    Fl_Linksab: attributes.Fl_Linksab,
    vorgez_Fl: attributes.vorgez_Fl,
    KP_Nichtbetrachten: attributes.KP_Nichtbetrachten,
    Zurueckgestellt: deferred ? (1 as const) : (0 as const),
    ist_virtuell: attributes.ist_virtuell,
    'Mapillary-ID': attributes['Mapillary-ID'] || undefined,
    Quelle: attributes.Quelle || undefined,
    Kommentar: attributes.Kommentar || undefined,
    Kommentar_intern: attributes.Kommentar_intern || undefined,
  }
  const qa =
    kind === 'confirmed'
      ? 'confirmed'
      : kind === 'corrected'
        ? 'corrected'
        : (previous?.qa ?? 'none')
  const earlier = previous?.history ?? []
  const last = earlier.at(-1)
  const mergeIntoLast =
    autosave &&
    last !== undefined &&
    last.kind === 'save' &&
    last.by === actor &&
    Date.parse(at) - Date.parse(last.at) < AUTOSAVE_MERGE_MS
  const entry = {
    at,
    by: actor,
    kind,
    // A merged entry keeps what was there before the first of its saves.
    previous: mergeIntoLast
      ? last.previous
      : previous
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
    next: { ...nextValues, qa },
  }
  const history = [...(mergeIntoLast ? earlier.slice(0, -1) : earlier), entry]
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
