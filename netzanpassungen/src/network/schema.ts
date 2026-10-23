import { z } from 'zod'

/**
 * A node is referred to by a key: `k:<Knoten-ID>` for a node of the input file (Detailnetz or an
 * existing virtual node), `v:<entry id>` for a virtual node drawn here.
 */
const nodeKeySchema = z.string().regex(/^[kv]:.+/)

const lngLatSchema = z.tuple([z.number(), z.number()])

/** The edge a virtual node lies on: REN+ and Detailnetz by their line key, new edges by entry id. */
const hostKindSchema = z.enum(['ren', 'detailnetz', 'neu'])

export type HostKind = z.infer<typeof hostKindSchema>

const virtualNodeSchema = z.object({
  kind: z.literal('virtual_node'),
  name: z.string().min(1),
  /** Computed when the node was placed or moved; a name equal to it follows later moves. */
  name_vorschlag: z.string(),
  lngLat: lngLatSchema,
  traeger: z.object({
    art: hostKindSchema,
    ref: z.string(),
    station_m: z.number(),
  }),
  kommentar: z.string().optional(),
  geloescht: z.boolean().optional(),
})

const newEdgeSchema = z.object({
  kind: z.literal('new_edge'),
  von: nodeKeySchema,
  bis: nodeKeySchema,
  coordinates: z.array(lngLatSchema).min(2),
  quelle: z.enum(['gezeichnet', 'radfernweg']),
  strassenname: z.string().optional(),
  routen_fernradweg: z.string().optional(),
  kommentar: z.string().optional(),
  geloescht: z.boolean().optional(),
})

export const entrySchema = z.discriminatedUnion('kind', [virtualNodeSchema, newEdgeSchema])

export type VirtualNodeEntry = z.infer<typeof virtualNodeSchema>
export type NewEdgeEntry = z.infer<typeof newEdgeSchema>
export type Entry = z.infer<typeof entrySchema>

/** A stored entry with what the store knows about it. */
export type Stored<T extends Entry = Entry> = {
  id: string
  data: T
  version: number
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
}

export const virtualNodeNamePattern = /^V[0-9A-Za-z-]+$/

export function newEntryId() {
  return crypto.randomUUID()
}
