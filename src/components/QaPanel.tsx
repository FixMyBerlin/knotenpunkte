import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Text } from '@/components/ui/text'
import { canRunQa } from '@/shared/qa/qa'
import type { RatingRecord } from '@/shared/ratings/schema'

type Props = {
  record: RatingRecord
  displayName: string | undefined
  onConfirm: () => void
  onMarkProblematic: () => void
  correcting: boolean
}

export function QaPanel({ record, displayName, onConfirm, onMarkProblematic, correcting }: Props) {
  const allowed = canRunQa({ displayName, createdBy: record.created_by })
  const lastCorrection = [...record.history].reverse().find((entry) => entry.kind === 'corrected')
  const lastSave = [...record.history].reverse().find((entry) => entry.kind === 'save')

  return (
    <section data-testid="qa-panel" className="space-y-2">
      <Text>
        {record.created_by} hat die Werte gesetzt
        {lastCorrection
          ? `; ${lastCorrection.by} hat sie als problematisch markiert und korrigiert`
          : lastSave
            ? ` (${lastSave.at.slice(0, 10)})`
            : ''}
        .
      </Text>
      {!allowed ? (
        <Callout title="QA gesperrt">
          Die ursprüngliche Bewerterin oder der Bewerter kann die eigene Zeile nicht prüfen. Namen
          in der Admin-Liste dürfen es.
        </Callout>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          color="green"
          data-testid="qa-confirm"
          disabled={!allowed || record.qa === 'confirmed'}
          onClick={onConfirm}
        >
          Bestätigen
        </Button>
        <Button
          type="button"
          color="amber"
          data-testid="qa-problematic"
          disabled={!allowed}
          onClick={onMarkProblematic}
        >
          Problematisch
        </Button>
      </div>
      {correcting ? (
        <Callout tone="warning" title="Korrektur">
          Vollmaske ausfüllen und absenden, damit die Korrektur in die Historie geschrieben wird.
        </Callout>
      ) : null}
      {record.history.length > 0 ? (
        <ol className="space-y-1 text-xs text-zinc-400" data-testid="rating-history">
          {record.history.map((entry) => (
            <li key={`${entry.at}-${entry.kind}-${entry.by}`}>
              {entry.at.slice(0, 19)} · {entry.by} · {entry.kind}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
}
