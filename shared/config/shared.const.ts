import type { Infra3dProject } from '@osm-editor-kit/street-imagery'

export const OSM_OAUTH_LAND_FILENAME = 'osm-oauth-land.html'
export const OSM_AUTH_RETURN_URL_KEY = '__osmAuthReturnUrl'

/**
 * Non-confidential OSM OAuth 2 app of Knotenpunkte, also used by Netzanpassungen.
 * Redirect URIs that must be registered on the OSM app before login works:
 * - `http://127.0.0.1:33479/osm-oauth-land.html`
 * - `https://fixmyberlin.github.io/knotenpunkte/osm-oauth-land.html`
 * - `http://127.0.0.1:33480/osm-oauth-land.html` (Netzanpassungen)
 * - `https://fixmyberlin.github.io/knotenpunkte/netzanpassungen/osm-oauth-land.html`
 * Scope: `read_prefs`. Public client id only, never a client secret.
 */
export const osmClientId = 'mV4q3_OPMrW4kCfnPON30BRxAoKZPX0ZLxh8EjmHP-o'

export function isOsmLoginConfigured() {
  return osmClientId.length > 0
}

/** Production key-value Worker, from each app's committed `.env` (`VITE_KV_BASE_URL`). */
export const kvBaseUrl = import.meta.env.VITE_KV_BASE_URL

export const berlinMapFallback = { zoom: 14.6, lat: 52.5076, lng: 13.3115 } as const

export const streetsPmtilesUrl =
  'https://tilda-geo.de/api/uploads/strassennetz-berlin-strassenabschnitte.pmtiles'

export const streetsAttribution =
  'Geoportal Berlin / Detailnetz Berlin Straßenabschnitte, DL-DE/BY-2.0'

/**
 * Public Mapillary client token (it ships in the bundle anyway).
 * Registered in the FMC `radinfra` Mapillary account:
 * https://www.mapillary.com/dashboard/developers
 */
export const mapillaryToken = 'MLY|24010869485212176|7dd87f9f30ce7c88bd3967d95eca15ae'

/**
 * Cut-off day: by default only photos from this day on are shown and suggested, because a
 * junction may have been rebuilt since. The date filter on the map can widen it. Berlin needs a
 * date filter; without one the map loads hundreds of thousands of photos.
 */
export const mapillaryCutoffDate = '2024-01-01'

/**
 * infra3D street-level imagery of Berlin (same project as TILDA). infra3D has no public API, so
 * it is a link only; people without an infra3D account land on its login page.
 */
export const infra3dProjects: Infra3dProject[] = [
  {
    uid: 'ec2428b7-8e49-4d93-80a0-edfec6da1cf3',
    label: 'infra3D Berlin',
    bbox: [13.08, 52.33, 13.77, 52.68],
  },
]
