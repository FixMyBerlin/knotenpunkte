import path from 'node:path'

/**
 * Where a build is deployed. `netlify` (default) serves the apps at `/<app>/` from `dist/`.
 * `pages` is the old GitHub Pages site of the repo `knotenpunkte`: Knotenpunkte at the project root,
 * the other apps in subfolders, all in `dist-pages/`. The `pages` target goes away with the move
 * to Netlify (see "Umzug" in the root README).
 */
export type DeployTarget = 'netlify' | 'pages'

export type AppName = 'knotenpunkte' | 'netzanpassungen' | 'fortschritt'

export function deployTarget(): DeployTarget {
  const value = process.env.DEPLOY_TARGET ?? 'netlify'
  if (value !== 'netlify' && value !== 'pages') {
    throw new Error(`DEPLOY_TARGET must be "netlify" or "pages", got "${value}"`)
  }
  return value
}

/** Production base of an app. Keep the Netlify values in sync with the redirects in `netlify.toml`. */
export function productionBase(app: AppName, target: DeployTarget = deployTarget()) {
  if (target === 'netlify') return `/${app}/`
  return app === 'knotenpunkte' ? '/knotenpunkte/' : `/knotenpunkte/${app}/`
}

/** Output folder of an app: one folder per app in `dist`, or Knotenpunkte at the root of `dist-pages`. */
export function appOutDir(repoRoot: string, app: AppName, target: DeployTarget = deployTarget()) {
  if (target === 'netlify') return path.resolve(repoRoot, 'dist', app)
  const root = path.resolve(repoRoot, 'dist-pages')
  return app === 'knotenpunkte' ? root : path.join(root, app)
}

/** Build-time constant for the app code, read by `shared/config/deploy-target.ts`. */
export function deployTargetDefine(target: DeployTarget = deployTarget()) {
  return { 'import.meta.env.VITE_DEPLOY_TARGET': JSON.stringify(target) }
}
