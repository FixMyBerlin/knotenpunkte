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
