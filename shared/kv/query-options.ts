/**
 * Options for every query that reads from the KV database, as each read is billed. The cache stays
 * fresh for a few minutes, so remounting a component or returning to the tab does not read again.
 * Saves still refresh what they change (`invalidateQueries`).
 */
export const kvQueryOptions = {
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const
