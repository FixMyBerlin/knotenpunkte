import { z } from 'zod'

/** Written by `infravelo-radnetz/netzanpassungen/export_app_daten.py`. */
export const INPUT_SCHEMA = 'netzanpassungen-app/v1'

const position = z.array(z.number()).min(2)
const lineString = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(position).min(2),
})
const point = z.object({ type: z.literal('Point'), coordinates: position })

const optionalText = z.string().nullable().optional()

function featureCollection<P extends z.ZodType, G extends z.ZodType>(properties: P, geometry: G) {
  return z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(z.object({ type: z.literal('Feature'), geometry, properties })),
  })
}

const detailnetzProperties = z.object({
  element_nr: optionalText,
  beginnt_bei_vp: optionalText,
  endet_bei_vp: optionalText,
  strassenname: optionalText,
  verkehrsebene: z.number().nullable().optional(),
  okstra_id: optionalText,
})

const nodeProperties = z.object({
  id: z.string().min(1),
  ist_virtuell: z.number(),
})

const renProperties = z.object({
  element_nr: optionalText,
  von_knoten: optionalText,
  bis_knoten: optionalText,
  radverkehrsnetz: optionalText,
  strassenname: optionalText,
})

const routeProperties = z.object({ name: optionalText })

const gapProperties = z.object({ name: optionalText, laenge_m: z.number() })

const suggestionProperties = z.object({
  element_nr: optionalText,
  strassenname: optionalText,
  verkehrsebene: z.number().nullable().optional(),
  routen: optionalText,
  winkel_grad: z.number(),
  steil: z.boolean(),
  luecke_nah: z.boolean(),
  station_m: z.number(),
  abstand_ende_m: z.number(),
})

const inputFileSchema = z.object({
  schema: z.literal(INPUT_SCHEMA),
  gebiet: z.string(),
  erzeugt_am: z.string(),
  quellen: z.record(z.string(), z.string()),
  detailnetz: featureCollection(detailnetzProperties, lineString),
  knoten: featureCollection(nodeProperties, point),
  ren_netz: featureCollection(renProperties, lineString),
  radfernwege: featureCollection(routeProperties, lineString),
  luecken: featureCollection(gapProperties, lineString),
  /** Missing in files from before the suggestions. */
  knoten_vorschlaege: featureCollection(suggestionProperties, point).optional(),
})

export type InputFile = z.infer<typeof inputFileSchema>

export function parseInputText(text: string): InputFile {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.')
  }
  const schema = (json as { schema?: unknown } | null)?.schema
  if (schema !== INPUT_SCHEMA) {
    throw new Error(
      `Unbekanntes Format „${String(schema)}“. Erwartet wird „${INPUT_SCHEMA}“ aus export_app_daten.py.`,
    )
  }
  const parsed = inputFileSchema.safeParse(json)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new Error(
      `Die Datei passt nicht zum Format: ${issue?.path.join('.')} – ${issue?.message}`,
    )
  }
  return parsed.data
}
