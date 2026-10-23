/**
 * KV project of the ratings. `kvApiKey` is a public project selector (`X-Api-Key`), not an
 * admin secret. Values come from the committed `.env` (`VITE_KV_*`).
 */
export const kvProject = import.meta.env.VITE_KV_PROJECT
export const kvApiKey = import.meta.env.VITE_KV_API_KEY

export const sampleNodesGithubUrl =
  'https://github.com/FixMyBerlin/knotenpunkte/raw/main/public/fixtures/berlin-nodes-sample.geojson'

export const sampleSuggestionsGithubUrl =
  'https://github.com/FixMyBerlin/knotenpunkte/raw/main/public/fixtures/berlin-suggestions-sample.json'
