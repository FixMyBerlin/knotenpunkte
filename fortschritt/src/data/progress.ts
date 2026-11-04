import { createKvClient, KvError } from '@shared/kv-client'
import { get, set } from 'idb-keyval'
import { cacheMaxAgeMs, idbKeys, kvApiKey, kvBaseUrl, kvProject } from '@/config/app.const'
import type { MarkRecord } from '@/stats/model'

export type ProgressCache = {
  loadedAt: string
  marks: MarkRecord[]
}

/** Read only, without login. */
const kv = createKvClient<unknown>({
  baseUrl: kvBaseUrl,
  project: kvProject,
  apiKey: kvApiKey,
  getOsmToken: () => null,
})

function isDone(data: unknown) {
  return typeof data === 'object' && data !== null && 'done' in data && data.done === true
}

async function fetchAllMarks() {
  const marks: MarkRecord[] = []
  let cursor: string | undefined
  do {
    const page = await kv.list({ limit: 500, cursor })
    for (const item of page.items) {
      if (!isDone(item.data)) continue
      marks.push({
        id: item.id,
        createdAt: item.created_at,
        createdBy: item.created_by.display_name,
      })
    }
    cursor = page.next_cursor ?? undefined
  } while (cursor)
  return marks
}

/** German text for a failed load of the KV db. */
function progressErrorText(error: unknown) {
  if (error instanceof KvError) {
    if (error.status === 403) {
      return `Die key-value-db lehnt diese Adresse ab (403). Der Origin ${window.location.origin} muss im Projekt „${kvProject}“ erlaubt werden.`
    }
    return `Die key-value-db antwortet mit einem Fehler (${error.status}): ${error.message}`
  }
  return `Die key-value-db ist nicht erreichbar. Entweder fehlt die Verbindung, oder der Origin ${window.location.origin} ist im Projekt „${kvProject}“ nicht erlaubt.`
}

/** All done marks, from the cache when it is younger than a day, else from the KV db. */
export async function loadProgress(
  force = false,
): Promise<ProgressCache & { error: string | null }> {
  const cached = (await get<ProgressCache>(idbKeys.progress)) ?? null
  if (cached && !force) {
    const age = Date.now() - new Date(cached.loadedAt).getTime()
    if (age < cacheMaxAgeMs) return { ...cached, error: null }
  }
  try {
    const cache: ProgressCache = {
      loadedAt: new Date().toISOString(),
      marks: await fetchAllMarks(),
    }
    await set(idbKeys.progress, cache)
    return { ...cache, error: null }
  } catch (error) {
    if (cached) return { ...cached, error: progressErrorText(error) }
    throw new Error(progressErrorText(error), { cause: error })
  }
}
