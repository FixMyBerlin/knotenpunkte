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

## Suggestions

Optional JSON per area: `{ id, attribute, value, confidence }` with confidence 0–1. Re-upload replaces suggestions for that area. Prefills empty rapid attributes; the cursor jumps to the first empty one. If all seven are suggested, Enter accepts them. Each suggested attribute is stored as `{ suggested, confidence, accepted }`. A mismatch shows “Vorschlag A, gewählt B”.

## Full mask

Every stored field, including virtual (`ist_virtuell`), Mapillary-ID, and Kommentar. Completeness still ignores those three.

## Overview

All uploaded nodes, colored like the Knoten legend: unrated `#f59e0b`, complete `#22c55e`, skipped `#6b7280`, virtual `#a855f7`, confirmed darker green stroke, corrected `#38bdf8`. Same status filter as the work list (`Alle`, `Offen`, `Bewertet`, `Bestätigt`, `Korrigiert`). Click opens the work view. Node-id labels from zoom 15.

## Review

**Bestätigen**, or **Problematisch** plus a submitted correction. The node stays complete. History names who set the old values and who corrected them. The original OSM user does not get these actions; names in [`src/config/admins.const.ts`](src/config/admins.const.ts) (`tordans`, `Supaplex030`) do. This is a UI guard only.

## Export and /data

JSON of full records (audit included). GeoJSON of local points with the result-file properties plus `qa` and a short correction summary. `/data` lists every KV rating for the project and does not need the local file.

## Map

OpenFreeMap Positron, Editor Layer Index backgrounds, and a private raster URL template (`{z}/{x}/{y}`) kept in this browser’s localStorage. Once set, that URL is the default here; `bg` can still pick Positron or an ELI layer. The key inside the URL stays on this machine and is never committed.

Street network (always on): [Berlin Straßenabschnitte](https://tilda-geo.de/api/uploads/strassennetz-berlin-strassenabschnitte.pmtiles), source-layer `default`, colored by `strassenklasse1`. Attribution: Geoportal Berlin / Detailnetz Berlin Straßenabschnitte, DL-DE/BY-2.0.

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

Also: skip `X` (`KP_Nichtbetrachten`), previous `J`, next `K`, Enter save-and-next. Shown read-only from the point: Laufende Nummer, Referenz im Detailnetz (`okstra_id`), Bezirksnummer, Radverkehrsnetz (`ist_radvorrangnetz`).

## Deploy

GitHub Pages workflow is in `.github/workflows/deploy-pages.yml`. Production origin: `https://fixmyberlin.github.io`. Base path: `/knotenpunkte/`.
