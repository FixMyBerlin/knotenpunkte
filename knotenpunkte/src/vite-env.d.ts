/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KV_BASE_URL: string
  readonly VITE_KV_PROJECT: string
  readonly VITE_KV_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
