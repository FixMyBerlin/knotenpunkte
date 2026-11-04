export const appTitle = 'Fortschritt'

/** Edges of the mapping network with `lfd_nr`, `laenge_m`, `bezirk` and `account`. */
export const edgesGeojsonUrl =
  'https://tilda-geo.de/api/uploads/infravelo-ren-netz-zuteilung-netz.geojson'
export const edgesPmtilesUrl =
  'https://tilda-geo.de/api/uploads/infravelo-ren-netz-zuteilung-netz.pmtiles'
export const gebietePmtilesUrl =
  'https://tilda-geo.de/api/uploads/infravelo-ren-netz-zuteilung-gebiete.pmtiles'
/** Both PMTiles have one source layer, read from their metadata. */
export const pmtilesSourceLayer = 'default'
export const tildaAttribution = 'Zuteilung REN+: FixMyCity / TILDA'

/**
 * Done marks of the mapping editor. `kvApiKey` is the public read key of the project (the same
 * one ships in the iD editor), not an admin secret. The project only answers allowed origins.
 */
export const kvBaseUrl = 'https://key-value-store.fixmycity.workers.dev'
export const kvProject = 'infravelo-tracker'
export const kvApiKey = 'kv_b11a83b26cb009abb622f111fdfb2ebef171c7d9'

/** Cached data is loaded again automatically when it is older than this. */
export const cacheMaxAgeMs = 24 * 60 * 60 * 1000

/** IndexedDB keys of this app. */
export const idbKeys = { edges: 'fp:edges', progress: 'fp:progress' } as const
