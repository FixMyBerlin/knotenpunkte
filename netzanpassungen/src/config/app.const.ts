/**
 * KV project of Netzanpassungen. `kvApiKey` is a public project selector (`X-Api-Key`), not an
 * admin secret. Values come from the committed `netzanpassungen/.env` (`VITE_KV_*`).
 */
export const kvProject = import.meta.env.VITE_KV_PROJECT
export const kvApiKey = import.meta.env.VITE_KV_API_KEY

/** Without a project key the app stores in this browser only, to try it out. */
export function isKvConfigured() {
  return Boolean(kvApiKey) && kvApiKey !== 'REPLACE_ME'
}

export const appTitle = 'Netzanpassungen'
