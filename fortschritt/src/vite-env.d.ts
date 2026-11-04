/// <reference types="vite/client" />

/** Read by `shared/` (not used by Fortschritt, which keeps its KV settings in `config/`). */
interface ImportMetaEnv {
  readonly VITE_KV_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
