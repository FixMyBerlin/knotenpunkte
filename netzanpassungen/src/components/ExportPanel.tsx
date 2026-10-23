import { Button } from '@shared/components/ui/button'
import { Callout } from '@shared/components/ui/callout'
import { Subheading } from '@shared/components/ui/heading'
import { Text } from '@shared/components/ui/text'
import { downloadJson } from '@shared/download'
import { useNetwork } from '@/components/use-netz'
import {
  entriesFile,
  exportFilename,
  newEdgesGeojson,
  splitEdgesGeojson,
  virtualNodesGeojson,
} from '@/network/export'
import { Route } from '@/routes/index'

export function ExportPanel() {
  const { gebiet } = Route.useSearch()
  const { network, entries, unreadable, issues } = useNetwork(gebiet)
  if (!network || !gebiet) return <Text>Lade Netz …</Text>
  const errors = issues.filter((issue) => issue.level === 'fehler')

  const exports = [
    {
      title: 'Virtuelle Knoten',
      text: 'GeoJSON (Punkte) mit Knotenpunkt-ID, ist_virtuell, Trägerkante und Station. Zum Anhängen an data/Virtuelle-Knotenpunkte.gpkg.',
      run: () =>
        downloadJson(
          exportFilename('virtuelle-knoten', gebiet, 'geojson'),
          virtualNodesGeojson(network),
        ),
    },
    {
      title: 'Neue Kanten',
      text: 'GeoJSON (Linien) mit element_nr, von_knoten, bis_knoten, Länge, Straße, Radfernweg. Kanten mit virtuellen Knoten darauf kommen in Teilen.',
      run: () =>
        downloadJson(exportFilename('neue-kanten', gebiet, 'geojson'), newEdgesGeojson(network)),
    },
    {
      title: 'Geteilte Kanten',
      text: 'GeoJSON der REN+- und Detailnetzkanten, an den neuen virtuellen Knoten geteilt, mit ursprung_element_nr.',
      run: () =>
        downloadJson(
          exportFilename('geteilte-kanten', gebiet, 'geojson'),
          splitEdgesGeojson(network),
        ),
    },
    {
      title: 'Alle Einträge',
      text: 'JSON aller gespeicherten Einträge des Gebiets, gelöschte eingeschlossen, mit Autor und Zeit.',
      run: () =>
        downloadJson(exportFilename('eintraege', gebiet, 'json'), entriesFile(gebiet, entries)),
    },
  ]

  return (
    <div className="space-y-5">
      {errors.length > 0 ? (
        <Callout tone="warning" title={`${errors.length} Fehler in der Prüfliste`}>
          Die Exporte enthalten alles, auch fehlerhafte Einträge. Die Prüfliste steht in der
          Übersicht.
        </Callout>
      ) : null}
      {unreadable.length > 0 ? (
        <Callout tone="error" title="Nicht lesbare Einträge">
          {unreadable.length} Einträge passen nicht zum Format und fehlen in den Exporten:{' '}
          {unreadable.join(', ')}
        </Callout>
      ) : null}
      {exports.map((item) => (
        <div key={item.title} className="space-y-2">
          <Subheading>{item.title}</Subheading>
          <Text className="text-xs">{item.text}</Text>
          <Button type="button" outline onClick={item.run}>
            Herunterladen
          </Button>
        </div>
      ))}
    </div>
  )
}
