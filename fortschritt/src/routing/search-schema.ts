import { berlinMapFallback } from '@shared/config/shared.const'
import { parseMapParam, serializeMapParam, type MapParam } from '@shared/map/map-param'
import { z } from 'zod'

export const appViews = ['ueberblick', 'personen', 'karte'] as const
export type AppView = (typeof appViews)[number]

export const appViewLabels: Record<AppView, string> = {
  ueberblick: 'Überblick',
  personen: 'Personen',
  karte: 'Karte',
}

const optionalString = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    const trimmed = value === undefined ? '' : String(value).trim()
    return trimmed ? trimmed : undefined
  })

function oneOf<const T extends readonly string[]>(values: T) {
  return optionalString.transform((value) =>
    values.includes(value as T[number]) ? (value as T[number]) : undefined,
  )
}

/** Berlin as a whole, a bit further out than the default of the other apps. */
const fortschrittMapFallback = { ...berlinMapFallback, zoom: 10.2, lat: 52.505, lng: 13.41 }

export const indexSearchSchema = z.object({
  /** Absent is the Überblick. */
  view: oneOf(['personen', 'karte'] as const),
  /**
   * Umfang of the burn-up and of Personen: `gesamt` or a delivery number; absent is the
   * running delivery.
   */
  umfang: optionalString,
  /** y axis of the burn-up; absent is km. */
  unit: oneOf(['prozent'] as const),
  /** Camera of the map; absent is all of Berlin. */
  map: optionalString.transform((value) => {
    const parsed = parseMapParam(value ?? '')
    return parsed ? serializeMapParam(parsed) : undefined
  }),
  bg: optionalString,
  /** The street network is off unless `streets=1`. */
  streets: z
    .union([z.literal('1'), z.literal(1), z.literal(true), z.literal('true')])
    .optional()
    .transform((value) => (value === undefined ? undefined : true))
    .catch(undefined),
  lieferung: optionalString,
  bezirk: optionalString,
  account: optionalString,
})

export type IndexSearch = z.infer<typeof indexSearchSchema>

export function resolveView(search: Pick<IndexSearch, 'view'>): AppView {
  return search.view ?? 'ueberblick'
}

export function searchMapParam(search: Pick<IndexSearch, 'map'>): MapParam {
  return parseMapParam(search.map ?? '') ?? fortschrittMapFallback
}
