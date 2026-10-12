const datasetNamePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Names with a meaning of their own: the cache key of all ratings and the tag of project entries. */
const reservedDatasetNames = ['all', 'kp-project-meta']

export function isValidDatasetName(value: string) {
  return (
    value.length >= 3 &&
    value.length <= 60 &&
    datasetNamePattern.test(value) &&
    !reservedDatasetNames.includes(value)
  )
}

export function slugifyDatasetName(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
  return slug || 'dataset'
}
