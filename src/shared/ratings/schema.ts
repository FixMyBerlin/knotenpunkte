import { z } from 'zod'

export const binaryAttributeKeys = ['KP_HVS', 'LSA_KP'] as const
export const ternaryAttributeKeys = [
  'Mar_RVF_KP',
  'Furt_rot',
  'RFS_Mitte',
  'Fl_Linksab',
  'vorgez_Fl',
] as const
export const rapidAttributeKeys = [...binaryAttributeKeys, ...ternaryAttributeKeys] as const

export type BinaryAttributeKey = (typeof binaryAttributeKeys)[number]
export type TernaryAttributeKey = (typeof ternaryAttributeKeys)[number]
export type RapidAttributeKey = (typeof rapidAttributeKeys)[number]

export const binaryValueSchema = z.union([z.literal(0), z.literal(1)])
export const ternaryValueSchema = z.enum(['keine', 'teilweise', 'gänzlich'])

export type BinaryValue = z.infer<typeof binaryValueSchema>
export type TernaryValue = z.infer<typeof ternaryValueSchema>
export type RapidValue = BinaryValue | TernaryValue

export const binaryLabels = { 0: 'Nein', 1: 'Ja' } as const
export const ternaryLabels = {
  keine: 'keine',
  teilweise: 'teilweise',
  gänzlich: 'gänzlich',
} as const

export const rapidAttributeMeta: Record<
  RapidAttributeKey,
  { title: string; kind: 'binary' | 'ternary' }
> = {
  KP_HVS: { title: 'Knotenpunkt mit Hauptverkehrsstraße (HVS)', kind: 'binary' },
  LSA_KP: { title: 'LSA-Knotenpunkt', kind: 'binary' },
  Mar_RVF_KP: { title: 'Markierte Radverkehrsfurten im Knotenpunkt', kind: 'ternary' },
  Furt_rot: { title: 'Rotmarkierung der Furt', kind: 'ternary' },
  RFS_Mitte: { title: 'Radfahrstreifen in Mittellage', kind: 'ternary' },
  Fl_Linksab: { title: 'Rad-Aufstellflächen für Linksabbiegen vorhanden', kind: 'ternary' },
  vorgez_Fl: { title: 'Vorgezogene Aufstellflächen vorhanden', kind: 'ternary' },
}

export const suggestionAuditSchema = z.object({
  suggested: z.union([binaryValueSchema, ternaryValueSchema, z.string(), z.number()]),
  confidence: z.number().min(0).max(1),
  accepted: z.boolean(),
})

export type SuggestionAudit = z.infer<typeof suggestionAuditSchema>

export const qaStatusSchema = z.enum(['none', 'confirmed', 'corrected'])
export type QaStatus = z.infer<typeof qaStatusSchema>

export const historyKindSchema = z.enum(['save', 'confirmed', 'corrected'])
export type HistoryKind = z.infer<typeof historyKindSchema>

export const historyEntrySchema = z.object({
  at: z.string(),
  by: z.string(),
  kind: historyKindSchema,
  previous: z.unknown(),
  next: z.unknown(),
})

export type HistoryEntry = z.infer<typeof historyEntrySchema>

export const ratingStatusSchema = z.enum(['incomplete', 'complete'])
export type RatingStatus = z.infer<typeof ratingStatusSchema>

export const ratingRecordSchema = z.object({
  KP_HVS: binaryValueSchema.optional(),
  LSA_KP: binaryValueSchema.optional(),
  Mar_RVF_KP: ternaryValueSchema.optional(),
  Furt_rot: ternaryValueSchema.optional(),
  RFS_Mitte: ternaryValueSchema.optional(),
  Fl_Linksab: ternaryValueSchema.optional(),
  vorgez_Fl: ternaryValueSchema.optional(),
  KP_Nichtbetrachten: binaryValueSchema.default(0),
  ist_virtuell: binaryValueSchema.default(0),
  'Mapillary-ID': z.string().optional(),
  Kommentar: z.string().optional(),
  suggestions: z.record(z.string(), suggestionAuditSchema).default({}),
  created_by: z.string(),
  created_at: z.string(),
  updated_by: z.string(),
  updated_at: z.string(),
  status: ratingStatusSchema,
  qa: qaStatusSchema.default('none'),
  history: z.array(historyEntrySchema).default([]),
})

export type RatingRecord = z.infer<typeof ratingRecordSchema>

export type RapidDraft = {
  KP_HVS?: BinaryValue
  LSA_KP?: BinaryValue
  Mar_RVF_KP?: TernaryValue
  Furt_rot?: TernaryValue
  RFS_Mitte?: TernaryValue
  Fl_Linksab?: TernaryValue
  vorgez_Fl?: TernaryValue
  KP_Nichtbetrachten: BinaryValue
  ist_virtuell: BinaryValue
  'Mapillary-ID'?: string
  Kommentar?: string
}

export function emptyRapidDraft(): RapidDraft {
  return {
    KP_Nichtbetrachten: 0,
    ist_virtuell: 0,
  }
}

export function rapidValuesFromRecord(record: RatingRecord | undefined): RapidDraft {
  if (!record) return emptyRapidDraft()
  return {
    KP_HVS: record.KP_HVS,
    LSA_KP: record.LSA_KP,
    Mar_RVF_KP: record.Mar_RVF_KP,
    Furt_rot: record.Furt_rot,
    RFS_Mitte: record.RFS_Mitte,
    Fl_Linksab: record.Fl_Linksab,
    vorgez_Fl: record.vorgez_Fl,
    KP_Nichtbetrachten: record.KP_Nichtbetrachten,
    ist_virtuell: record.ist_virtuell,
    'Mapillary-ID': record['Mapillary-ID'],
    Kommentar: record.Kommentar,
  }
}

export function rapidValueOf(draft: RapidDraft, key: RapidAttributeKey): RapidValue | undefined {
  return draft[key]
}
