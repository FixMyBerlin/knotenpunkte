# Netzanpassungen

Second app in this repo. It draws new edges into the Berlin Detailnetz where a Radfernweg has no edge, with virtual nodes where a new edge meets an existing one. It has no link to the Knotenpunkte app; both share the code in [`../shared/`](../shared/).

Dev server: [http://127.0.0.1:33480](http://127.0.0.1:33480). Production: `https://fixmyberlin.github.io/knotenpunkte/netzanpassungen/`.

```bash
bun run dev-netz
```

`bun run build`, `bun run type-check` and `bun run test-run` cover both apps.

## Input file

`infravelo-radnetz/netzanpassungen/export_app_daten.py` writes `netzanpassungen_<gebiet>.json` (`--bezirk <Name>` for one district). Schema `netzanpassungen-app/v1`, WGS84, five FeatureCollections:

- `detailnetz`: `element_nr`, `beginnt_bei_vp`, `endet_bei_vp`, `strassenname`, `verkehrsebene`, `okstra_id`
- `knoten`: `id`, `ist_virtuell`. Detailnetz nodes come from the edge ends (first point `beginnt_bei_vp`, last `endet_bei_vp`), plus `data/Virtuelle-Knotenpunkte.gpkg`
- `ren_netz`: the REN+ Kartierungs-Netz with `element_nr`, `von_knoten`, `bis_knoten`, `radverkehrsnetz`
- `radfernwege`: `name`
- `luecken`: parts of the Radfernwege more than 10 m from any edge, at least 20 m long
- `knoten_vorschlaege` (optional): where a Radfernweg crosses a Detailnetz edge at least 15 m from any node; with `winkel_grad`, `steil` (30° or more) and `luecke_nah`

The **Gebiet** step imports it into IndexedDB of this browser (about 25 MB for Berlin). Drawn nodes and edges are shared.

## Drawing

**Zeichnen** step. `N` turns the tool on.

1. Click a node or an edge for the start. Nodes win within 12 px, edges within 10 px. Where edges lie on top of each other (0.5 m), REN+ wins over the Detailnetz, the Detailnetz over edges drawn here, and level 0 over bridges and tunnels.
2. Click points in between. Near a Radfernweg (10 px) they go onto it; `Alt` sets a point freely. `Backspace` takes the last point back.
3. Click a node or an edge for the end. The edge is saved, and its end is the start of the next one. Or end it as a dead end: `Enter` or **Als Sackgasse speichern**. Its free end becomes a virtual node lying on the edge itself (named `V<nearest Detailnetz node>-<n>`), so every edge still has a node at both ends; the next line starts with a click again.
4. `Esc`, `N`, **Zeichnen beenden** or leaving the step with points drawn do not drop the line: the sidebar asks to save it as a dead end (`Enter`), drop it (`Esc`) or go on drawing (or a click on the map). Without points `Esc` drops the start, a second `Esc` ends the tool. Closing the tab with a line asks the browser first.

A start or end on an edge creates a virtual node there. The sidebar shows its name field after the edge is saved.

Selected edges drawn here show their points: drag a point, drag a middle point for a new one, click a point and press `Entf` to delete it. A selected virtual node drawn here can be dragged along its edge; the free end of a dead end moves freely, and the end of its edge follows. `Entf` deletes the selected edge or node (marked as deleted, history stays). Edges with virtual nodes on them and nodes with edges cannot be deleted; the free end of a dead end goes with its edge, unless another edge is attached to it.

The Mapillary photos and infra3D work as in the Knotenpunkte app, at the selected node.

## Node suggestions

In the **Zeichnen** step the sidebar section **Knotenvorschläge** lists the crossings of `knoten_vorschlaege` as orange rings on the map (default: only steep ones; filter: steep with a gap nearby, steep, all). Click a ring or **Ersten Vorschlag zeigen**. **Übernehmen** creates the virtual node on the edge (same host rule and name suggestion as when drawing) and moves on to the next suggestion; **Überspringen** and **Keine Aktion nötig** hide it (both kept in this browser only, **zurücksetzen** brings them back). The keys `W`, `E`, `R` press the three buttons in this order. A suggestion with a node within 3 m counts as taken over.

## Names of virtual nodes

After the virtual nodes of the 2025 delivery: `V<A>-<B>`, where A and B are the nearest Detailnetz nodes in both directions along the edge the node lies on. Virtual nodes on the way are passed through their own edges. If the name is taken: `V<N>-2`, `-3` … with N the nearer of A and B (as `V44530064-2` in the 2025 data). With only one Detailnetz node reachable: `V<A>-2` …

The name field is filled with the suggestion and can be changed. It checks the pattern `^V[0-9A-Za-z-]+$` and that the name is unique. A name that equals the suggestion follows it when the node is moved; one typed by hand stays. **Vorschlag einsetzen** puts the suggestion back.

## Element numbers

`<von>_<bis>.<nn>` with the current node names, e.g. `37510001_V37510001-36510009.01`. `nn` counts on after all edges of the input file between the same two nodes (either direction), new edges in the order they were drawn. They are derived, not stored, so renaming a node renames its edges.

## Storage

KV project `netzanpassungen` on the same Worker as Knotenpunkte. Entries `{gebiet}:vk:{uuid}` (virtual node) and `{gebiet}:kante:{uuid}` (edge), tags `[gebiet, vk|kante]`. Saves send `If-Match`; on a conflict the current state is loaded again.

The project exists (created 2026-10-26 with MCP `create_project`, origins `http://127.0.0.1:33480` and `https://fixmyberlin.github.io`); its public `api_key` is `VITE_KV_API_KEY` in [`.env`](.env). Without a key (empty or `REPLACE_ME`) the app runs in **Testmodus**: entries stay in this browser's IndexedDB.

OSM login uses the OAuth app of Knotenpunkte. These redirect URIs must be added to it:

- `http://127.0.0.1:33480/osm-oauth-land.html`
- `https://fixmyberlin.github.io/knotenpunkte/netzanpassungen/osm-oauth-land.html`

## Overview and export

**Übersicht**: the gaps (a gap counts as drawn when a new edge passes its middle within 10 m), the check list, and the edges and nodes drawn here. **Export**: virtual nodes (for `data/Virtuelle-Knotenpunkte.gpkg`), new edges (cut at virtual nodes on them), REN+ and Detailnetz edges cut at the new virtual nodes (`ursprung_element_nr`), and all entries as JSON. `/data` lists the entries of the area.

## Not built yet

- Taking a part of a Radfernweg over as an edge in one step (plan: key `R`)
- Asking which edge is meant where edges of different `verkehrsebene` lie on top of each other (the one at level 0 wins)
- Taking the export back in `infravelo-radnetz` (`import_app_export.py`, the new edges as a source in `unify_networks.py`)
