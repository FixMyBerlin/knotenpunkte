import { copyFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const sharedPublicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public')

/**
 * Files both apps serve at their base: the OSM OAuth land page and the favicon. Vite has one
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
 * GitHub Pages serves `404.html` for unknown paths, so deep links into the SPA load it. Each
 * route that is not `/` also gets its own `index.html` (for apps below the site root, whose
 * paths the root `404.html` of the other app would catch).
 */
export function githubPagesSpaFallback(outDir: string, routes: string[] = []): Plugin {
  return {
    name: 'github-pages-spa-fallback',
    closeBundle() {
      const index = path.join(outDir, 'index.html')
      copyFileSync(index, path.join(outDir, '404.html'))
      for (const route of routes) {
        const dir = path.join(outDir, route)
        mkdirSync(dir, { recursive: true })
        copyFileSync(index, path.join(dir, 'index.html'))
      }
    },
  }
}
