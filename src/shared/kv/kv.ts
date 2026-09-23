import { kvApiKey, kvBaseUrl, kvProject } from '@/config/app.const'
import { createKvClient } from '@/shared/kv-client'
import { getOsmToken } from '@/shared/osm/osm-auth'
import type { RatingRecord } from '@/shared/ratings/schema'

/** Shared Worker client. Reads send Origin + X-Api-Key; writes add OSM Bearer. */
export const kv = createKvClient<RatingRecord>({
  baseUrl: kvBaseUrl,
  project: kvProject,
  apiKey: kvApiKey,
  getOsmToken,
})
