import { berlinMapFallback } from '@shared/config/shared.const'
import { parseMapParam, serializeMapParam, type MapParam } from '@shared/map/map-param'
import { z } from 'zod'

export const appSteps = ['gebiet', 'zeichnen', 'uebersicht', 'export'] as const

export type AppStep = (typeof appSteps)[number]

export const appStepLabels: Record<AppStep, string> = {
  gebiet: 'Gebiet',
  zeichnen: 'Zeichnen',
  uebersicht: 'Übersicht',
  export: 'Export',
}

const optionalSearchString = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => (value === undefined ? undefined : String(value)))

const optionalTrimmedSearchString = optionalSearchString.transform((value) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
})

/** Absent or any “on” value stays off the URL. Only an explicit off is stored. */
const onByDefaultSearchFlag = z
  .union([
    z.literal('1'),
    z.literal('true'),
    z.literal('0'),
    z.literal('false'),
    z.literal(1),
    z.literal(0),
    z.boolean(),
  ])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined
    const on = value === true || value === 1 || value === '1' || value === 'true'
    return on ? undefined : false
  })
  .catch(undefined)

export const indexSearchSchema = z.object({
  map: optionalSearchString
    .transform((value) => parseMapParam(value ?? '') ?? berlinMapFallback)
    .transform((value) => serializeMapParam(value)),
  gebiet: optionalTrimmedSearchString,
  step: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => (appSteps.includes(value as AppStep) ? (value as AppStep) : undefined)),
  /** Selected node (`k:…`, `v:…`) or edge (`ren:…`, `detailnetz:…`, `neu:…`). */
  sel: optionalTrimmedSearchString,
  bg: optionalTrimmedSearchString,
  streets: onByDefaultSearchFlag,
  photos: onByDefaultSearchFlag,
  photoColor: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => (value === 'type' ? ('type' as const) : undefined)),
})

/** The database page keeps the search of the map page; `q` is its own search text. */
export const dataSearchSchema = indexSearchSchema.extend({
  q: optionalTrimmedSearchString,
})

export type IndexSearch = z.infer<typeof indexSearchSchema>
export type DataSearch = z.infer<typeof dataSearchSchema>

export function searchMapParam(search: Pick<IndexSearch, 'map'>): MapParam {
  return parseMapParam(search.map) ?? berlinMapFallback
}

export function resolveStep(search: Partial<Pick<IndexSearch, 'step' | 'gebiet'>>): AppStep {
  if (search.step) return search.step
  return search.gebiet ? 'zeichnen' : 'gebiet'
}
