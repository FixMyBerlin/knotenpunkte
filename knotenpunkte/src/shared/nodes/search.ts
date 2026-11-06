/** Lower case, no spaces, every dash (also the Unicode hyphen of the result file) as `-`. */
function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[‐-―−]/g, '-')
}

/**
 * Node ids that contain `query`: exact match first, then ids that start with it, then the rest,
 * each in the given order. An empty query matches nothing.
 */
export function searchNodeIds(ids: readonly string[], query: string) {
  const needle = normalize(query)
  if (!needle) return []
  const exact: string[] = []
  const prefix: string[] = []
  const inside: string[] = []
  for (const id of ids) {
    const value = normalize(id)
    if (value === needle) exact.push(id)
    else if (value.startsWith(needle)) prefix.push(id)
    else if (value.includes(needle)) inside.push(id)
  }
  return [...exact, ...prefix, ...inside]
}
