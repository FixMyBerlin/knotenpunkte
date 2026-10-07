# Mapillary detections for the Knotenpunkte rating — plan

Status 2026-10-02: phases 1 and 2 are built with `@osm-editor-kit/street-imagery` (0.1.0-alpha.8) and `@osm-editor-kit/street-imagery-react` (0.1.0-alpha.10). Phases 3 and 4 are open.

## What is built, compared with this plan

| Plan                                                                       | Built                                                                                                                                                                       | Differs from the plan                                                                                                                                                 |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1: image layer, photos from 2024 on, coloured by age                 | Photo dots and sequences from the last 2 years                                                                                                                              | Colour is by photo type (360° blue, flat green); the package fades dots with age. Age bands (`ageBandColorExpression`) are available but not used.                    |
| Phase 1: viewer opens the newest photo within ~30 m, turned to the node    | One view per approaching street, 20 m up the street, looking into the node (`viewpointsIntoNode`). The best one opens by itself; the others are chips and cones on the map. | Better than planned: the approach lines come from the Berlin street layer. With the street layer off there is one viewpoint at the node with four compass directions. |
| Phase 1: "Dieses Foto übernehmen"                                          | Button below the Mapillary-ID field in "Weitere Angaben"                                                                                                                    | —                                                                                                                                                                     |
| Phase 2: features within ~40 m as icons on the map                         | Purple dots from zoom 16, the five junction groups only                                                                                                                     | Dots, not icons. Clicking a dot opens the feature.                                                                                                                    |
| Phase 2: counts next to the attributes                                     | One row of counts above the form ("27 Ampeln", "4 Fahrrad-Symbole" …); the tooltip names the attribute                                                                      | Not placed per attribute. A click opens the nearest feature in its best photo, turned to it and outlined; another click steps to the next.                            |
| Phase 2: only bike-lane, symbol, stop-line and line outlines in the viewer | "Markierungen" checkbox in the viewer footer, off by default; bike-lane surface in cyan                                                                                     | —                                                                                                                                                                     |

Found while testing:

- The counts include old detections. At one test junction the nearest traffic light was last seen in 2019. The date filter applies to photos, not to map features.
- Many photos have no bike-lane or line detections at all (one 360° photo from 2025: road and sidewalk only).
- `URL photos=false` turns everything off; the toggle is in the map controls.
- The Mapillary token is still iD's (open question 3).

## Question

Can Mapillary's feature detection speed up rating the seven junction attributes, for example with a surface colour per photo? And how can we show those detections around the node that is being rated?

## Short answer

- **No surface colour.** Mapillary has no colour attribute at all, neither on map features nor on image detections. `Furt_rot` cannot be read from Mapillary directly.
- **Traffic lights are well covered** and can become a real suggestion for `LSA_KP`.
- **Markings are covered as hints**: bicycle symbols, stop lines, arrows, crosswalks as map points, and bike-lane surfaces and line markings as outlines per photo. They tell the rater where to look, but do not answer "keine / teilweise / gänzlich".
- The fastest win is not a detection but **the photo itself next to the form**, turned towards the junction. Today the app only has a text field for the Mapillary ID.

## What Mapillary provides

Two kinds of data (checked live on 2026-10-01 with two Berlin junctions, boxes of about 120 × 130 m):

**1. Map features** — points on the map, merged from many photos. Vector tiles `mly_map_feature_point/2/{z}/{x}/{y}` (layer `point`, zoom 14 only; `id`, `value`, `first_seen_at`, `last_seen_at`) or Graph API `map_features?bbox=…&object_values=…` (bbox below 0.01° square, up to 2000 results, adds `aligned_direction` and `images`).

| Value                                                                        | Moritzplatz | Kottbusser Tor |
| ---------------------------------------------------------------------------- | ----------- | -------------- |
| `object--traffic-light--*` (general, pedestrians, cyclists; front/back/side) | 3           | 264            |
| `marking--discrete--symbol--bicycle`                                         | 33          | 14             |
| `marking--discrete--stop-line`                                               | 3           | 23             |
| `marking--discrete--arrow--*` (left, right, straight, split)                 | 20          | 47             |
| `marking--discrete--crosswalk-zebra`, `construction--flat--crosswalk-plain`  | 15          | 18             |

Moritzplatz is a roundabout without signals, Kottbusser Tor is signalised: the traffic-light count separates them clearly.

**2. Image detections** — outlines per photo, `/{image_id}/detections?fields=value,geometry` (base64 vector-tile polygon in image coordinates). A 2026 360° photo at Moritzplatz had 650 detections, among them `construction--flat--bike-lane` ×14, `marking--continuous--dashed` ×23, `marking--continuous--solid` ×45, `marking--discrete--hatched--diagonal` ×9, `construction--flat--traffic-island` ×4. These classes exist only per photo, not as map points. Old photos have few or none (a 2017 photo: 2).

**Limits:** tiles 50,000 per day per app, search API 10,000 per minute, entity API 60,000 per minute. Needs our own (public) Mapillary client token.

## Attribute by attribute

| Attribute    | Mapillary signal                                                                    | Use                                                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KP_HVS`     | none                                                                                | Comes from the street network, not from photos.                                                                                                                         |
| `LSA_KP`     | traffic-light map features near the node                                            | **Suggestion** (Ja when several lights within ~30 m, with confidence from the count). Compare with OSM `highway=traffic_signals` first, which may be the better source. |
| `Mar_RVF_KP` | bicycle symbols; per photo `bike-lane` surface and dashed lines inside the junction | Hint only.                                                                                                                                                              |
| `Furt_rot`   | none directly                                                                       | Experiment: read the pixel colour inside the `bike-lane` outline ourselves (phase 4).                                                                                   |
| `RFS_Mitte`  | bicycle symbol with arrow markings on both sides                                    | Hint only.                                                                                                                                                              |
| `Fl_Linksab` | bicycle symbol + left arrow away from the kerb                                      | Hint only.                                                                                                                                                              |
| `vorgez_Fl`  | bicycle symbol just behind a stop line                                              | Hint only, maybe a weak suggestion.                                                                                                                                     |

## Plan

### Phase 1 — Photo viewer in the rating step

- Mapillary image layer on the map (`mly1_public/2`, images from 2024 on, coloured by age as in the iD fork).
- MapillaryJS viewer beside the form. On each node it opens the newest photo within ~30 m and turns towards the node; keys to step to the next photo or day.
- "Dieses Foto übernehmen" writes the shown image into `Mapillary-ID`, replacing manual copy-and-paste.

### Phase 2 — Detected features around the node

- Load the z14 map-feature tile for the node, keep features within ~40 m, show only the five groups from the table above as icons on the map. Toggle in the URL like `streets`.
- Small counts next to the attributes they belong to ("3 Ampeln", "5 Fahrrad-Symbole", "2 Haltlinien"). Clicking a count opens the best photo of that feature, turned towards it (logic exists in the iD fork: `sign_view.ts`).
- In the viewer, outline only `bike-lane`, bicycle symbol, stop line and line markings instead of all ~500 detections.

### Phase 3 — Suggestions from map features

- Script in `infravelo-ml-knotenpunkte` that queries map features per node and writes rows in the existing suggestions format (`{ id, attribute, value, confidence }`). No change to the app's schema.
- Start with `LSA_KP` only. Measure against the already rated nodes before adding `vorgez_Fl`.

### Phase 4 — Experiment: red marking from photos

- For the newest photos at a node: take the `construction--flat--bike-lane` outlines, read the pixels inside from the image, classify red vs. grey.
- Output as a `Furt_rot` suggestion with low confidence. Decide after a test on ~50 rated nodes whether it is worth keeping.

## Reuse from the iD fork

`iD--radnetz-berlin/WORKDOC.md`, features 18, 19 and 26: age filter and age colours, username → `creator_id`, best image for a feature, turning a 360° or flat photo towards a location, decoding detection outlines, original vs. computed image position. The code is `modules/mapillary/sign_view.ts` and `sign_select.ts`; the pure functions can be copied.

## Open questions

1. The dictation said "Verkehrszeichentool" — read here as this Knotenpunkte app. Correct?
2. Is phase 1 (viewer in the app) wanted, or do raters keep using the private aerial imagery and only want the detection hints?
3. Which Mapillary token: register a new app for Knotenpunkte? (The iD token should not be reused.)
4. Photo coverage: are the junctions in the areas covered by our own recent 360° captures (`radinfra` / `fixmycity`)? Phases 2–4 depend on photos from 2024 on.
5. Should Mapillary suggestions be shown separately from the ML suggestions (source per suggestion), or merged into one file?
