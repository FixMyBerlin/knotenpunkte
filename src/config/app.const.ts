import type { Infra3dProject } from '@osm-editor-kit/street-imagery'

export const OSM_OAUTH_LAND_FILENAME = 'osm-oauth-land.html'
export const OSM_AUTH_RETURN_URL_KEY = '__osmAuthReturnUrl'

/**
 * Non-confidential OSM OAuth 2 app (shared with Parkraum-Zählung for now).
 * Redirect URIs that must be registered on the OSM app before login works:
 * - `http://127.0.0.1:33479/osm-oauth-land.html`
 * - `https://fixmyberlin.github.io/knotenpunkte/osm-oauth-land.html`
 * Scope: `read_prefs`. Public client id only, never a client secret.
 */
export const osmClientId = 'j4p1-aU0G5a8JiWPMlTBaZhGMN-N-RHTEuO2qdSdyh8'

/**
 * Production key-value Worker. `kvApiKey` is a public project selector (`X-Api-Key`),
 * not an admin secret. Values come from the committed `.env` (`VITE_KV_*`).
 */
export const kvBaseUrl = import.meta.env.VITE_KV_BASE_URL
export const kvProject = import.meta.env.VITE_KV_PROJECT
export const kvApiKey = import.meta.env.VITE_KV_API_KEY

export const sampleNodesGithubUrl =
  'https://github.com/FixMyBerlin/knotenpunkte/raw/main/public/fixtures/berlin-nodes-sample.geojson'

export const sampleSuggestionsGithubUrl =
  'https://github.com/FixMyBerlin/knotenpunkte/raw/main/public/fixtures/berlin-suggestions-sample.json'

export const berlinMapFallback = { zoom: 14.6, lat: 52.5076, lng: 13.3115 } as const

export const streetsPmtilesUrl =
  'https://tilda-geo.de/api/uploads/strassennetz-berlin-strassenabschnitte.pmtiles'

export const streetsAttribution =
  'Geoportal Berlin / Detailnetz Berlin Straßenabschnitte, DL-DE/BY-2.0'

export function isOsmLoginConfigured() {
  return osmClientId.length > 0
}

/**
 * Public Mapillary client token (it ships in the bundle anyway).
 * TODO: this is iD's token; register a Mapillary app for Knotenpunkte and replace it.
 */
export const mapillaryToken = 'MLY|4100327730013843|5bb78b81720791946a9a7b956c57b7cf'

/**
 * Detected objects (traffic lights, markings) that Mapillary last saw before this day do not
 * count: the junction may have been rebuilt since.
 */
export const mapillaryFeaturesSeenFrom = '2024-01-01'

/** Photos older than this are not shown or suggested. Berlin needs a date filter. */
export const mapillaryMaxAgeYears = 2

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
