import { del, get, keys, set } from 'idb-keyval'
import { INPUT_SCHEMA, type InputFile } from './input-schema'
import { buildBaseNetwork } from './model'

const dataPrefix = 'na:data:'

export type StoredInput = {
  gebiet: string
  importedAt: string
  file: InputFile
}

/** The input file of an area, in this browser only. It was checked on import. */
export async function saveInput(gebiet: string, file: InputFile) {
  const stored: StoredInput = { gebiet, importedAt: new Date().toISOString(), file }
  await set(`${dataPrefix}${gebiet}`, stored)
  return stored
}

async function loadInput(gebiet: string): Promise<StoredInput | null> {
  const stored = (await get(`${dataPrefix}${gebiet}`)) as StoredInput | undefined
  return stored?.file.schema === INPUT_SCHEMA ? stored : null
}

export async function deleteInput(gebiet: string) {
  await del(`${dataPrefix}${gebiet}`)
}

export async function listInputs() {
  const all = await keys()
  return all
    .filter((key): key is string => typeof key === 'string' && key.startsWith(dataPrefix))
    .map((key) => key.slice(dataPrefix.length))
    .sort((a, b) => a.localeCompare(b))
}

/** The input file and its network index; built once per area and kept. */
export async function loadBaseNetwork(gebiet: string) {
  const stored = await loadInput(gebiet)
  if (!stored) return null
  return { stored, base: buildBaseNetwork(stored.file) }
}

export const baseNetworkQueryKey = (gebiet: string) => ['na-base', gebiet] as const
export const inputsQueryKey = ['na-inputs'] as const
