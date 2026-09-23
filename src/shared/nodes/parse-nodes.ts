import { nodesCollectionSchema, nodeIdFromProperties, type JunctionNodesGeoJSON } from './schema'

export function parseNodesText(
  text: string,
  dataset: string,
): { collection: JunctionNodesGeoJSON } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.')
  }
  if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
    throw new Error('Erwarte eine GeoJSON-FeatureCollection.')
  }
  const raw = parsed as { type?: unknown; features?: unknown; metadata?: unknown }
  if (raw.type !== 'FeatureCollection' || !Array.isArray(raw.features)) {
    throw new Error('Erwarte eine GeoJSON-FeatureCollection von Punkten.')
  }

  const features = []
  for (const [index, feature] of raw.features.entries()) {
    if (!feature || typeof feature !== 'object') {
      throw new Error(`Feature ${index + 1} ist ungültig.`)
    }
    const candidate = feature as {
      type?: unknown
      geometry?: { type?: unknown } | null
      properties?: Record<string, unknown> | null
    }
    if (candidate.type !== 'Feature') {
      throw new Error(`Feature ${index + 1} ist kein GeoJSON-Feature.`)
    }
    if (candidate.geometry == null) continue
    const geometryType = candidate.geometry.type
    if (geometryType !== 'Point' && geometryType !== 'MultiPoint') {
      throw new Error(`Feature ${index + 1}: nur Point oder MultiPoint sind erlaubt.`)
    }
    const id = nodeIdFromProperties(candidate.properties)
    if (!id) {
      throw new Error(
        `Feature ${index + 1}: ID fehlt. Erwarte NUMMER oder Knotenpunkt-ID (auch mit Unicode-Bindestrich).`,
      )
    }
    features.push({
      ...candidate,
      properties: { ...candidate.properties, id },
    })
  }

  if (features.length === 0) {
    throw new Error('Keine Punkt-Features mit ID gefunden.')
  }

  const collection = nodesCollectionSchema.parse({
    type: 'FeatureCollection',
    metadata: {
      ...(typeof raw.metadata === 'object' && raw.metadata ? raw.metadata : {}),
      dataset,
    },
    features,
  })
  return { collection: collection as JunctionNodesGeoJSON }
}
