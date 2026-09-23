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

export const appViews = ['work', 'overview'] as const
export type AppView = (typeof appViews)[number]

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
      value === 'dataset' || value === 'work' || value === 'export' ? value : undefined,
    ),
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

export function resolveView(search: Pick<IndexSearch, 'view' | 'step'>): AppView {
  if (search.view) return search.view
  if (search.step === 'work') return 'work'
  return 'work'
}

export function resolveStatusFilter(search: Pick<IndexSearch, 'status' | 'view' | 'step'>) {
  if (search.status) return search.status
  if (resolveView(search) === 'work') return 'unrated' as const
  return 'all' as const
}
