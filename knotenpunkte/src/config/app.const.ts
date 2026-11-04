/**
 * KV project of the ratings. `kvApiKey` is a public project selector (`X-Api-Key`), not an
 * admin secret. Values come from the committed `.env` (`VITE_KV_*`).
 */
export const kvProject = import.meta.env.VITE_KV_PROJECT
export const kvApiKey = import.meta.env.VITE_KV_API_KEY

/**
 * Sample files from `knotenpunkte/public/fixtures`, served by the app itself (the repo is
 * private). Absolute, so the router link does not add the basepath a second time.
 */
function fixtureUrl(name: string) {
  return new URL(`${import.meta.env.BASE_URL}fixtures/${name}`, globalThis.location.origin).href
}

export const sampleNodesUrl = fixtureUrl('berlin-nodes-sample.geojson')

export const sampleSuggestionsUrl = fixtureUrl('berlin-suggestions-sample.json')
