import type { Feature, FeatureCollection, MultiPoint, Point } from 'geojson'
import { z } from 'zod'

const pointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]).rest(z.number()),
})

const multiPointSchema = z.object({
  type: z.literal('MultiPoint'),
  coordinates: z.array(z.tuple([z.number(), z.number()]).rest(z.number())).min(1),
})

const nodeGeometrySchema = z.union([pointSchema, multiPointSchema])

export const nodePropertiesSchema = z
  .object({
    id: z.string().min(1),
  })
  .passthrough()

export type NodeProperties = z.infer<typeof nodePropertiesSchema> & Record<string, unknown>

const nodesMetadataSchema = z
  .object({
    schema: z.string().optional(),
    dataset: z.string().min(1).optional(),
    region: z.string().optional(),
    generated_at: z.string().optional(),
    source: z.string().optional(),
  })
  .passthrough()

export type NodesMetadata = z.infer<typeof nodesMetadataSchema>

const nodeFeatureSchema = z.object({
  type: z.literal('Feature'),
  id: z.union([z.string(), z.number()]).optional(),
  geometry: nodeGeometrySchema,
  properties: nodePropertiesSchema,
})

export const nodesCollectionSchema = z
  .object({
    type: z.literal('FeatureCollection'),
    metadata: nodesMetadataSchema.optional(),
    features: z.array(nodeFeatureSchema).min(1),
  })
  .superRefine((value, ctx) => {
    const ids = new Set<string>()
    for (const [index, feature] of value.features.entries()) {
      const id = feature.properties.id
      if (ids.has(id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Doppelte Knoten-ID „${id}“`,
          path: ['features', index, 'properties', 'id'],
        })
      }
      ids.add(id)
    }
  })

export type JunctionNodeGeometry = Point | MultiPoint

export type JunctionNodesGeoJSON = FeatureCollection<JunctionNodeGeometry, NodeProperties> & {
  metadata?: NodesMetadata
}

export type JunctionNodeFeature = Feature<JunctionNodeGeometry, NodeProperties>

export function nodeLngLat(feature: JunctionNodeFeature): [number, number] {
  if (feature.geometry.type === 'Point') {
    const lng = feature.geometry.coordinates[0]
    const lat = feature.geometry.coordinates[1]
    if (lng === undefined || lat === undefined) throw new Error('Punkt ohne Koordinaten')
    return [lng, lat]
  }
  const first = feature.geometry.coordinates[0]
  const lng = first?.[0]
  const lat = first?.[1]
  if (lng === undefined || lat === undefined) throw new Error('MultiPoint ohne Koordinaten')
  return [lng, lat]
}

/** Unicode hyphen (U+2010) used by the Infravelo result file’s `Knotenpunkt‐ID`. */
export const UNICODE_HYPHEN = '\u2010'

const nodeIdKeys = ['NUMMER', 'Knotenpunkt-ID', `Knotenpunkt${UNICODE_HYPHEN}ID`] as const

export function nodeIdFromProperties(properties: Record<string, unknown> | null | undefined) {
  if (!properties) return undefined
  for (const key of nodeIdKeys) {
    const value = properties[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return undefined
}

export function readOnlyNodeFields(properties: Record<string, unknown>) {
  return {
    nummer: nodeIdFromProperties(properties) ?? '',
    okstraId: stringOrEmpty(properties.okstra_id ?? properties.OKSTRA_ID),
    bezirksnummer: stringOrEmpty(properties.Bezirksnummer),
    radvorrangnetz: stringOrEmpty(properties.ist_radvorrangnetz),
  }
}

function stringOrEmpty(value: unknown) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}
