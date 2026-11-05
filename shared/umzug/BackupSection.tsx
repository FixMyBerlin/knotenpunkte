import { Button } from '@shared/components/ui/button'
import { Strong, Text } from '@shared/components/ui/text'
import { downloadJson } from '@shared/download'
import { useState } from 'react'
import { backupFileName, buildBackupFile } from './backup-file'

/** Explains the move and downloads the settings of this browser as `knotenpunkte-einstellungen.json`. */
export function BackupSection() {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle')

  function download() {
    try {
      downloadJson(backupFileName, buildBackupFile(localStorage, window.location.origin))
      setState('done')
    } catch {
      setState('failed')
    }
  }

  return (
    <section className="space-y-3" data-testid="umzug-backup">
      <h3 className="text-sm/6 font-semibold text-white">Einstellungen sichern</h3>
      <Text>
        Die Apps ziehen an eine neue Adresse um. Deine Einstellungen (Hintergründe, auch private,
        Favoriten, übersprungene Vorschläge) ziehen nicht mit. Lade sie herunter und spiele die
        Datei am neuen Ort in Netzanpassungen im Schritt „Gebiet“ unter „Sicherung einspielen“ ein.
      </Text>
      <Text>
        <Strong>Die Datei enthält private Hintergrund-URLs mit Schlüsseln.</Strong> Sie bleibt auf
        diesem Computer.
      </Text>
      <Button type="button" color="sky" onClick={download} data-testid="umzug-download">
        Einstellungen herunterladen
      </Button>
      {state === 'done' ? (
        <Text role="status">Heruntergeladen: {backupFileName}</Text>
      ) : state === 'failed' ? (
        <Text role="alert">Der Browser erlaubt keinen Zugriff auf die Einstellungen.</Text>
      ) : null}
    </section>
  )
}
