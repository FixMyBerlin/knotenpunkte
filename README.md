# infravelo-apps

Web apps for the Berlin Radnetz (Infravelo). One repo, one `package.json`, one Netlify site: `https://radnetz-apps.netlify.app`.

| App                                             | Path                | Dev server               | What it does                                             |
| ----------------------------------------------- | ------------------- | ------------------------ | -------------------------------------------------------- |
| [`knotenpunkte/`](knotenpunkte/README.md)       | `/knotenpunkte/`    | `http://127.0.0.1:33479` | Rate junction nodes one after another (Zustand nach OSM) |
| [`netzanpassungen/`](netzanpassungen/README.md) | `/netzanpassungen/` | `http://127.0.0.1:33480` | Draw new edges and virtual nodes into the Detailnetz     |
| `fortschritt/` (not built yet)                  | `/fortschritt/`     | `http://127.0.0.1:33481` | Progress dashboard, hidden from search engines           |

The apps do not link to each other. `/` redirects to `/knotenpunkte/`.

## Layout

```
knotenpunkte/       app: index.html, src/, public/, tests/, .env, vite.config.ts, tsconfig.json
netzanpassungen/    app: index.html, src/, .env, vite.config.ts, tsconfig.json
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
```

The dev ports are fixed. OSM only accepts `http` redirect URIs on `127.0.0.1`, and these two are registered.

```bash
bun run check      # type-check, lint, format, tests, knip
bun run e2e        # Playwright (Knotenpunkte), stubbed auth
```

`@playwright/test` is pinned exactly at `1.62.1`. Playwright ships no browsers in `node_modules`; they live in one shared cache (`~/Library/Caches/ms-playwright` on macOS) that every repo on the same version reuses.

## Build

```bash
bun run build
```

`build` runs `build:*` in parallel; each app writes to `dist/<app>/` with the production base `/<app>/`:

- `dist/knotenpunkte/` (base `/knotenpunkte/`)
- `dist/netzanpassungen/` (base `/netzanpassungen/`)

`bun run preview` and `bun run preview-netz` serve one built app locally.

### Adding an app (for example `fortschritt/`)

1. New folder with its own `vite.config.ts`, copied from `netzanpassungen/`: `outDir: dist/<name>`, production `base: /<name>/`, a fixed dev port (`fortschritt`: 33481), `@` and `@shared` aliases, and a `tsconfig.json`.
2. In `package.json`: a `build:<name>` script, a `dev-<name>` script, and the `type-check` and `test-run` steps.
3. In `knip.config.mjs`, `oxlint.config.mjs`, `oxfmt.config.mjs` and the root `tsconfig.json`: the new paths.
4. In `netlify.toml`: the SPA redirect for `/<name>/*`. `fortschritt` already has its redirect and the `X-Robots-Tag: noindex` header.

## Deploy

Netlify builds from `netlify.toml`: `bun install --frozen-lockfile && bun run build`, publishes `dist`. Each app has a rewrite `/<app>/* -> /<app>/index.html` with status 200, which only applies when no file matches, so assets and `osm-oauth-land.html` are served as files. The old GitHub Pages workflow is gone.

## OSM login

The apps share one non-confidential OSM OAuth app (client id in [`shared/config/shared.const.ts`](shared/config/shared.const.ts)). These redirect URIs must be registered on it:

- `http://127.0.0.1:33479/osm-oauth-land.html`
- `http://127.0.0.1:33480/osm-oauth-land.html`
- `https://radnetz-apps.netlify.app/knotenpunkte/osm-oauth-land.html`
- `https://radnetz-apps.netlify.app/netzanpassungen/osm-oauth-land.html`

## Key-value database

Every app stores its data in a project of the shared [key-value database](https://github.com/FixMyBerlin/key-value-db): `knotenpunkte`, `netzanpassungen` (and `infravelo-tracker`). The public project key is in the app's committed `.env`. A project only answers requests from its allowed origins.

## Umzug auf Netlify (noch offen)

Done by a human, in this order:

1. Disable the "Deploy GitHub Pages" workflow in GitHub Actions before pushing this branch to `main`. (The workflow file is deleted here, but the old runs and the Pages setting stay until step 7.)
2. Create the Netlify site `radnetz-apps` from this repo (build settings come from `netlify.toml`).
3. In the KV projects `knotenpunkte`, `netzanpassungen` and `infravelo-tracker`, allow the origin `https://radnetz-apps.netlify.app`. Until then the database answers 403.
4. Add the two production redirect URIs from "OSM login" to the OSM OAuth app.
5. Open `https://radnetz-apps.netlify.app/knotenpunkte/` and `/netzanpassungen/`: log in, rate or draw one thing, reload a deep link such as `/netzanpassungen/data`.
6. Rename the repo to `infravelo-apps` and make it private.
7. Remove GitHub Pages (Settings > Pages) and the OSM redirect URIs and KV origins of `fixmyberlin.github.io`.
