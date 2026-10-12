import { POSITRON_BG, PRIVATE_BG } from './private-raster'

const SHORT_NAME_LENGTH = 10

/** Short label of a background for its button on the map: the year in its name, if it has one. */
export function backgroundShortName(id: string, name: string) {
  if (id === POSITRON_BG) return 'Karte'
  if (id === PRIVATE_BG) return 'Privat'
  const years = name.match(/\b(?:19|20)\d{2}\b/g)
  if (years) return years[years.length - 1]!
  const trimmed = name.trim()
  return trimmed.length > SHORT_NAME_LENGTH
    ? `${trimmed.slice(0, SHORT_NAME_LENGTH - 1).trimEnd()}…`
    : trimmed
}
