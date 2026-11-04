import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import browserslistToEsbuild from 'browserslist-to-esbuild'
import { defineConfig } from 'vite'
import { sharedPublicFiles } from '../shared/vite/plugins'

const appRoot = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(appRoot, '..')
const bunLinksCache = path.join(os.homedir(), '.bun/install/cache/links')
/** Every app builds into its own folder of `dist`, which is the Netlify publish directory. */
const outDir = path.resolve(repoRoot, 'dist/netzanpassungen')

/** Path of the app on the Netlify site. Keep in sync with the redirects in `netlify.toml`. */
const PRODUCTION_BASE = '/netzanpassungen/'

/** OSM only allows http redirect URIs on 127.0.0.1. 33479 is Knotenpunkte, 33481 Fortschritt. */
const DEV_HOST = '127.0.0.1'
const DEV_PORT = 33480

export default defineConfig(({ mode }) => ({
  root: appRoot,
  base: mode === 'production' ? PRODUCTION_BASE : '/',
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: path.join(appRoot, 'src/routes'),
      generatedRouteTree: path.join(appRoot, 'src/routeTree.gen.ts'),
    }),
    tailwindcss(),
    react({ compiler: true }),
    sharedPublicFiles(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(appRoot, 'src'),
      '@shared': path.resolve(repoRoot, 'shared'),
    },
  },
  server: {
    host: DEV_HOST,
    port: DEV_PORT,
    strictPort: true,
    fs: {
      allow: [repoRoot, bunLinksCache],
    },
  },
  preview: {
    host: DEV_HOST,
    port: DEV_PORT,
    strictPort: true,
  },
  build: {
    target: browserslistToEsbuild(),
    outDir,
    emptyOutDir: true,
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: ['maplibre-gl/dist/maplibre-gl-worker.mjs'],
  },
}))
