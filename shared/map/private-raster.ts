const LEGACY_URL_STORAGE_KEY = 'knotenpunkte-private-raster-url'
const STORAGE_KEY = 'knotenpunkte-private-rasters'
const BACKGROUND_STORAGE_KEY = 'knotenpunkte-background'

export const POSITRON_BG = 'positron'
/** Id of the first private background (the only one before there could be several). */
const PRIVATE_BG = 'private'
const PRIVATE_BG_PREFIX = 'private-'

/**
 * A raster background the user added in this browser. The URL often carries an API key, so it
 * stays in localStorage and never goes into the page URL.
 */
export type PrivateRaster = { id: string; title: string; url: string }

export function isPrivateBackgroundId(id: string) {
  return id === PRIVATE_BG || id.startsWith(PRIVATE_BG_PREFIX)
}

export function newPrivateRasterId(existing: PrivateRaster[]) {
  if (existing.length === 0) return PRIVATE_BG
  let id = ''
  do {
    id = `${PRIVATE_BG_PREFIX}${Math.random().toString(36).slice(2, 8)}`
  } while (existing.some((raster) => raster.id === id))
  return id
}

function isPrivateRaster(value: unknown): value is PrivateRaster {
  if (typeof value !== 'object' || value === null) return false
  const { id, title, url } = value as Record<string, unknown>
  return typeof id === 'string' && typeof title === 'string' && typeof url === 'string'
}

export function readPrivateRasters(): PrivateRaster[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (Array.isArray(stored)) return stored.filter(isPrivateRaster)
  } catch {
    // Unreadable list: fall through to the single URL of older versions.
  }
  const legacyUrl = localStorage.getItem(LEGACY_URL_STORAGE_KEY)?.trim()
  return legacyUrl
    ? [{ id: PRIVATE_BG, title: privateRasterDisplayName(legacyUrl), url: legacyUrl }]
    : []
}

export function writePrivateRasters(rasters: PrivateRaster[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rasters))
  localStorage.removeItem(LEGACY_URL_STORAGE_KEY)
}

/** Last background the user picked: `positron`, `private` or an ELI id. Empty when none. */
export function readBackgroundChoice() {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(BACKGROUND_STORAGE_KEY) ?? ''
}

export function writeBackgroundChoice(choice: string) {
  localStorage.setItem(BACKGROUND_STORAGE_KEY, choice)
}

/** Host and path, without a leading `https://www.` (or `http://`). */
export function privateRasterDisplayName(url: string) {
  return url.trim().replace(/^https?:\/\/(?:www\.)?/i, '')
}

/** German message describing why `url` is no usable tile template, or `null` when it is fine. */
export function privateRasterUrlError(url: string) {
  if (!/^https?:\/\//i.test(url)) return 'Die URL muss mit https:// beginnen.'
  const missing = ['{z}', '{x}', '{y}'].filter((placeholder) => !url.includes(placeholder))
  if (missing.length > 0) {
    return `Es fehlt ${missing.join(', ')} – erwartet wird z. B. https://…/{z}/{x}/{y}.png`
  }
  return null
}

export type BackgroundChoice = ReturnType<typeof resolveBackgroundChoice>

export function resolveBackgroundChoice(bg: string | undefined, rasters: PrivateRaster[]) {
  const privateChoice = (raster: PrivateRaster) => ({ kind: 'private' as const, ...raster })
  if (bg === POSITRON_BG) return { kind: 'positron' as const }
  if (bg && isPrivateBackgroundId(bg)) {
    const raster = rasters.find((item) => item.id === bg)
    return raster ? privateChoice(raster) : { kind: 'positron' as const }
  }
  if (bg) return { kind: 'eli' as const, id: bg }
  // Without a choice a private background is the default, as it is usually the best imagery.
  return rasters[0] ? privateChoice(rasters[0]) : { kind: 'positron' as const }
}

/** The id that a background has in the list, the favourites and the stored choice. */
export function backgroundChoiceId(background: BackgroundChoice) {
  return background.kind === 'positron' ? POSITRON_BG : background.id
}
