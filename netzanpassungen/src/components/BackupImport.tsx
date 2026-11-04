import { Callout } from '@shared/components/ui/callout'
import { Subheading } from '@shared/components/ui/heading'
import { Text } from '@shared/components/ui/text'
import { useOsmAuth } from '@shared/components/use-osm-auth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSuggestionActions } from '@/components/suggestion-store'
import { applyBackup, parseBackupText, type BackupReport } from '@/network/backup'
import { browserStorage } from '@/network/keine-aktion'
import { keineAktionQueryRoot, keineAktionStore } from '@/network/keine-aktion-store'
import { networkStore } from '@/network/store'

const filePickerLabelClassName =
  'relative isolate inline-flex cursor-pointer items-baseline justify-center rounded-lg border border-white/15 px-[calc(--spacing(3)-1px)] py-[calc(--spacing(1.5)-1px)] text-sm/6 font-semibold text-white hover:bg-white/5'

function markings(count: number) {
  return count === 1 ? '1 Markierung' : `${count} Markierungen`
}

function KeineAktionLine({ report }: { report: BackupReport }) {
  if (report.keineAktionUnreadable) {
    return <li>Keine Aktion nötig: nicht lesbar, nichts übernommen</li>
  }
  const result = report.keineAktion
  if (!result) return null
  if (result.error) {
    return (
      <li>
        Keine Aktion nötig: {markings(result.count)} in der Datei, Übertragen fehlgeschlagen (
        {result.error}). Sie bleiben in diesem Browser und werden beim nächsten Start erneut
        übertragen.
      </li>
    )
  }
  if (!result.transferred) {
    return (
      <li>
        Keine Aktion nötig: {markings(result.count)} in der Datei. Sie werden nach der Anmeldung in
        die Datenbank übertragen.
      </li>
    )
  }
  const { written, alreadyThere, ignored } = result.transferred
  return (
    <li>
      Keine Aktion nötig: {written} in die Datenbank übertragen
      {alreadyThere > 0 ? `, ${alreadyThere} waren schon dort` : ''}
      {ignored > 0 ? `, ${ignored} nicht speicherbar` : ''}
    </li>
  )
}

/** Puts the backup file of the old origin back: the shared decisions into the database, the rest into this browser. */
export function BackupImport() {
  const auth = useOsmAuth()
  const queryClient = useQueryClient()
  const { reloadSkipped } = useSuggestionActions()
  const canWrite = networkStore.mode === 'lokal' || auth.authenticated

  const restore = useMutation({
    mutationFn: async (file: File) => {
      const backup = parseBackupText(await file.text())
      return applyBackup(backup, browserStorage(), canWrite ? keineAktionStore : null)
    },
    onSuccess: async () => {
      reloadSkipped()
      await queryClient.invalidateQueries({ queryKey: keineAktionQueryRoot })
    },
  })

  const report = restore.data
  const nothing =
    report && !report.keineAktion && !report.keineAktionUnreadable && report.settings.length === 0

  return (
    <div className="space-y-3">
      <Subheading>Sicherung einspielen</Subheading>
      <Text>
        <code>knotenpunkte-einstellungen.json</code> aus dem Sicherungs-Skript am alten Standort.
        „Keine Aktion nötig“ geht in die Datenbank (mit OSM-Login). Übersprungene Vorschläge,
        Hintergrundkarten und Favoriten kommen in diesen Browser, soweit dort noch nichts gesetzt
        ist.
      </Text>
      <label className={filePickerLabelClassName}>
        {restore.isPending ? 'Spiele ein …' : 'Sicherung wählen'}
        <input
          type="file"
          accept=".json,application/json"
          className="sr-only"
          data-testid="input-backup"
          onChange={(event) => {
            const chosen = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (chosen) restore.mutate(chosen)
          }}
        />
      </label>
      {restore.isError ? (
        <Callout tone="error" title="Sicherung">
          {restore.error.message}
        </Callout>
      ) : null}
      {report ? (
        <Callout tone="info" title="Sicherung eingespielt" data-testid="backup-report">
          {nothing ? (
            'Die Datei enthält nichts zum Einspielen.'
          ) : (
            <ul className="list-inside list-disc">
              <KeineAktionLine report={report} />
              {report.settings.map((item) => (
                <li key={item.key}>
                  {item.label}: {item.status}
                </li>
              ))}
            </ul>
          )}
        </Callout>
      ) : null}
    </div>
  )
}
