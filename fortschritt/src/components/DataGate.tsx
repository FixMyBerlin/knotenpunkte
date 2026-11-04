import { Callout } from '@shared/components/ui/callout'
import type { ReactNode } from 'react'
import { useDataset } from '@/data/use-data'
import type { Dataset } from '@/stats/model'

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

/** Loading and error states; the children get the dataset once both sources are there. */
export function DataGate({ children }: { children: (dataset: Dataset) => ReactNode }) {
  const { dataset, edges, progress } = useDataset()
  if (dataset) return children(dataset)

  const errors = [
    edges.error ? `Netz: ${errorText(edges.error)}` : null,
    progress.error ? errorText(progress.error) : null,
  ].filter((text) => text !== null)

  return (
    <div className="mx-auto max-w-xl p-6">
      {errors.length > 0 ? (
        <Callout tone="error" title="Daten nicht geladen" data-testid="data-error">
          {errors.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </Callout>
      ) : (
        <p className="text-sm text-zinc-400" data-testid="data-loading">
          Lade Netz und Erledigt-Markierungen …
        </p>
      )}
    </div>
  )
}
