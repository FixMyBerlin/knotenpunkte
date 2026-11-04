import { readdirSync, readFileSync } from 'node:fs'
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
