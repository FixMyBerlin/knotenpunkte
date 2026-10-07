# Knotenpunkte

Web app to rate junction nodes one after another. Ratings persist in the shared [key-value database](https://github.com/FixMyBerlin/key-value-db) after OSM login, under KV project `knotenpunkte`.

Dev server: [http://127.0.0.1:33479](http://127.0.0.1:33479) (fixed host and port so OSM OAuth redirect URIs stay stable). OSM only accepts `http` redirects on `127.0.0.1`.

## Run

```bash
bun install
bun run dev
```

Download [Testdaten herunterladen (dann hochladen)](https://github.com/FixMyBerlin/knotenpunkte/raw/main/public/fixtures/berlin-nodes-sample.geojson), then **Datei wählen**, check the area slug, and click **Importieren**. Optional suggestions: [Beispiel-Vorschläge herunterladen](https://github.com/FixMyBerlin/knotenpunkte/raw/main/public/fixtures/berlin-suggestions-sample.json).

```bash
bun run check
bun run e2e
```

`@playwright/test` is pinned **exactly** at `1.62.1`. Playwright ships no browsers in `node_modules`; they live in one shared cache (`~/Library/Caches/ms-playwright` on macOS) that every repo on the same version reuses.

## OSM login

Public client id lives in [`src/config/app.const.ts`](src/config/app.const.ts) (`osmClientId`). Those redirect URIs must be registered on the OSM OAuth app before login works:

- `http://127.0.0.1:33479/osm-oauth-land.html`
- `https://fixmyberlin.github.io/knotenpunkte/osm-oauth-land.html`

The app is **non-confidential** (`read_prefs`). Public client id only, never a client secret. Login uses [`osm-api`](https://github.com/osmlab/osm-api-js) v4 in **redirect PKCE** mode. The land page is `public/osm-oauth-land.html`. Smoke tests stub auth, so `bun run e2e` does not need a live login.

Writes to the rating database require a logged-in OSM user (`Authorization: Bearer <OSM token>`).

## Rate

Pick or create an area slug (`^[a-z0-9]+(-[a-z0-9]+)*$`, 3–60 chars), upload a node GeoJSON (`NUMMER` or `Knotenpunkt-ID`, including Unicode hyphen U+2010; Point or MultiPoint), then land on the next unrated node. The map shows that point and the always-on StEP street layer.

Seven Zustand-nach-OSM attributes (two Ja/Nein, five keine/teilweise/gänzlich), skip, Enter saves and advances. Key caps are on the buttons. Keyboard is ignored while a text field is focused.

Progress is **bewertet/gesamt**. Completeness ignores virtual, Mapillary, and comment: a node is complete when it is skipped or all seven answers are set. Skip (`KP_Nichtbetrachten`) clears the seven and still counts as complete.

`Betrachtung` is derived from the suggestions: `0` when both `KP_HVS` and `LSA_KP` are suggested as `0`, else `1` (also without those two suggestions, and never when the node has an `LSA_Konflikt`). At `0` the form shows a short hint instead of the seven attributes, and Enter skips the node; **Doch bewerten** reveals the attributes. Nodes that already have a rating (not skipped) show the attributes. With an `LSA_Konflikt` (`nur_OSM` / `nur_OpenData`: the sources disagree whether an LSA exists) the attributes stay visible and a warning says it is uncertain whether an LSA exists.

## Suggestions

Optional JSON array per area: `{ id, attribute, value, confidence, probabilities? }` with confidence 0–1. Optional `probabilities` maps every possible value (`"0"`/`"1"` or `keine`/`teilweise`/`gänzlich`) to its probability; the rapid form then shows the percentage on every button, otherwise only on the suggested one. `id` must match the node ID (`NUMMER` or `Knotenpunkt-ID`). `value` is `0`/`1` for `KP_HVS` and `LSA_KP`, `keine`/`teilweise`/`gänzlich` for the other five; one row per node and attribute. [infravelo-ml-knotenpunkte](https://github.com/FixMyBerlin/infravelo-ml-knotenpunkte) writes this file with `06_export_knotenpunkte.py`. Re-upload replaces suggestions for that area. Prefills empty rapid attributes; the cursor jumps to the first empty one. If all seven are suggested, Enter accepts them. Each suggested attribute is stored as `{ suggested, confidence, accepted }`. A mismatch shows “Vorschlag A, gewählt B”.

## Weitere Angaben

**Weitere Angaben** (disclosure) has virtual (`ist_virtuell`), Mapillary-ID, and Kommentar. Completeness still ignores those three. They save with Speichern und weiter.

## Overview

The **Übersicht** step sits between Bewerten and Export. The map shows every uploaded node, colored like the Knoten legend: unrated `#f59e0b`, complete `#22c55e`, skipped `#6b7280`, virtual `#a855f7`, confirmed darker green stroke, corrected `#38bdf8`. The sidebar is the status filter (`Alle`, `Offen`, `Bewertet`, `Bestätigt`, `Korrigiert`) and the matching node list. Choosing a node opens it in Bewerten. Node-id labels from zoom 15.

## Review

**Bestätigen**, or **Problematisch** plus a submitted correction. The node stays complete. History names who set the old values and who corrected them. The original OSM user does not get these actions; names in [`src/config/admins.const.ts`](src/config/admins.const.ts) (`tordans`, `Supaplex030`) do. This is a UI guard only.

## Export and /data

JSON of full records (audit included). GeoJSON of local points with the result-file properties plus `qa` and a short correction summary. `/data` lists every KV rating for the project and does not need the local file.

## Map

OpenFreeMap Positron, Editor Layer Index backgrounds, and a private raster URL template (`{z}/{x}/{y}`) kept in this browser’s localStorage. Once set, that URL is the default here; `bg` can still pick Positron or an ELI layer. The key inside the URL stays on this machine and is never committed.

Street network: [Berlin Straßenabschnitte](https://tilda-geo.de/api/uploads/strassennetz-berlin-strassenabschnitte.pmtiles), source-layer `default`, colored by `strassenklasse1`. The legend starts closed. **An / Aus** toggles the layer and is stored in the URL (`streets=false` when off; omitted when on). Opening the color list stays in this browser session. Attribution: Geoportal Berlin / Detailnetz Berlin Straßenabschnitte, DL-DE/BY-2.0.

Mapillary (rating step only, `photos=false` in the URL turns it off): photos of the last two years, detected traffic lights and markings from zoom 16, and one suggested view per street that reaches the node, looking into the junction. The best view opens in a floating photo viewer; the others are chips in the viewer and cones on the map. Above the form, counts of what Mapillary detected within 40 m open the nearest object in its best photo. Objects that Mapillary last saw before 2024 (`mapillaryFeaturesSeenFrom`) are not counted. Photos are coloured by age; the Mapillary control on the map switches to colours by photo type (`photoColor=type`). **Markierungen** in the viewer outlines bike-lane surfaces and markings. **Angezeigtes Foto übernehmen** in Weitere Angaben fills the Mapillary-ID. Built with `@osm-editor-kit/street-imagery` and `@osm-editor-kit/street-imagery-react`; the plan and its status are in [`MAPILLARY-PLAN.md`](MAPILLARY-PLAN.md). The token is `mapillaryToken` in [`src/config/app.const.ts`](src/config/app.const.ts).

Fallback camera: zoom 14.6, lat 52.5076, lng 13.3115.

## Storage

- **Nodes and suggestions:** IndexedDB (`idb-keyval`), never uploaded. Re-import under the same area replaces the local snapshot.
- **Ratings:** production Cloudflare Worker at `https://key-value-store.fixmycity.workers.dev`. **Reads are public.** **Writes send the OSM Bearer token.** Entry id is `{area}:{nodeId}`. The committed `.env` `VITE_KV_API_KEY` is a **public project selector** (`X-Api-Key`), not an admin secret.
- **Private tile URL:** localStorage only. Never in git, KV, or exports.

## Attributes

Rapid form (required for complete unless skipped):

- Knotenpunkt mit Hauptverkehrsstraße (HVS) — `KP_HVS` — Nein / Ja (`Q` / `W`)
- LSA-Knotenpunkt — `LSA_KP` — Nein / Ja (`A` / `S`)
- Markierte Radverkehrsfurten im Knotenpunkt — `Mar_RVF_KP` — keine / teilweise / gänzlich (`1` / `2` / `3`)
- Rotmarkierung der Furt — `Furt_rot` — keine / teilweise / gänzlich (`4` / `5` / `6`)
- Radfahrstreifen in Mittellage — `RFS_Mitte` — keine / teilweise / gänzlich (`7` / `8` / `9`)
- Rad-Aufstellflächen für Linksabbiegen vorhanden — `Fl_Linksab` — keine / teilweise / gänzlich (`E` / `R` / `T`)
- Vorgezogene Aufstellflächen vorhanden — `vorgez_Fl` — keine / teilweise / gänzlich (`D` / `F` / `G`)

Also: skip `X` (`KP_Nichtbetrachten`), previous `J`, next `K`, Enter save-and-next. The node heading can open compact read-only fields from the point: Referenz im Detailnetz (`okstra_id`), Bezirksnummer, Radverkehrsnetz (`ist_radvorrangnetz`).

## Deploy

GitHub Pages workflow is in `.github/workflows/deploy-pages.yml`. Production origin: `https://fixmyberlin.github.io`. Base path: `/knotenpunkte/`.
