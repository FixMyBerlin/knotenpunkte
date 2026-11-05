import { copyFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const sharedPublicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public')

/**
 * Files every app serves at their base: the OSM OAuth land page and the favicon. Vite has one
 * `publicDir` per app, so these come from `shared/public` in dev and in the build.
 */
export function sharedPublicFiles(): Plugin {
  const files = readdirSync(sharedPublicDir)
  return {
    name: 'shared-public-files',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
        const base = server.config.base
        const name = pathname.startsWith(base) ? pathname.slice(base.length) : null
        if (!name || !files.includes(name)) {
          next()
          return
        }
        response.setHeader('Content-Type', name.endsWith('.svg') ? 'image/svg+xml' : 'text/html')
        response.end(readFileSync(path.join(sharedPublicDir, name)))
      })
    },
    generateBundle() {
      for (const name of files) {
        this.emitFile({
          type: 'asset',
          fileName: name,
          source: readFileSync(path.join(sharedPublicDir, name)),
        })
      }
    },
  }
}

/**
 * GitHub Pages only: it serves the `404.html` of the site root for every unknown path, so the
 * root app (`notFound: true`) copies its `index.html` to `404.html`, which makes its own deep links
 * (`/knotenpunkte/data`) work. Apps in a subfolder would get that same page for their deep links,
 * so each of their routes besides `/` gets a copy of the app's `index.html` instead (`routes`).
 * Not used for Netlify, which has real rewrites in `netlify.toml`.
 */
export function githubPagesSpaFallback(
  outDir: string,
  { routes = [], notFound = false }: { routes?: string[]; notFound?: boolean } = {},
): Plugin {
  return {
    name: 'github-pages-spa-fallback',
    closeBundle() {
      const index = path.join(outDir, 'index.html')
      if (notFound) copyFileSync(index, path.join(outDir, '404.html'))
      for (const route of routes) {
        const dir = path.join(outDir, route)
        mkdirSync(dir, { recursive: true })
        copyFileSync(index, path.join(dir, 'index.html'))
      }
    },
  }
}
