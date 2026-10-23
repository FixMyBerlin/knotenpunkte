/** `Mapillary-ID` and `Quelle` hold several values in one text field, separated by `;`. */
export function splitList(value: string | undefined) {
  return (value ?? '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function addToList(value: string | undefined, item: string) {
  const items = splitList(value)
  return items.includes(item) ? items.join(';') : [...items, item].join(';')
}

export function removeFromList(value: string | undefined, item: string) {
  return splitList(value)
    .filter((entry) => entry !== item)
    .join(';')
}
