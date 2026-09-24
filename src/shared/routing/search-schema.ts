import { z } from 'zod'
import { berlinMapFallback } from '@/config/app.const'
import { parseMapParam, serializeMapParam, type MapParam } from '@/shared/map/map-param'
import { statusFilters } from '@/shared/ratings/queue'

const mapParamFallback: MapParam = berlinMapFallback

const optionalSearchString = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => (value === undefined ? undefined : String(value)))

const optionalTrimmedSearchString = optionalSearchString.transform((value) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
})

/** Absent or any “on” value stays off the URL. Only an explicit off is stored. */
const streetsSearchFlag = z
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
    .transform((value) => parseMapParam(value ?? '') ?? mapParamFallback)
    .transform((value) => serializeMapParam(value)),
  dataset: optionalTrimmedSearchString,
  node: optionalTrimmedSearchString,
  bg: optionalTrimmedSearchString,
  view: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => (value === 'work' || value === 'overview' ? value : undefined)),
  status: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) =>
      statusFilters.includes(value as (typeof statusFilters)[number])
        ? (value as (typeof statusFilters)[number])
        : undefined,
    ),
  step: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) =>
      value === 'dataset' || value === 'work' || value === 'overview' || value === 'export'
        ? value
        : undefined,
    ),
  streets: streetsSearchFlag,
})

export const dataSearchSchema = z.object({
  dataset: optionalTrimmedSearchString,
  node: optionalTrimmedSearchString,
  q: optionalTrimmedSearchString,
})

export type IndexSearch = z.infer<typeof indexSearchSchema>
export type DataSearch = z.infer<typeof dataSearchSchema>

export function searchMapParam(search: Pick<IndexSearch, 'map'>) {
  return parseMapParam(search.map) ?? mapParamFallback
}

export function serializeIndexSearchMap(map: MapParam) {
  return serializeMapParam(map)
}

export function resolveStreetsOn(search: Pick<IndexSearch, 'streets'>) {
  return search.streets !== false
}

export function resolveStatusFilter(search: Pick<IndexSearch, 'status' | 'step'>) {
  if (search.status) return search.status
  if (search.step === 'overview') return 'all' as const
  return 'unrated' as const
}
