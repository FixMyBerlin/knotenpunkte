# Netzanpassungen – Plan

Stand 2026-10-23, Branch `netzanpassungen` (hier und in `infravelo-radnetz`). Die App ist gebaut, aber noch nicht von Hand getestet. Bedienung und Formate: [`netzanpassungen/README.md`](netzanpassungen/README.md).

## Stand gegenüber dem Plan

| Plan                                                       | Gebaut                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ordner `detailnetz/`, Bun-Workspaces mit `packages/shared` | Ordner `netzanpassungen/`, URL `/knotenpunkte/netzanpassungen/`. Gemeinsamer Code in `shared/` (Alias `@shared`) bei **einem** `package.json`: kein Workspace-Umbau, kein zweites Lockfile. Jede App hat eine eigene tsconfig, weil beide den Router registrieren. |
| Phase 1 Modularisieren                                     | Erledigt, eigener Commit. Zusätzlich gemeinsam: `DataTablePage`, Versionsprüfung (`version-tracker`), `downloadJson`, Vite-Plugins für `shared/public`.                                                                                                            |
| Phase 2 `export_app_daten.py`                              | Erledigt in `infravelo-radnetz/netzanpassungen/`, einmal für Berlin ausgeführt (24,8 MB, 291 Lücken, 111 km).                                                                                                                                                      |
| Phase 3–5 App                                              | Erledigt: Import, Karte mit allen Layern und Beschriftungen, Zeichnen mit Fangen, Namensvorschlag mit Bearbeitung, Verschieben, Stützpunkte, Löschen, Übersicht, Prüfliste, Export, `/data`.                                                                       |
| KV-Projekt                                                 | Angelegt am 2026-10-26, Schlüssel in `netzanpassungen/.env`. Ohne Schlüssel gilt weiter der **Testmodus** (nur Browser).                                                                                                                                           |
| Rückfrage bei verschiedenen `verkehrsebene`n               | Nicht gebaut: die Kante auf Ebene 0 gewinnt.                                                                                                                                                                                                                       |
| Phase 6 Rückweg in `infravelo-radnetz`                     | Offen                                                                                                                                                                                                                                                              |
| Phase 7 Strecke übernehmen (`R`)                           | Offen                                                                                                                                                                                                                                                              |
| Smoke-Test Playwright                                      | Nicht geschrieben. Unit-Tests für Namensregel, Fangen und Elementnummern liegen bei, sind aber nicht ausgeführt.                                                                                                                                                   |

Der folgende Text ist der Plan vom 2026-10-23, nur die Namen sind auf `netzanpassungen` angepasst.

## Ziel

Die touristischen Radfernwege sind noch nicht im REN+-Netz. Laut `infravelo-radnetz/ren-network/README.md` fehlen ihnen `element_nr` und Netzknoten. Wo ein Radfernweg nicht auf einer Detailnetzkante liegt (Parks, Uferwege, Wald), zeichnen wir neue Kanten:

1. Start an einem Knotenpunkt. Gibt es dort keinen, entsteht ein **virtueller Knotenpunkt** auf einer vorhandenen Kante.
2. Linie entlang des Radfernwegs zeichnen.
3. Ende an einem Knotenpunkt oder an einem neuen virtuellen Knotenpunkt auf einer Kante.

Für jeden neuen virtuellen Knoten schlägt die App einen Namen nach dem Muster der Bestandsdaten vor, `V<A>-<B>`. Der Name bleibt editierbar. Beim Zeichnen sind die Elementnummern der Kanten und die IDs der Knoten zu sehen. Gespeichert wird in der KV-Datenbank.

## Entscheidungen

- **Eigene App in eigenem Ordner** `netzanpassungen/` im Repo `knotenpunkte`, eigene URL `/knotenpunkte/netzanpassungen/`. **Kein Wechsel zwischen den Apps über die Oberfläche.**
- **Gemeinsamer Code wird verschoben, nicht kopiert**: nach `packages/shared/`, genutzt von beiden Apps (Bun-Workspaces).
- Die Knotenpunkte-App bleibt im Repo-Root. Das hält die Pfade für CI, Deploy und OSM-OAuth stabil.
- Eigenes KV-Projekt `netzanpassungen`, gleicher Worker, gleiche OSM-Anmeldung.
- Daten kommen aus `infravelo-radnetz`. Ein neues Skript dort schreibt die Eingabedatei der App, ein zweites übernimmt das Ergebnis zurück.

## Was in `infravelo-radnetz` liegt (geprüft am 2026-10-23)

| Daten                      | Datei                                                                                                                                                                                                                                                          | Für die App                                                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Detailnetzkanten           | `data/Berlin Straßenabschnitte Detailnetz <Datum>.fgb` (jüngster Stand, 43.508 Kanten, EPSG:25833)                                                                                                                                                             | Geometrie zum Fangen, `element_nr`, `beginnt_bei_vp`, `endet_bei_vp`, `strassenname`, `verkehrsebene`, `okstra_id`. Keine echten MultiLineStrings.                                                              |
| Detailnetzknoten           | keine eigene Datei mit ID (die Verbindungspunkte aus dem WFS haben nur `okstra_id`)                                                                                                                                                                            | **Aus den Kantenenden ableiten.** Geprüft: Bei 5.065 von 5.070 prüfbaren Kanten ist der erste Punkt `beginnt_bei_vp`, der letzte `endet_bei_vp`. Bei 5 liegt das Ende weiter weg; die kommen auf die Prüfliste. |
| Kartierungsnetz REN+       | `ren-network/output/ren_netz_kartierung.gpkg` / `.geojson` (`element_nr`, `von_knoten`, `bis_knoten`, `radverkehrsnetz`, `routen_fernradweg` leer); in TILDA als `infravelo-ren-netz-kartierung.pmtiles` (öffentlich)                                          | Anzeige aus TILDA-PMTiles. GeoJSON zum Fangen und für die Nachbarknoten im Namensvorschlag.                                                                                                                     |
| Radfernwege                | `data/netzquellen/touristisches_radnetz.gpkg` (8 Routen, Feld `name`: Berlin-Dresden, Berlin-Kopenhagen, Berlin-Leipzig, Berlin-Usedom, DahmeRadweg, Europaradweg R1, Havelradweg, Spreeradweg); gleiche Ausdehnung wie `260414_Radfernwege_SenMVKU.gpkg` (3D) | Vorlage zum Zeichnen und Quelle für `routen_fernradweg`. In TILDA für Berlin **nicht** vorhanden.                                                                                                               |
| Virtuelle Knoten (Bestand) | `data/Virtuelle-Knotenpunkte.gpkg` (53 Punkte, Feld `Knotenpunkt-ID`, EPSG:25833); 48 davon in der Lieferung 2025 (`data/netzquellen/knotenpunkte_2025.geojson.gz`)                                                                                            | Werden angezeigt und gefangen. Sie dürfen nicht doppelt vergeben werden. Ergebnis der App wird hier angehängt.                                                                                                  |
| Kanten der Lieferung 2025  | `data/netzquellen/ergebnis_2025_datensatz_c.geojson.gz` (210 Kanten an virtuellen Knoten)                                                                                                                                                                      | Vorbild für Elementnummern mit virtuellen Knoten, z. B. `37510001_V37510001-36510009.01`.                                                                                                                       |

## Muster der virtuellen Knoten in den Bestandsdaten

Die 48 virtuellen Knoten der Lieferung 2025 haben diese Formen:

| Form                    | Anzahl | Beispiel                                     | Bedeutung                                                                                     |
| ----------------------- | ------ | -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `V<A>-<B>`              | 18     | `V44530016-44530064`                         | Liegt zwischen den Netzknoten A und B                                                         |
| `V<A>-2`                | 5      | `V44530064-2`                                | Zweiter virtueller Knoten auf derselben Verbindung, neben A (hier neben `V44530016-44530064`) |
| `V<A>-V<B>`, Tippfehler | 4      | `V47500003-V47500008`, `V56600007-565900007` | Uneinheitlich, nicht nachbauen                                                                |
| `V<4 Ziffern>`          | 21     | `V2118`                                      | Ältere, freie Nummern ohne Bezug, nicht nachbauen                                             |

Abgleich mit der Lieferung 2025: A und B sind die **Nachbarknoten im Netz**, also die anderen Enden der Kanten, die am virtuellen Knoten anschließen. Beispiele: `V38520048-38520045` hat die Kanten zu `38520045` und `38520048`, `V57580021-57590012` die zu `57580021` und `57590012`. Bei drei Nachbarn (Einmündung) sind A und B die beiden Enden der durchgehenden, geteilten Kante, z. B. bei `V44520003-44520006`. A und B sind nicht immer die Enden der *Detailnetz*kante: Eine REN+-Kante kann mehrere Detailnetzkanten zusammenfassen (z. B. liegt `V50430004-V50430008` auf `50430004_50440007.02`).

### Regel für den Vorschlag

Ein neuer virtueller Knoten P entsteht auf einer **Trägerkante**. Das ist die Kante, auf die beim Zeichnen gefangen wurde.

1. **Trägerkante wählen.** Liegen mehrere Kanten am Fangpunkt (Toleranz 0,5 m), gilt diese Reihenfolge:
   1. Kante des REN+-Kartierungsnetzes (sie trägt die Netzknoten, wie 2025)
   2. Detailnetzkante
   3. eine in der App gezeichnete Kante

   Bei gleichem Rang gewinnt die nächstliegende Kante, bei gleichem Abstand die mit `verkehrsebene = 0`.

2. **A und B bestimmen.** Von P aus in beide Richtungen auf der Trägerkante zum nächsten **amtlichen** Knoten gehen. Bereits vorhandene virtuelle Knoten auf derselben Kante werden dabei übersprungen. A ist der Knoten in Richtung Kantenanfang, B der in Richtung Kantenende. Bei REN+ zählen `von_knoten`/`bis_knoten`, beim Detailnetz `beginnt_bei_vp`/`endet_bei_vp`, bei einer neuen Kante die nächsten amtlichen Knoten über die angeschlossenen Kanten.
3. **Vorschlag:** `V<A>-<B>`.
4. **Schon vergeben** (amtlich, im Bestand oder in der KV): `V<N>-2`, dann `-3` … bis frei. N ist der von A und B, der näher an P liegt. So entsteht das Muster `V44530064-2` aus dem Bestand.
5. **Nur ein amtlicher Knoten erreichbar** (Sackgasse, oder beide Enden sind virtuell und es gibt keinen amtlichen Knoten dahinter): `V<A>-2`, dann `-3` … bis frei.

Die Wahl unter mehreren Möglichkeiten trifft die App also nach festen Regeln. Unter dem Vorschlag steht als Zeile, worauf er beruht, z. B. „zwischen 44530016 und 44530064 auf REN+-Kante 44530016_44530064.01“. Ein Klick darauf zeigt die beiden Knoten auf der Karte.

### Name bearbeiten

- Das Feld **Name** ist beim Anlegen vorbelegt und markiert, damit man direkt überschreiben kann. `Enter` übernimmt.
- Später ist der Name jederzeit über die Auswahl des Knotens editierbar. **Vorschlag wiederherstellen** setzt den berechneten Namen erneut ein.
- Prüfung beim Speichern: Muster `^V[0-9A-Za-z-]+$` (ASCII-Bindestrich wie im Bestand), eindeutig gegen amtliche Knoten, Bestand und KV. Ist der Name nicht eindeutig, zeigt die App einen Fehler am Feld und speichert nicht.
- Die Elementnummern angeschlossener Kanten werden aus dem aktuellen Namen **abgeleitet**, nicht gespeichert (siehe Datenmodell). Ein Umbenennen braucht deshalb keine Folgeänderungen.

## Elementnummern neuer Kanten

Wie 2025: `<von>_<bis>.<nn>`, mit virtuellen Namen, z. B. `37510001_V37510001-36510009.01`. Von und bis folgen der Zeichenrichtung. `nn` zählt Kanten zwischen demselben Knotenpaar (in beiden Richtungen, auch amtliche), zweistellig ab `01`, in der Reihenfolge der Anlage.

Wird eine amtliche Kante `A_B.01` durch V geteilt, erzeugt der Export die Teilkanten `A_V.01` und `V_B.01` mit `ursprung_element_nr = A_B.01`. Gespeichert wird nur die Lage von V. **Offen:** Die Lieferung 2025 hat auch die Form `B_V` (`50430008_V50430004-V50430008.01`). Die gewünschte Richtung muss mit infraVelo geklärt werden.

## Aufbau im Repo

```
knotenpunkte/
├── package.json            # Workspaces: packages/*, detailnetz; bleibt die Knotenpunkte-App
├── src/                    # Knotenpunkte-App (nur noch Bewerten-spezifischer Code)
├── packages/shared/        # @knotenpunkte/shared, TypeScript-Quellen, kein eigener Build
│   └── src/{ui,map,mapillary,auth,kv,shell,datasets,dom,config}
└── netzanpassungen/             # neue App
    ├── index.html, vite.config.ts (Port 33480), package.json
    ├── public/osm-oauth-land.html
    └── src/{routes,components,network,config}
```

- `@knotenpunkte/shared` wird per Workspace verlinkt und von Vite direkt aus `src` übersetzt. Ein Build-Schritt entfällt, und der React Compiler greift weiter.
- Tailwind v4: Beide Apps scannen das Paket mit `@source "../packages/shared/src"` (Pfad je App).
- `oxlint`, `oxfmt`, `knip` und `tsc` laufen vom Root aus über alle Workspaces. `bun run check` prüft beide Apps.
- Deploy: Der Pages-Workflow baut beide Apps und legt `netzanpassungen/` nach `dist/netzanpassungen/`. Basis `/knotenpunkte/netzanpassungen/`, eigener `404.html`-Fallback.
- OSM-OAuth: dieselbe OAuth-App mit zwei zusätzlichen Redirect-URIs: `http://127.0.0.1:33480/osm-oauth-land.html` und `https://fixmyberlin.github.io/knotenpunkte/netzanpassungen/osm-oauth-land.html`.
- Private Hintergründe und Favoriten liegen in localStorage. In Produktion haben beide Apps dieselbe Origin und teilen sie automatisch. Lokal (andere Ports) nicht.

## Was nach `packages/shared` wandert

Verschoben, nicht kopiert. Die Knotenpunkte-App importiert danach aus dem Paket.

| Bereich          | Dateien heute                                                                                                                                                                                                                                                                 | Änderung zur Wiederverwendung                                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI               | `components/ui/*`, `shared/Tooltip`, `shared/motion`, `layouts/global.css`, `shared/cn.ts`, `shared/dom/*`                                                                                                                                                                    | keine                                                                                                                                                                      |
| Karte            | `MapBackgroundLayerControl`, `MapBackgroundLayerSource`, `MapBackgroundFavorites`, `MapResetNorthPitchButton`, `StreetsLayer`, `StreetsLegend`, `shared/map-ui-store`, `background-favorites-store`, `use-choose-background`, `shared/map/*` außer `node-style` und `map-ids` | `backgroundFavoriteHotkeys` aus `ratings/hotkeys.ts` ins Paket. Die Map-ID kommt als Prop, nicht aus `map-ids`.                                                            |
| Kartengerüst     | Teil von [`RatingMap.tsx`](src/components/RatingMap.tsx): Basisstil, Hintergrund, PMTiles-Protokoll, Attribution, Controls                                                                                                                                                    | Neue Komponente `BaseMap` mit `children` für die app-eigenen Layer. `RatingMap` behält nur Knoten, Auswahl und Mapillary-Logik.                                            |
| Mapillary        | `components/mapillary/*`, `shared/mapillary/*`                                                                                                                                                                                                                                | `NodePhotoViewer` und `Infra3dLink` bekommen `assignedIds`, `onAssign`, `onRemove` als Props statt `RatingSource` und `list-field`. `list-field.ts` wandert mit ins Paket. |
| Anmeldung und KV | `shared/kv-client/*`, `shared/osm/osm-auth.ts`, `components/shared/use-osm-auth.ts`, `AuthButton`                                                                                                                                                                             | `useOsmAuth` nimmt den KV-Client aus einem `KvClientProvider` statt aus `shared/kv/kv.ts`. Die Konstanten (`osmClientId`, Land-Datei) gehen in `config` im Paket.          |
| Rahmen           | `AppShell`, `SidebarLayout`, `Sidebar`, `sidebar-width-store`, `StepNav`, `AppHeader`, `layouts/LayoutRoot`                                                                                                                                                                   | `StepNav` generisch über die Schritt-ID und mit Prop `title`. `AppHeader` bekommt `title` und optional einen Link zur Datenseite mit eigenem Label.                        |
| Gebiete          | `shared/datasets/dataset-name.ts`; IndexedDB-Muster aus `dataset-idb.ts`                                                                                                                                                                                                      | Slug-Regel unverändert. Neu: `createIdbStore(prefix)` als dünne Hülle um `idb-keyval`. `dataset-idb.ts` nutzt sie für Knoten und Vorschläge.                               |
| Speichern        | Versionslogik aus [`kv-rating-store.ts`](src/shared/ratings/kv-rating-store.ts) (`versions`-Map, `If-Match`, Konflikt-Fehler)                                                                                                                                                 | Als `createVersionedKvStore<T>(client, schema)` herauslösen. `kv-rating-store` baut darauf auf. Die Netz-App nutzt es direkt.                                              |
| Export           | Download-Helfer aus `export-ratings.ts`                                                                                                                                                                                                                                       | `downloadJson(name, data)` ins Paket                                                                                                                                       |
| Datenseite       | [`AdminRatingsPage.tsx`](src/components/admin/AdminRatingsPage.tsx)                                                                                                                                                                                                           | Tabelle mit Spaltendefinition als Prop (`KvEntriesTable<T>`). Beide Datenseiten nutzen sie.                                                                                |

Bleibt in der Knotenpunkte-App: Bewertung, Vorschläge, QA, Queue, RapidForm, NodeNotes, WorkPanel, OverviewPanel, ExportPanel, DatasetPanel.

## Neue App `netzanpassungen/`

### Schritte

**Gebiet → Zeichnen → Übersicht → Export**, mit Datenseite `/data`. Gleiche Schrittleiste und Seitenleiste wie die Knotenpunkte-App.

### Eingabedaten

Eine Datei pro Gebiet, erzeugt in `infravelo-radnetz` (siehe unten), hochgeladen im Schritt **Gebiet** und gespeichert in IndexedDB:

```jsonc
{
  "schema": "netzanpassungen-app/v1",
  "gebiet": "berlin", // oder Bezirk
  "erzeugt_am": "…",
  "quellen": { "detailnetz": "2025-11-17", "ren_netz": "2026-10-08", "radfernwege": "260414" },
  "detailnetz": { "type": "FeatureCollection", … }, // LineString, element_nr, beginnt_bei_vp, endet_bei_vp, strassenname, verkehrsebene, okstra_id
  "knoten":     { "type": "FeatureCollection", … }, // Point, id, ist_virtuell (aus Kantenenden + Virtuelle-Knotenpunkte.gpkg)
  "ren_netz":   { "type": "FeatureCollection", … }, // LineString, element_nr, von_knoten, bis_knoten, radverkehrsnetz
  "radfernwege":{ "type": "FeatureCollection", … }, // LineString 2D, name
  "luecken":    { "type": "FeatureCollection", … }  // Abschnitte der Radfernwege ohne Kante in 10 m (Arbeitsliste)
}
```

Koordinaten in WGS84 mit 7 Nachkommastellen (≈ 1 cm). Die Datei wird mit Zod geprüft wie heute das Knoten-GeoJSON ([`parse-nodes.ts`](src/shared/nodes/parse-nodes.ts)).

### Karte

- `BaseMap` aus dem Paket, mit Hintergründen, Favoriten, Mapillary und infra3D
- Detailnetz als PMTiles wie heute. Ab z16 kommt die Beschriftung `element_nr` entlang der Linie dazu (`symbol-placement: line`).
- REN+-Kartierungsnetz aus TILDA (`infravelo-ren-netz-kartierung.pmtiles`) in den TILDA-Farben (Vorrang `#A21CAF`, Ergänzung `#F49E00`, sonst `#1d4ed8`), ab z16 mit `element_nr`
- Radfernwege aus der Eingabedatei, breit und halbtransparent, mit `name`
- Lücken als gestrichelte Linie, darunter in der Seitenleiste als Liste, ähnlich wie „Offen“ beim Bewerten
- Knoten: amtlich als kleine Kreise, virtuell als Raute in `#a855f7` (Farbe „virtuell“ der Knotenpunkte-App), ab z16 mit ID
- Neue Kanten in `#a855f7`, ausgewählt dicker

Jede Kante und jeder Knoten zeigt beim Klick: Elementnummer bzw. ID, Straße, `verkehrsebene`, Länge, angeschlossene Kanten.

### Werkzeug „Neue Kante“ (`N`)

1. **Start**. Gefangen wird in dieser Reihenfolge:
   1. Knoten (amtlich, Bestand virtuell, neu virtuell) im Umkreis von 12 px
   2. Kante (REN+, Detailnetz, neue Kante) im Umkreis von 10 px. Die Vorschau zeigt den künftigen virtuellen Knoten und den Namensvorschlag.

   Abseits von Knoten und Kanten kann nicht gestartet werden.

2. **Zwischenpunkte** per Klick, ohne Fangen. `Backspace` nimmt den letzten zurück.
3. **Ende** wie der Start. Danach öffnet sich für jeden neu entstandenen virtuellen Knoten das Namensfeld mit dem Vorschlag. `Enter` übernimmt ihn, dann wird gespeichert.
4. `Esc` bricht ab. `Alt` gedrückt schaltet das Fangen aus.
5. Der Endknoten ist gleich der Start der nächsten Kante. So zeichnet man einen Radfernweg in einem Zug.
6. Liegen am Fangpunkt Kanten auf verschiedenen `verkehrsebene`n (Brücke, Tunnel), fragt die App, welche gemeint ist.

**Phase 4, Strecke übernehmen (`R`):** Start und Ende auf den Radfernweg legen. Die App schneidet das Stück aus der Routengeometrie (`lineSlice`) und fügt die Fangpunkte an. Kante und Radfernweg-Name werden übernommen.

### Bearbeiten

- Stützpunkte einer Kante verschieben, einfügen, löschen. Die Enden bleiben an ihren Knoten.
- Einen virtuellen Knoten nur entlang seiner Trägerkante verschieben. Angeschlossene Kanten ziehen mit. Der Namensvorschlag wird neu berechnet, ein selbst vergebener Name bleibt.
- Kante löschen (`Entf`). Hängt danach nichts mehr an einem neuen virtuellen Knoten, fragt die App, ob er auch gelöscht werden soll.
- Felder pro Kante: `strassenname` (vorbelegt mit dem Namen der Trägerkante am Start, sonst leer), `routen_fernradweg` (vorbelegt aus dem nächsten Radfernweg), `kommentar`

Tastatur mit `@tanstack/react-hotkeys` wie in der Knotenpunkte-App. Kürzel werden ignoriert, solange ein Textfeld den Fokus hat ([`text-entry-focus.ts`](src/shared/dom/text-entry-focus.ts), dann aus dem Paket).

### Datenmodell (KV-Projekt `netzanpassungen`)

Schlüssel sind interne UUIDs. Namen und Elementnummern lassen sich so ändern bzw. ableiten, ohne dass Einträge umziehen.

```ts
type VirtualNode = {
  kind: 'virtual_node'
  name: string // editierbar, z. B. "V44530016-44530064"
  name_vorschlag: string // berechnet beim Anlegen bzw. Verschieben
  lngLat: [number, number]
  traeger: { art: 'ren' | 'detailnetz' | 'neu'; ref: string; station_m: number } // ref: element_nr oder UUID
  kommentar?: string
  geloescht?: boolean
}

type NewEdge = {
  kind: 'new_edge'
  von: NodeRef // { amtlich: '44530016' } | { bestand: 'V2118' } | { virtuell: '<uuid>' }
  bis: NodeRef
  coordinates: [number, number][]
  quelle: 'gezeichnet' | 'radfernweg'
  strassenname?: string
  routen_fernradweg?: string
  kommentar?: string
  geloescht?: boolean
}
```

- Einträge: `{gebiet}:vk:{uuid}` und `{gebiet}:kante:{uuid}`, Tags `[gebiet, 'vk' | 'kante']`
- Gespeichert wird beim Abschließen einer Kante und nach jeder Bearbeitung, mit `If-Match` über `createVersionedKvStore`. Bei Konflikten verhält sich die App wie die Knotenpunkte-App: aktuellen Stand laden, Hinweis zeigen, nicht überschreiben.
- Die Prüfregeln laufen vor dem Speichern und im Export. Die reinen Funktionen sind getestet:
  - Endpunkte liegen auf ihren Knoten (0,05 m).
  - Virtuelle Knoten liegen auf der Trägerkante (0,05 m).
  - Station zwischen 0 und Kantenlänge
  - `von ≠ bis`, Länge > 1 m
  - Namen sind eindeutig.

### Code der neuen App

`netzanpassungen/src/network/`, reine Funktionen mit Unit-Tests (Vitest wie heute):

| Datei                 | Inhalt                                                                        |
| --------------------- | ----------------------------------------------------------------------------- |
| `schema.ts`           | Zod für Eingabedatei, `VirtualNode`, `NewEdge`                                |
| `graph.ts`            | Knoten- und Kantenindex, angeschlossene Kanten, Räumlicher Index (`flatbush`) |
| `snap.ts`             | Fangen mit Vorrang Knoten > REN+ > Detailnetz > neu, Station auf der Kante    |
| `naming.ts`           | Namensvorschlag nach der Regel oben, Eindeutigkeit, Begründungstext           |
| `element-nr.ts`       | Elementnummern neuer Kanten und Teilkanten                                    |
| `validate.ts`         | Prüfregeln                                                                    |
| `export.ts`           | GeoJSON für die Rückgabe                                                      |
| `kv-network-store.ts` | Lesen und Schreiben über `createVersionedKvStore`                             |

Geometrie mit Turf-Einzelpaketen: `@turf/nearest-point-on-line`, `@turf/line-slice`, `@turf/length`, `@turf/along`. Das Zeichnen ist selbst gebaut mit `react-map-gl` (GeoJSON-Sources und Maus-Events). Die Fangregeln sind zu speziell für eine allgemeine Draw-Bibliothek.

`naming.test.ts` prüft die Regel an den echten Fällen aus dem Bestand, mindestens an diesen:

- `V44530016-44530064` (einfacher Fall)
- `V44530064-2` (zweiter Knoten auf derselben Verbindung)
- `V44520003-44520006` (Einmündung mit drei Nachbarn)
- `V50430004-…` (REN+-Kante über mehrere Detailnetzkanten)

### Export

1. **Virtuelle Knoten** als GeoJSON (Point): `Knotenpunkt-ID` (= Name), `ist_virtuell = 1`, `traeger_element_nr`, `station_m`. Passt zu `data/Virtuelle-Knotenpunkte.gpkg`.
2. **Neue Kanten** als GeoJSON (LineString): `element_nr`, `von_knoten`, `bis_knoten`, `laenge_m`, `strassenname`, `routen_fernradweg`, `quelle`, `kommentar`
3. **Geteilte Kanten** als GeoJSON: Teilkanten mit `ursprung_element_nr`
4. **Prüfliste**: Verstöße gegen die Prüfregeln, doppelte Namen, Lücken ohne Kante
5. JSON aller KV-Einträge mit Historie (wie die Knotenpunkte-App)

## Arbeiten in `infravelo-radnetz`

Neuer Ordner `netzanpassungen/` mit README, wie die anderen Ordner:

- **`export_app_daten.py [--bezirk NN]`** schreibt `output/detailnetz_app_<gebiet>.json` (Format oben):
  - Detailnetz reduziert auf die nötigen Spalten
  - Knoten aus den Kantenenden, dazu `Virtuelle-Knotenpunkte.gpkg`
  - `ren_netz_kartierung.gpkg`
  - Radfernwege aus `touristisches_radnetz.gpkg`, 2D
  - Lücken: Radfernweg-Abschnitte, die weiter als 10 m von jeder REN+- und Detailnetzkante liegen, mindestens 20 m lang
  - Prüfliste der 5 Kanten, deren Enden nicht zu `beginnt_bei_vp`/`endet_bei_vp` passen
- **`import_app_export.py <export>.geojson`**:
  - virtuelle Knoten an `data/Virtuelle-Knotenpunkte.gpkg` anhängen (EPSG:25833, Abbruch bei doppelter ID)
  - neue Kanten als `data/netzquellen/touristische_kanten.gpkg` schreiben
- **`ren-network/unify_networks.py`**: `touristische_kanten.gpkg` als vierte Netzquelle laden. Rang: nach Radverkehrsnetz, Radschnellverbindungen und Hauptstraßennetz.
  - `von_knoten`/`bis_knoten` werden Text statt `Integer64`, weil virtuelle IDs mit `V` beginnen.
  - `routen_fernradweg` füllen: aus den neuen Kanten und für vorhandene Kanten über die Überdeckung mit den Radfernwegen.
- Danach wie gewohnt `build_knotenpunkte.py`. Die neuen virtuellen Knoten landen so auch in `knotenpunkte_bewerten.geojson` und damit in der Knotenpunkte-App zur Bewertung.

## Phasen

| Phase | Inhalt                                                                                                                                                           | Fertig, wenn                                                                               |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 0     | Klären (offene Fragen 1–4), KV-Projekt `netzanpassungen` anlegen, Redirect-URIs eintragen                                                                        | Antworten liegen vor                                                                       |
| 1     | **Modularisieren:** Bun-Workspaces, `packages/shared`, Verschieben und Umbauen laut Tabelle. Eigener PR, ohne neue Funktion.                                     | Knotenpunkte-App verhält sich unverändert, `bun run check` und `bun run e2e` sind grün     |
| 2     | `export_app_daten.py` in `infravelo-radnetz`                                                                                                                     | Datei für Berlin und einen Bezirk erzeugt, Lücken-Layer in QGIS plausibel                  |
| 3     | `netzanpassungen/` aufsetzen: Rahmen, Login, Schritt Gebiet mit Import, Karte mit allen Layern und Beschriftungen, Deploy unter `/knotenpunkte/netzanpassungen/` | Alle Daten sichtbar, Elementnummern und IDs lesbar                                         |
| 4     | Werkzeug „Neue Kante“: Fangen, virtuelle Knoten, Namensvorschlag mit Bearbeitung, Speichern in KV, Konflikte                                                     | Smoke-Test: Kante von Knoten zu Kantenmitte, Vorschlag `V<A>-<B>`, umbenennen, gespeichert |
| 5     | Bearbeiten, Löschen, Übersicht mit Lückenliste, Export, Datenseite                                                                                               | Export lässt sich mit `import_app_export.py` einlesen                                      |
| 6     | Rückweg in `infravelo-radnetz`: `import_app_export.py`, vierte Netzquelle in `unify_networks.py`, `routen_fernradweg`                                            | Neue Kanten im REN+, virtuelle Knoten in `knotenpunkte_bewerten.geojson`                   |
| 7     | Strecke aus dem Radfernweg übernehmen (`R`)                                                                                                                      | Ein Radfernweg-Abschnitt in einem Schritt                                                  |

Phase 1 ist der größte Umbau am Bestand. Sie geht vor allem anderen und einzeln in einen PR, damit die laufende Bewertung nicht leidet.

## Offene Fragen

1. **Richtung der Teilkanten:** `A_V` und `V_B` (Kantenrichtung) oder wie teils 2025 `B_V`? Wie erwartet es infraVelo?
2. **Reihenfolge von A und B im Namen:** Der Plan nimmt die Richtung der Trägerkante. Im Bestand ist das uneinheitlich (`V61460005-61460004` liegt auf `61460004_61460005`).
3. **Radfernwege:** Ist `touristisches_radnetz.gpkg` die maßgebliche Quelle oder `260414_Radfernwege_SenMVKU.gpkg`? Beide haben dieselben 8 Routen und dieselbe Ausdehnung.
4. **Gebiet:** Ganz Berlin in einer Datei oder pro Bezirk? Das Detailnetz für ganz Berlin wird etwa 15–25 MB groß. Das ist für IndexedDB unkritisch, verlängert aber den Upload.
5. **Ältere Namen `V<4 Ziffern>`:** Sollen sie bleiben, wie sie sind? Der Plan fasst sie nicht an.
