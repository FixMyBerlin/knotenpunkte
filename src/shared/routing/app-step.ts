import type { JunctionNodesGeoJSON } from '@/shared/nodes/schema'
import { ratingProgress } from '@/shared/ratings/completeness'
import type { RatingRecord } from '@/shared/ratings/schema'

export const appSteps = ['dataset', 'work', 'export'] as const

export type AppStep = (typeof appSteps)[number]

export const appStepLabels: Record<AppStep, { label: string }> = {
  dataset: { label: 'Datensatz' },
  work: { label: 'Bewerten' },
  export: { label: 'Export' },
}

export function resolveStep(search: { step?: AppStep; dataset?: string }) {
  if (search.step) return search.step
  if (search.dataset) return 'work'
  return 'dataset'
}

type StepDescriptionArgs = {
  step: AppStep
  dataset?: string
  nodes?: JunctionNodesGeoJSON
  records?: Record<string, RatingRecord>
  remoteCount?: number
}

function ratingLabel(count: number) {
  return count === 1 ? '1 Bewertung' : `${count} Bewertungen`
}

export function stepDescription({
  step,
  dataset,
  nodes,
  records = {},
  remoteCount = 0,
}: StepDescriptionArgs) {
  switch (step) {
    case 'dataset':
      return dataset || 'Kein Datensatz'
    case 'work':
      if (nodes) {
        const { rated, total } = ratingProgress(
          records,
          nodes.features.map((f) => f.properties.id),
        )
        return `${rated}/${total} Knoten`
      }
      if (dataset && remoteCount > 0) return `${remoteCount} in der Datenbank`
      return 'Keine Knoten'
    case 'export':
      if (dataset) return ratingLabel(Object.keys(records).length)
      return 'Kein Datensatz'
  }
}

type StepStatusArgs = {
  step: AppStep
  current?: AppStep
  dataset?: string
}

export function stepStatus({ step, current, dataset }: StepStatusArgs) {
  if (current && step === current) return 'current'
  if (step === 'dataset') return dataset ? 'complete' : 'upcoming'
  return 'upcoming'
}
