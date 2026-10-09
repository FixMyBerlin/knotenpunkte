const STORAGE_KEY = 'knotenpunkte-private-raster-url'
const BACKGROUND_STORAGE_KEY = 'knotenpunkte-background'

export function readPrivateRasterUrl() {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(STORAGE_KEY) ?? ''
}

export function writePrivateRasterUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, trimmed)
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

export const POSITRON_BG = 'positron'
export const PRIVATE_BG = 'private'

export type BackgroundChoice = ReturnType<typeof resolveBackgroundChoice>

export function resolveBackgroundChoice(bg: string | undefined, privateUrl: string) {
  if (bg === POSITRON_BG) return { kind: 'positron' as const }
  if (bg === PRIVATE_BG) {
    return privateUrl
      ? { kind: 'private' as const, url: privateUrl }
      : { kind: 'positron' as const }
  }
  if (bg) return { kind: 'eli' as const, id: bg }
  if (privateUrl) return { kind: 'private' as const, url: privateUrl }
  return { kind: 'positron' as const }
}
