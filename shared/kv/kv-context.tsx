import type { KvClient } from '@shared/kv-client'
import { createContext, useContext, type ReactNode } from 'react'

const KvClientContext = createContext<KvClient<unknown> | null>(null)

/** The app's KV client, for the login (`me`, `forget`). */
export function KvClientProvider({
  client,
  children,
}: {
  client: KvClient<unknown>
  children: ReactNode
}) {
  return <KvClientContext value={client}>{children}</KvClientContext>
}

export function useKvClient() {
  const client = useContext(KvClientContext)
  if (!client) throw new Error('KvClientProvider fehlt')
  return client
}
