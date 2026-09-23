import { z } from 'zod'
import { rapidAttributeKeys } from '@/shared/ratings/schema'

export const suggestionRowSchema = z.object({
  id: z.string().min(1),
  attribute: z.enum(rapidAttributeKeys),
  value: z.union([z.literal(0), z.literal(1), z.enum(['keine', 'teilweise', 'gänzlich'])]),
  confidence: z.number().min(0).max(1),
})

export type SuggestionRow = z.infer<typeof suggestionRowSchema>

export const suggestionsFileSchema = z.array(suggestionRowSchema)

export function parseSuggestionsText(text: string) {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Die Vorschlagsdatei ist kein gültiges JSON.')
  }
  const result = suggestionsFileSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error('Vorschläge: Array aus { id, attribute, value, confidence (0–1) } erwartet.')
  }
  return result.data
}

export function suggestionsForNode(rows: SuggestionRow[], nodeId: string) {
  return rows.filter((row) => row.id === nodeId)
}
