# Knotenpunkte

Web app to rate junction nodes one after another. Ratings persist in the shared [key-value database](https://github.com/FixMyBerlin/key-value-db) after OSM login, under KV project `knotenpunkte`.

Dev server: [http://127.0.0.1:33479](http://127.0.0.1:33479) (fixed host and port so OSM OAuth redirect URIs stay stable). OSM only accepts `http` redirects on `127.0.0.1`.

## Repo layout

Two apps share one `package.json`:

- `src/`: Knotenpunkte (this README)
- [`netzanpassungen/`](netzanpassungen/README.md): drawing new edges and virtual nodes into the Detailnetz, at `/knotenpunkte/netzanpassungen/`. The apps do not link to each other.
- `shared/` (alias `@shared`): code of both apps, moved there instead of copied. UI kit, header and step navigation, sidebar layout, `BaseMap` (backgrounds, favourites, street network, camera in the URL), Mapillary and infra3D, OSM login, KV client, the database table page and the Vite plugins for `shared/public`.

## Run

```bash
bun install
bun run dev
```

Download [Testdaten herunterladen (dann hochladen)](https://github.com/FixMyBerlin/knotenpunkte/raw/main/public/fixtures/berlin-nodes-sample.geojson), then **Datei wählen**, check the area slug, and click **Importieren**. The sample holds 10 real nodes in Charlottenburg from `infravelo-radnetz` (`output/knotenpunkte/knotenpunkte_mit_id_und_bezirken.gpkg`; Geoportal Berlin, DL-DE/BY-2.0). Optional suggestions: [Beispiel-Vorschläge herunterladen](https://github.com/FixMyBerlin/knotenpunkte/raw/main/public/fixtures/berlin-suggestions-sample.json).

```bash
bun run check
bun run e2e
```

`@playwright/test` is pinned **exactly** at `1.62.1`. Playwright ships no browsers in `node_modules`; they live in one shared cache (`~/Library/Caches/ms-playwright` on macOS) that every repo on the same version reuses.

## OSM login

Public client id lives in [`shared/config/shared.const.ts`](shared/config/shared.const.ts) (`osmClientId`). Those redirect URIs must be registered on the OSM OAuth app before login works:

- `http://127.0.0.1:33479/osm-oauth-land.html`
- `https://fixmyberlin.github.io/knotenpunkte/osm-oauth-land.html`

The app is **non-confidential** (`read_prefs`). Public client id only, never a client secret. Login uses [`osm-api`](https://github.com/osmlab/osm-api-js) v4 in **redirect PKCE** mode. The land page is `shared/public/osm-oauth-land.html`, served by both apps. Smoke tests stub auth, so `bun run e2e` does not need a live login.

Writes to the rating database require a logged-in OSM user (`Authorization: Bearer <OSM token>`).

## Rate

Pick or create an area slug (`^[a-z0-9]+(-[a-z0-9]+)*$`, 3–60 chars), upload a node GeoJSON (`NUMMER` or `Knotenpunkt-ID`, including Unicode hyphen U+2010; Point or MultiPoint), then land on the next unrated node. The map shows that point and the always-on StEP street layer.

Seven Zustand-nach-OSM attributes (two Ja/Nein, five keine/teilweise/gänzlich). One attribute is active (highlighted); every node starts at the top one. `Q` / `W` / `E` answer its first, second and third choice and move on to the next attribute; `Tab` and `Shift+Tab` move without answering; after the last attribute `Tab` goes on into the notes. `H`, `I` and `O` jump to the customer note, the internal note and the source; inside these fields `Tab` works as usual and `Escape` leaves them. The footer has **Speichern** (`Enter`, saves and goes to the next node), **Nicht relevant** (`X`) and **Zurückstellen** (`Z`). `J` / `K` and the arrows next to the node id step through the nodes. Keyboard is ignored while a text field is focused.

Progress (**bewertet/gesamt**) is in the step navigation. Completeness ignores virtual, photos, source and notes: a node is complete when it is not relevant or all seven answers are set. **Nicht relevant** (`KP_Nichtbetrachten`) sets `KP_HVS` and `LSA_KP` to Nein, clears the other five and counts as complete. **Zurückstellen** (later) needs an internal note: without one the note field gets the focus and is marked; **Fehlendes Fotomaterial** above the field fills it in. The node is saved with `Zurueckgestellt: 1` and as incomplete; it leaves **Offen** and is listed under **Zurückgestellt** until it is saved normally. Stepping to the next or previous node (also after saving) skips deferred nodes and goes on from the current node's place in the list; they are opened from the Übersicht list, and only the **Zurückgestellt** filter steps through them.

`Betrachtung` is derived from the suggestions: `0` when both `KP_HVS` and `LSA_KP` are suggested as `0`, else `1` (also without those two suggestions, and never when the node has an `LSA_Konflikt`). At `0` the form shows a short hint instead of the seven attributes, and Enter skips the node; **Doch bewerten** reveals the attributes. Nodes that already have a rating (not skipped) show the attributes. With an `LSA_Konflikt` (`nur_OSM` / `nur_OpenData`: the sources disagree whether an LSA exists) the attributes stay visible and a warning says it is uncertain whether an LSA exists.

## Suggestions

Optional JSON array per area: `{ id, attribute, value, confidence, probabilities? }` with confidence 0–1. Optional `probabilities` maps every possible value (`"0"`/`"1"` or `keine`/`teilweise`/`gänzlich`) to its probability; the rapid form then shows the percentage on every button, otherwise only on the suggested one. `id` must match the node ID (`NUMMER` or `Knotenpunkt-ID`). `value` is `0`/`1` for `KP_HVS` and `LSA_KP`, `keine`/`teilweise`/`gänzlich` for the other five; one row per node and attribute. [infravelo-ml-knotenpunkte](https://github.com/FixMyBerlin/infravelo-ml-knotenpunkte) writes this file with `06_export_knotenpunkte.py`. Re-upload replaces suggestions for that area. Prefills empty rapid attributes; the cursor jumps to the first empty one. If all seven are suggested, Enter accepts them. Each suggested attribute is stored as `{ suggested, confidence, accepted }`. A mismatch shows “Vorschlag A, gewählt B”.

## Notes, source and photos

Always shown below the attributes: **Hinweis an den Kunden** (`Kommentar`), **Hinweis intern** (`Kommentar_intern`), **Quelle** (`Quelle`: `Mapillary`, `infra3D`, `;`-separated) and virtual (`ist_virtuell`). Assigning a Mapillary photo ticks Mapillary, opening infra3D ticks infra3D; both can be unticked. The pipette above the photo in the viewer assigns the shown photo to the node; assigned photos are buttons next to it (click shows the photo, × removes it) and are stored `;`-separated in `Mapillary-ID`.

## Saving

Every edit is stored on its own: 0.8 s after the last change and at once when the node is left. These autosaves never finish a node; only **Speichern** and **Nicht relevant** make an open node complete. Autosaves of one person within 15 minutes are one history entry. The line under the node id shows the state (`Speichert …`, `Zwischenstand gespeichert · noch offen`, `Gespeichert`). Without OSM login nothing is stored.

A save sends the version of the entry it is based on (`If-Match`). If somebody else changed the node in the meantime the store refuses the save; the app then loads the current rating, drops the local edits of that node and asks to check and save again. The form only appears once the stored ratings are loaded, and it is blocked when they cannot be loaded. An entry that does not match the schema is never overwritten: its node shows an error and cannot be saved, and the Export step lists such entries.

## Overview

The **Übersicht** step sits between Bewerten and Export. The map shows every uploaded node, colored like the Knoten legend: unrated `#f59e0b`, deferred `#ec4899`, complete `#22c55e`, skipped `#6b7280`, virtual `#a855f7`, confirmed darker green stroke, corrected `#38bdf8`. The sidebar is the status filter (`Alle`, `Offen`, `Zurückgestellt`, `Bewertet`, `Bestätigt`, `Korrigiert`) and the matching node list; deferred nodes show their internal note. Choosing a node opens it in Bewerten. Node-id labels from zoom 15.

## Review

**Bestätigen**, or **Problematisch** plus a submitted correction. The node stays complete. History names who set the old values and who corrected them. The original OSM user does not get these actions; names in [`src/config/admins.const.ts`](src/config/admins.const.ts) (`tordans`, `Supaplex030`) do. This is a UI guard only.

## Export and /data

The Export step has three exports, each with a description: GeoJSON of the local points with the result-file properties, the rating, `qa` and a short correction summary (for GIS and delivery); JSON of the project's full records (history and suggestion audit included); JSON of all projects. All contain both notes, the source and the photos. `/data` (database icon in the header) lists the KV ratings of the project selected in the Datensatz step and does not need the local file. It keeps the rating page's URL state, so the same icon leads back to where you were; a clicked row becomes the selected node.

## Map

OpenFreeMap Positron, Editor Layer Index backgrounds, and private backgrounds: any number of raster URL templates (`{z}/{x}/{y}`), each with a title, kept in this browser’s localStorage. Without another choice the first one is the default here; `bg` can still pick Positron or an ELI layer. A key inside a URL stays on this machine: private backgrounds never go into the page URL and are never committed. The star at the end of a row in the background list makes it a favourite: favourites are buttons on the map with a short name (the year in the name or title) and the keys `1`–`9` by position, kept in localStorage.

Street network: [Berlin Straßenabschnitte](https://tilda-geo.de/api/uploads/strassennetz-berlin-strassenabschnitte.pmtiles), source-layer `default`, colored by `strassenklasse1`. The legend starts closed. **An / Aus** toggles the layer and is stored in the URL (`streets=false` when off; omitted when on). Opening the color list stays in this browser session. Attribution: Geoportal Berlin / Detailnetz Berlin Straßenabschnitte, DL-DE/BY-2.0.

Mapillary (rating step only, `photos=false` in the URL turns it off): photos from the cut-off day on (`mapillaryCutoffDate`, 2024-01-01) and one suggested view per street that reaches the node, looking into the junction. The best view opens in a floating photo viewer; the others are chips in the viewer and cones on the map. The Mapillary control on the map switches the photos on and off and folds out the settings, as in TILDA: colour by age or photo type (`photoColor=type`), only 360° or only classic photos, and the package's date slider with marks for the photos in view and a line at the cut-off day. Type and date filter also apply to the suggested views; they reset on reload. Layers and their look come from `@osm-editor-kit/street-imagery-react`; the plan and its status are in [`MAPILLARY-PLAN.md`](MAPILLARY-PLAN.md). The token is `mapillaryToken` in [`shared/config/shared.const.ts`](shared/config/shared.const.ts).

Fallback camera: zoom 14.6, lat 52.5076, lng 13.3115.

## Storage

- **Nodes and suggestions:** IndexedDB (`idb-keyval`), never uploaded. Re-import under the same area replaces the local snapshot.
- **Ratings:** production Cloudflare Worker at `https://key-value-store.fixmycity.workers.dev`. **Reads are public.** **Writes send the OSM Bearer token.** Entry id is `{area}:{nodeId}`. The committed `.env` `VITE_KV_API_KEY` is a **public project selector** (`X-Api-Key`), not an admin secret.
- **Private tile URL:** localStorage only. Never in git, KV, or exports.

## Attributes

Rapid form (required for complete unless skipped):

- Knotenpunkt mit Hauptverkehrsstraße (HVS) — `KP_HVS` — Nein / Ja
- LSA-Knotenpunkt — `LSA_KP` — Nein / Ja
- Markierte Radverkehrsfurten im Knotenpunkt — `Mar_RVF_KP` — keine / teilweise / gänzlich
- Rotmarkierung der Furt — `Furt_rot` — keine / teilweise / gänzlich
- Radfahrstreifen in Mittellage — `RFS_Mitte` — keine / teilweise / gänzlich
- Rad-Aufstellflächen für Linksabbiegen vorhanden — `Fl_Linksab` — keine / teilweise / gänzlich
- Vorgezogene Aufstellflächen vorhanden — `vorgez_Fl` — keine / teilweise / gänzlich

The choices of the active attribute are `Q` / `W` / `E`. The info button next to the node id opens compact read-only fields from the point: Referenz im Detailnetz (`okstra_id`), Bezirksnummer, Radverkehrsnetz (`ist_radvorrangnetz`).

## Deploy

GitHub Pages workflow is in `.github/workflows/deploy-pages.yml`. Production origin: `https://fixmyberlin.github.io`. Base path: `/knotenpunkte/`. `bun run build` builds Knotenpunkte into `dist/` and then Netzanpassungen into `dist/netzanpassungen/` (base `/knotenpunkte/netzanpassungen/`).
