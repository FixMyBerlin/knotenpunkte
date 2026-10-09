import { z } from 'zod'
import {
  binaryValueSchema,
  rapidAttributeKeys,
  rapidAttributeMeta,
  type RapidValue,
  ternaryValueSchema,
} from '@/shared/ratings/schema'

export const suggestionRowSchema = z
  .object({
    id: z.string().min(1),
    attribute: z.enum(rapidAttributeKeys),
    value: z.union([binaryValueSchema, ternaryValueSchema]),
    confidence: z.number().min(0).max(1),
    probabilities: z.record(z.string(), z.number().min(0).max(1)).optional(),
  })
  .superRefine((row, ctx) => {
    const kind = rapidAttributeMeta[row.attribute].kind
    const valueSchema = kind === 'binary' ? binaryValueSchema : ternaryValueSchema
    if (!valueSchema.safeParse(row.value).success) {
      ctx.addIssue({
        code: 'custom',
        message: `${row.attribute}: Wert ${JSON.stringify(row.value)} passt nicht zum Attribut`,
        path: ['value'],
      })
    }
    const allowedKeys = kind === 'binary' ? ['0', '1'] : ternaryValueSchema.options
    for (const key of Object.keys(row.probabilities ?? {})) {
      if (!allowedKeys.includes(key)) {
        ctx.addIssue({
          code: 'custom',
          message: `${row.attribute}: Wahrscheinlichkeit für „${key}“ passt nicht zum Attribut`,
          path: ['probabilities'],
        })
      }
    }
  })

export type SuggestionRow = z.infer<typeof suggestionRowSchema>

export const suggestionsFileSchema = z.array(suggestionRowSchema).superRefine((rows, ctx) => {
  const seen = new Set<string>()
  for (const [index, row] of rows.entries()) {
    const key = `${row.id}\u0000${row.attribute}`
    if (seen.has(key)) {
      ctx.addIssue({
        code: 'custom',
        message: `Doppelter Vorschlag für Knoten „${row.id}“, ${row.attribute}`,
        path: [index],
      })
    }
    seen.add(key)
  }
})

export function parseSuggestionsText(text: string) {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Die Vorschlagsdatei ist kein gültiges JSON.')
  }
  const result = suggestionsFileSchema.safeParse(parsed)
  if (!result.success) {
    const issue = result.error.issues[0]
    const where = issue?.path.length ? ` (Zeile ${String(issue.path[0])})` : ''
    const detail = issue?.code === 'custom' ? `: ${issue.message}${where}` : where
    throw new Error(
      `Vorschläge: Array aus { id, attribute, value, confidence (0–1), probabilities? } erwartet${detail}.`,
    )
  }
  return result.data
}

export function suggestionProbability(row: SuggestionRow, value: RapidValue) {
  const fromMap = row.probabilities?.[String(value)]
  if (fromMap !== undefined) return fromMap
  return row.value === value ? row.confidence : undefined
}

export function suggestionsForNode(rows: SuggestionRow[], nodeId: string) {
  return rows.filter((row) => row.id === nodeId)
}
