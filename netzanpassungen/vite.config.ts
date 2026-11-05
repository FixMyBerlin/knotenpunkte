import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import browserslistToEsbuild from 'browserslist-to-esbuild'
import { defineConfig } from 'vite'
import {
  appOutDir,
  deployTarget,
  deployTargetDefine,
  productionBase,
} from '../shared/vite/deploy-target'
import { githubPagesSpaFallback, sharedPublicFiles } from '../shared/vite/plugins'

const appRoot = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(appRoot, '..')
const bunLinksCache = path.join(os.homedir(), '.bun/install/cache/links')
const target = deployTarget()
/** `dist/<app>` for Netlify, `dist-pages` (Knotenpunkte at its root) for GitHub Pages. */
const outDir = appOutDir(repoRoot, 'netzanpassungen', target)

/** Netlify: `/netzanpassungen/`, keep in sync with `netlify.toml`. GitHub Pages: below `/knotenpunkte/`. */
const PRODUCTION_BASE = productionBase('netzanpassungen', target)

/** OSM only allows http redirect URIs on 127.0.0.1. 33479 is Knotenpunkte, 33481 Fortschritt. */
const DEV_HOST = '127.0.0.1'
const DEV_PORT = 33480

export default defineConfig(({ mode }) => ({
  root: appRoot,
  base: mode === 'production' ? PRODUCTION_BASE : '/',
  define: deployTargetDefine(target),
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
    ...(target === 'pages' && mode === 'production'
      ? [githubPagesSpaFallback(outDir, { routes: ['data'] })]
      : []),
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
