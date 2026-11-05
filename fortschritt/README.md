# Fortschritt

Read-only dashboard for the weekly talks about the REN+ mapping: is each delivery on track, where does each Bezirk stand, and is each account fast enough? No login, no writes. Served with `noindex` (meta tag and the `X-Robots-Tag` header in `netlify.toml`).

Dev server: [http://127.0.0.1:33481](http://127.0.0.1:33481) (`bun run dev-fortschritt`). Production: `https://radnetz-apps.netlify.app/fortschritt/`. Part of [infravelo-apps](../README.md).

## Views

The left sidebar lists the parts and sections of the report and highlights the one in view; below it the map. `umfang` (Gesamt / Lieferung N, absent is the running delivery) is shared by the burn-up, Personen and the map.

- **Report** (default, one scrolling page):
  - **Überblick**: tiles for the running delivery (% done, km, against the Soll line, pace, forecast, weeks left) and the whole project; a burn-up (km or %); the Bezirke in plan order.
  - **Personen**: per account the rest in the chosen Umfang, needed km/week, the average of the last 2 weeks and the pace status ("im Plan", "fast im Plan", "braucht mehr Tempo"); km already done in later deliveries; km marked in other accounts' areas; km per week as small column charts; "Für Gespräch kopieren" puts a text summary on the clipboard. `view=personen` (older links) opens the report at Personen.
- **Karte** (`view=karte`): edges vermillion (open) / blue (done, via `feature-state`; colour-blind safe) with finished Gebiete filled blue, or `farbe=mapper` with the account colours; filters Umfang / Bezirk / Account in the URL; a click on a Gebiet or an edge shows its numbers, a TILDA link with the assignment layers and the editor link.

## Data

| What                    | Source                                                                            | Cache                                                                |
| ----------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Edges (numbers)         | `https://tilda-geo.de/api/uploads/infravelo-ren-netz-zuteilung-netz.geojson`      | IndexedDB `fp:edges`: `lfd_nr`, `laenge_m`, `bezirk`, `account` only |
| Edges and Gebiete (map) | `…-zuteilung-netz.pmtiles`, `…-zuteilung-gebiete.pmtiles`, source layer `default` | browser HTTP cache                                                   |
| Done marks              | KV db project `infravelo-tracker`, all pages of `GET /entries?limit=500`          | IndexedDB `fp:progress`: id, `created_at`, `created_by.display_name` |

Both caches are used when younger than a day. The network is also loaded again when a `HEAD` request shows another file version: TILDA does not expose `ETag` to other origins, so the version is `Last-Modified` (then `Content-Length`). **Neu laden** loads both again. When a load fails and a cache exists, the app shows the cache with a warning; a 403 of the KV db names the origin that has to be allowed.

The KV read key and the URLs are in [`src/config/app.const.ts`](src/config/app.const.ts), the delivery plan in [`src/config/plan.const.ts`](src/config/plan.const.ts). Accounts come from the data.

## How the numbers are computed

All in `src/stats/` (pure, tested with Vitest, fixed fixtures and a fixed "now").

- **Time** is the Berlin wall clock in days; weeks run Monday to Sunday in Europe/Berlin. The date of a completion is `created_at` of its KV entry.
- **Start** is the Monday of the week of the first completion (26 Oct 2026).
- **Bezirk** of an edge: `bezirk` without the number (`"08 - Neukölln"` → `Neukölln`), matched against the plan. Bezirke outside the plan and marks without an edge are listed as hints and do not count.
- **Target** of a delivery = sum of `laenge_m` of its edges. The target grows when the network grows.
- **Soll** of Lieferung 2 rises straight from the start to its target on 1 Mar 2027; Lieferung 3 from 1 Mar to 1 Aug 2027. Gesamt is the sum of both, so it kinks on 1 Mar.
- **Im Plan / voraus / hinterher** = done − Soll today, within ±0.5 km is "im Plan".
- **Work time**: pace, needed and forecast count only Monday to Friday, 9–16 h Berlin (`workTime` in `plan.const.ts`); a week is 5 work days, no public holidays. Nights and weekends change nothing.
- **Pace** (Tempo, forecast: 28 days; Personen "Ø letzte 2 Wochen": 14 days) = km done in a rolling window up to now, per work week. The window never starts before the project start and counts at least 5 work days.
- **Needed per week** = rest ÷ work weeks from now to the deadline (recomputed every time, so a backlog spreads over the remaining weeks).
- **Forecast** = now + rest ÷ pace (28 days), in work time; none without pace. No start-up phase.
- **Ampel** = pace (14 days) ÷ needed: "im Plan" from 100 %, "fast im Plan" from 80 %, "braucht mehr Tempo" below; "fertig" with nothing left. Shown with icon and text. **Anlernphase**: in the first 14 days after an account's first mark, 60 % of the needed pace counts as 100 % (`rampUp`); Personen says so under the status.
- **Accounts** count edges by their assigned `account`, only in the running delivery. Done km in later deliveries are a separate column; "in fremden Gebieten" are km a `created_by` name marked in areas of another account.
- **Running delivery** = the first whose deadline is still ahead.

## Tests

```bash
bun run test-run                          # includes fortschritt/src
bun x playwright test --project=fortschritt  # smoke test, all external requests stubbed
```
