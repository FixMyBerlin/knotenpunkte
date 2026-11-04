import { kvErrorFromResponse } from '@shared/kv-client/errors'

export type KvBatchOptions = {
  baseUrl: string
  project: string
  apiKey: string
  getOsmToken: () => string | null | Promise<string | null>
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export type KvBatchPut = { id: string; data: unknown; tags: string[] }

/**
 * `POST /v1/projects/{slug}/batch` with up to 25 puts, atomic and without `If-Match`. The shared
 * client has no batch call yet.
 */
export async function kvBatchPut(
  options: KvBatchOptions,
  puts: KvBatchPut[],
  fetchImpl: FetchLike = fetch,
) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-Api-Key': options.apiKey,
  })
  const token = await options.getOsmToken()
  if (token != null) headers.set('Authorization', `Bearer ${token}`)
  const url = `${options.baseUrl.replace(/\/+$/, '')}/v1/projects/${encodeURIComponent(options.project)}/batch`
  const response = await fetchImpl(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ put: puts }),
  })
  if (!response.ok) throw await kvErrorFromResponse(response)
}
