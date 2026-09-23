import {
  rapidAttributeKeys,
  type RapidDraft,
  type RapidAttributeKey,
  type RatingRecord,
} from './schema'

export function isSkipped(draft: Pick<RapidDraft, 'KP_Nichtbetrachten'>) {
  return draft.KP_Nichtbetrachten === 1
}

export function hasAllRapidAttributes(draft: RapidDraft) {
  return rapidAttributeKeys.every((key) => draft[key] !== undefined)
}

export function isRatingComplete(draft: RapidDraft) {
  return isSkipped(draft) || hasAllRapidAttributes(draft)
}

export function clearedRapidAttributes(): Pick<RapidDraft, RapidAttributeKey> {
  return {
    KP_HVS: undefined,
    LSA_KP: undefined,
    Mar_RVF_KP: undefined,
    Furt_rot: undefined,
    RFS_Mitte: undefined,
    Fl_Linksab: undefined,
    vorgez_Fl: undefined,
  }
}

export function firstEmptyRapidKey(draft: RapidDraft): RapidAttributeKey | undefined {
  if (isSkipped(draft)) return undefined
  return rapidAttributeKeys.find((key) => draft[key] === undefined)
}

export function ratingProgress(
  records: Record<string, RatingRecord | undefined>,
  nodeIds: string[],
) {
  const total = nodeIds.length
  const rated = nodeIds.filter((id) => records[id]?.status === 'complete').length
  return { rated, total }
}
