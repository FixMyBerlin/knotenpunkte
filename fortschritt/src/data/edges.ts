import { get, set } from 'idb-keyval'
import { z } from 'zod'
import { cacheMaxAgeMs, edgesGeojsonUrl, idbKeys } from '@/config/app.const'
import type { EdgeRecord } from '@/stats/model'

export type EdgesCache = {
  loadedAt: string
  /** `ETag`, else `Last-Modified`, else `Content-Length` of the file; see `fileVersion`. */
  version: string | null
  edges: EdgeRecord[]
}

const featureSchema = z.object({
  properties: z.object({
    lfd_nr: z.number(),
    laenge_m: z.number(),
    bezirk: z.string(),
    account: z.string(),
  }),
})
const collectionSchema = z.object({ features: z.array(z.unknown()) })

/**
 * TILDA does not expose `ETag` to other origins (no `Access-Control-Expose-Headers`), so the
 * browser usually sees only the safelisted `Last-Modified` and `Content-Length`.
 */
function fileVersion(response: Response) {
  const { headers } = response
  return (
    headers.get('etag') ?? headers.get('last-modified') ?? headers.get('content-length') ?? null
  )
}

/** Keeps only `lfd_nr`, `laenge_m`, `bezirk`, `account`; features without them are skipped. */
function parseEdges(json: unknown): EdgeRecord[] {
  const { features } = collectionSchema.parse(json)
  const edges: EdgeRecord[] = []
  for (const feature of features) {
    const parsed = featureSchema.safeParse(feature)
    if (!parsed.success) continue
    const { lfd_nr, laenge_m, bezirk, account } = parsed.data.properties
    edges.push({ id: lfd_nr, lengthM: laenge_m, bezirk, account })
  }
  return edges
}

async function fetchEdges(): Promise<EdgesCache> {
  const response = await fetch(edgesGeojsonUrl)
  if (!response.ok) throw new Error(`Das Netz von TILDA ist nicht abrufbar (${response.status}).`)
  const edges = parseEdges(await response.json())
  const cache: EdgesCache = {
    loadedAt: new Date().toISOString(),
    version: fileVersion(response),
    edges,
  }
  await set(idbKeys.edges, cache)
  return cache
}

async function remoteVersion() {
  try {
    const response = await fetch(edgesGeojsonUrl, { method: 'HEAD' })
    return response.ok ? fileVersion(response) : null
  } catch {
    return null
  }
}

/**
 * The network from the cache, or from TILDA when the cache is missing, older than a day, the
 * file changed (a `HEAD` request), or `force` is set. Without a connection the cache stays.
 */
export async function loadEdges(force = false): Promise<EdgesCache & { stale: boolean }> {
  const cached = (await get<EdgesCache>(idbKeys.edges)) ?? null
  if (cached && !force) {
    const age = Date.now() - new Date(cached.loadedAt).getTime()
    if (age < cacheMaxAgeMs) {
      const version = await remoteVersion()
      if (version === null || version === cached.version) return { ...cached, stale: false }
    }
  }
  try {
    return { ...(await fetchEdges()), stale: false }
  } catch (error) {
    if (cached) return { ...cached, stale: true }
    throw error
  }
}
