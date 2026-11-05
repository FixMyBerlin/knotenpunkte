/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KV_BASE_URL: string
  /** "pages" or "netlify", set at build time from DEPLOY_TARGET. */
  readonly VITE_DEPLOY_TARGET?: string
  readonly VITE_KV_PROJECT: string
  readonly VITE_KV_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
