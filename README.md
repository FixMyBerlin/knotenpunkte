# infravelo-apps

Web apps for the Berlin Radnetz (Infravelo). One repo, one `package.json`, one Netlify site: `https://radnetz-apps.netlify.app`.

| App                                             | Path                | Dev server               | What it does                                              |
| ----------------------------------------------- | ------------------- | ------------------------ | --------------------------------------------------------- |
| [`knotenpunkte/`](knotenpunkte/README.md)       | `/knotenpunkte/`    | `http://127.0.0.1:33479` | Rate junction nodes one after another (Zustand nach OSM)  |
| [`netzanpassungen/`](netzanpassungen/README.md) | `/netzanpassungen/` | `http://127.0.0.1:33480` | Draw new edges and virtual nodes into the Detailnetz      |
| [`fortschritt/`](fortschritt/README.md)         | `/fortschritt/`     | `http://127.0.0.1:33481` | Progress dashboard, read-only, hidden from search engines |

The apps do not link to each other. `/` redirects to `/knotenpunkte/`.

## Layout

```
knotenpunkte/       app: index.html, src/, public/, tests/, .env, vite.config.ts, tsconfig.json
netzanpassungen/    app: index.html, src/, .env, vite.config.ts, tsconfig.json
fortschritt/        app: index.html, src/, tests/, vite.config.ts, tsconfig.json (no .env)
shared/             code of all apps (alias @shared)
netlify.toml        build, redirects, headers
dist/               build output, one folder per app (not committed)
```

`shared/` holds what the apps have in common, moved there instead of copied: UI kit, header and step navigation, sidebar layout, `BaseMap` (backgrounds, favourites, street network, camera in the URL), Mapillary and infra3D, OSM login, KV client, the database table page, and the Vite plugin for `shared/public` (OSM land page and favicon).

Each app has its own `vite.config.ts` with `root` set to the app folder, the aliases `@` (the app's `src/`) and `@shared` (`shared/`), its dev port and its production `base`.

## Run

```bash
bun install
bun run dev        # Knotenpunkte on 33479
bun run dev-netz   # Netzanpassungen on 33480
bun run dev-fortschritt  # Fortschritt on 33481
```

The dev ports are fixed. OSM only accepts `http` redirect URIs on `127.0.0.1`, and the first two are registered. Fortschritt has no login.

```bash
bun run check      # type-check, lint, format, tests, knip
bun run e2e        # Playwright: Knotenpunkte (stubbed auth), its Pages build (move dialog) and Fortschritt (stubbed data)
```

`@playwright/test` is pinned exactly at `1.62.1`. Playwright ships no browsers in `node_modules`; they live in one shared cache (`~/Library/Caches/ms-playwright` on macOS) that every repo on the same version reuses.

## Build

```bash
bun run build
```

`build` runs `build:*` in parallel; each app writes to `dist/<app>/` with the production base `/<app>/`:

- `dist/knotenpunkte/` (base `/knotenpunkte/`)
- `dist/netzanpassungen/` (base `/netzanpassungen/`)
- `dist/fortschritt/` (base `/fortschritt/`)

`bun run preview`, `bun run preview-netz` and `bun run preview-fortschritt` serve one built app locally.

### Deploy target

`DEPLOY_TARGET=netlify` (default) or `pages` picks base and output folder in the three `vite.config.ts` (helpers in [`shared/vite/deploy-target.ts`](shared/vite/deploy-target.ts)) and sets the build-time constant `isPagesDeploy` ([`shared/config/deploy-target.ts`](shared/config/deploy-target.ts)).

```bash
bun run build-pages
```

writes the old GitHub Pages layout to `dist-pages/` (not committed), built one after the other because Knotenpunkte sits at the root:

- `dist-pages/` Knotenpunkte (base `/knotenpunkte/`), `404.html` is its `index.html`
- `dist-pages/netzanpassungen/` (base `/knotenpunkte/netzanpassungen/`), plus `data/index.html`
- `dist-pages/fortschritt/` (base `/knotenpunkte/fortschritt/`)

GitHub Pages answers unknown paths with the root `404.html`, so deep links of Knotenpunkte (`/knotenpunkte/data`) work through it. The other apps get a copy of their `index.html` for each route besides `/` (Netzanpassungen: `data`; Fortschritt has only `/`). A new route in one of them needs its folder added in that app's `vite.config.ts` (`githubPagesSpaFallback`). Other unknown paths below `/knotenpunkte/netzanpassungen/` show the Knotenpunkte "not found" page.

Only on the Pages build the apps show the settings backup of the move dialog (see "Umzug"). The e2e run starts a second Knotenpunkte dev server with `DEPLOY_TARGET=pages DEV_PORT=33482 bun run dev`.

### Adding an app

1. New folder with its own `vite.config.ts`, copied from `netzanpassungen/`: `outDir: dist/<name>`, production `base: /<name>/`, a fixed dev port (`fortschritt`: 33481), `@` and `@shared` aliases, and a `tsconfig.json`.
2. In `package.json`: a `build:<name>` script, a `dev-<name>` script, and the `type-check` and `test-run` steps.
3. In `knip.config.mjs`, `oxlint.config.mjs`, `oxfmt.config.mjs` and the root `tsconfig.json`: the new paths.
4. In `netlify.toml`: the SPA redirect for `/<name>/*`.
5. In `playwright.config.ts`: a project with its `testDir` and `baseURL`, and its dev server in `webServer`.

## Deploy

Netlify builds from `netlify.toml`: `bun install --frozen-lockfile && bun run build`, publishes `dist`. Each app has a rewrite `/<app>/* -> /<app>/index.html` with status 200, which only applies when no file matches, so assets and `osm-oauth-land.html` are served as files.

Until the move is finished, `.github/workflows/deploy-pages.yml` also deploys the `pages` target on every push to `main` (`check-ci`, `bun run build-pages`, upload `dist-pages`). It is deleted with the move.

## OSM login

The apps share one non-confidential OSM OAuth app (client id in [`shared/config/shared.const.ts`](shared/config/shared.const.ts)). These redirect URIs must be registered on it:

- `http://127.0.0.1:33479/osm-oauth-land.html`
- `http://127.0.0.1:33480/osm-oauth-land.html`
- `https://radnetz-apps.netlify.app/knotenpunkte/osm-oauth-land.html`
- `https://radnetz-apps.netlify.app/netzanpassungen/osm-oauth-land.html`

The old Pages build (until the move is finished) uses `https://fixmyberlin.github.io/knotenpunkte/osm-oauth-land.html` and `https://fixmyberlin.github.io/knotenpunkte/netzanpassungen/osm-oauth-land.html`, which are registered already.

## Key-value database

Every app stores its data in a project of the shared [key-value database](https://github.com/FixMyBerlin/key-value-db): `knotenpunkte`, `netzanpassungen` (and `infravelo-tracker`, read by Fortschritt). The public project key is in the app's committed `.env`; Fortschritt keeps its read key in `fortschritt/src/config/app.const.ts`. A project only answers requests from its allowed origins.

## Umzug auf Netlify (noch offen)

The users' localStorage (private backgrounds, favourites, skipped suggestions, the old "Keine Aktion nötig" list) lives on `https://fixmyberlin.github.io`, and the KV projects allow that origin. So the code goes there first, and the users take their data along before the origin goes away. Done by a human, in this order:

1. Merge into `main` and push. The Pages workflow `.github/workflows/deploy-pages.yml` runs on a push to `main`, and nothing else is needed before that. It publishes `https://fixmyberlin.github.io/knotenpunkte/` (Knotenpunkte), `.../netzanpassungen/` and `.../fortschritt/` under the repo's old name `knotenpunkte`. Check the three apps and a deep link such as `.../netzanpassungen/data`.
2. Every user opens Knotenpunkte and Netzanpassungen there, **logged in**. A dialog opens:
   - Netzanpassungen: the "Keine Aktion nötig" markings of this browser go into the KV database (needs the OSM login; the dialog has the login button, shows the progress and the result, and comes back at every start while markings wait).
   - Both apps: "Einstellungen herunterladen" saves `knotenpunkte-einstellungen.json` (private background URLs with keys, so it stays on that computer). "Später erinnern" closes the dialog until the next start. "Erledigt" hides the backup section for good (`apps:umzug-gesichert`, shared by the apps of the origin); the dialog still opens while markings wait for the transfer.
   - Behaviour change for the current Pages users: marking "Keine Aktion nötig" now needs the OSM login, because it writes to the shared KV database. Markings made before stay hidden in this browser until they are transferred.
3. Check the transferred entries in the KV project `netzanpassungen`: tag `keine-aktion`, and `created_by` says who moved which markings.
4. Create the Netlify site `radnetz-apps` from this repo (settings from `netlify.toml`). The KV projects `knotenpunkte`, `netzanpassungen` and `infravelo-tracker` must allow the origins: `https://fixmyberlin.github.io` is already allowed in all three (checked 4 Nov 2026), so Fortschritt works on Pages too. For Netlify add `https://radnetz-apps.netlify.app` to all three (until then the database answers 403). Add the two production redirect URIs from "OSM login" to the OSM OAuth app. Open both apps there, log in, reload a deep link such as `/netzanpassungen/data`. Every user restores the file in Netzanpassungen, step **Gebiet**, **Sicherung einspielen**.
5. Rename the repo to `infravelo-apps`, make it private, and remove GitHub Pages (Settings > Pages). Then remove the pages-only parts of the code: the `pages` deploy target (`shared/vite/deploy-target.ts`, `isPagesDeploy` in `shared/config/deploy-target.ts`, the `githubPagesSpaFallback` plugin in `shared/vite/plugins.ts`, the `build-pages` script, `dist-pages`, and the `pages` Playwright project), the backup part (`shared/umzug/BackupSection.tsx` and the backup branch in `shared/umzug/umzug-state.ts`), the `UmzugHost` mount in Knotenpunkte, and `.github/workflows/deploy-pages.yml`. Also remove the OSM redirect URIs and KV origins of `fixmyberlin.github.io`. Do **not** delete `shared/umzug/`: Netzanpassungen' transfer dialog and "Sicherung einspielen" still use it.
