const STORAGE_KEY = 'knotenpunkte-private-raster-url'

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

/** Host and path, without a leading `https://www.` (or `http://`). */
export function privateRasterDisplayName(url: string) {
  return url.trim().replace(/^https?:\/\/(?:www\.)?/i, '')
}

export function isPrivateRasterTemplate(url: string) {
  return url.includes('{z}') && url.includes('{x}') && url.includes('{y}')
}

export const POSITRON_BG = 'positron'
export const PRIVATE_BG = 'private'

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
