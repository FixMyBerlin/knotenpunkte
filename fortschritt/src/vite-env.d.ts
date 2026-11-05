/// <reference types="vite/client" />

/** Read by `shared/` (not used by Fortschritt, which keeps its KV settings in `config/`). */
interface ImportMetaEnv {
  readonly VITE_KV_BASE_URL: string
  /** "pages" or "netlify", set at build time from DEPLOY_TARGET. */
  readonly VITE_DEPLOY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
