import type { FeatureCollection, Point } from 'geojson'
import type { JunctionNodesGeoJSON } from '@/shared/nodes/schema'
import { nodeLngLat } from '@/shared/nodes/schema'
import type { HistoryEntry, RatingRecord } from './schema'

export function buildRatingsFile(dataset: string, records: Record<string, RatingRecord>) {
  return { dataset, records }
}

export function buildAllRatingsFile(datasets: Record<string, Record<string, RatingRecord>>) {
  return {
    datasets: Object.fromEntries(
      Object.entries(datasets).map(([name, records]) => [name, buildRatingsFile(name, records)]),
    ),
  }
}

function correctionSummary(record: RatingRecord) {
  const lastCorrection = [...record.history].reverse().find((entry) => entry.kind === 'corrected')
  if (!lastCorrection) return undefined
  return `${lastCorrection.by} korrigierte Werte von ${originalRater(record, lastCorrection)}`
}

function originalRater(record: RatingRecord, correction: HistoryEntry) {
  const previousSave = [...record.history]
    .reverse()
    .find((entry) => entry.kind === 'save' && entry.at <= correction.at)
  return previousSave?.by ?? record.created_by
}

export function mergeRatingsIntoNodes(
  collection: JunctionNodesGeoJSON,
  records: Record<string, RatingRecord>,
) {
  const features = collection.features.map((feature) => {
    const record = records[feature.properties.id]
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: nodeLngLat(feature),
      },
      properties: {
        ...feature.properties,
        NUMMER: feature.properties.NUMMER ?? feature.properties.id,
        KP_HVS: record?.KP_HVS,
        LSA_KP: record?.LSA_KP,
        Mar_RVF_KP: record?.Mar_RVF_KP,
        Furt_rot: record?.Furt_rot,
        RFS_Mitte: record?.RFS_Mitte,
        Fl_Linksab: record?.Fl_Linksab,
        vorgez_Fl: record?.vorgez_Fl,
        KP_Nichtbetrachten: record?.KP_Nichtbetrachten ?? 0,
        ist_virtuell: record?.ist_virtuell ?? 0,
        'Mapillary-ID': record?.['Mapillary-ID'],
        Kommentar: record?.Kommentar,
        qa: record?.qa ?? 'none',
        status: record?.status ?? 'incomplete',
        correction_summary: record ? correctionSummary(record) : undefined,
        created_by: record?.created_by,
        updated_by: record?.updated_by,
      },
    }
  })
  const geojson: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features,
  }
  return { ...geojson, metadata: collection.metadata }
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportFilename(kind: 'ratings' | 'nodes', dataset: string, date = new Date()) {
  const stamp = date.toISOString().slice(0, 10)
  return `${kind}-${dataset}-${stamp}.json`
}

export function exportGeojsonFilename(dataset: string, date = new Date()) {
  const stamp = date.toISOString().slice(0, 10)
  return `ratings-${dataset}-${stamp}.geojson`
}
