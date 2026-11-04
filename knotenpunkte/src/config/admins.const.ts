/**
 * OSM display names that may always run QA (Bestätigen / Problematisch), including
 * on their own ratings. This is a UI-only guard — the KV worker only enforces write
 * access, not this list.
 */
export const adminOsmDisplayNames = ['tordans', 'Supaplex030'] as const

export function isAdmin(displayName: string | undefined | null): boolean {
  if (!displayName) return false
  return (adminOsmDisplayNames as readonly string[]).includes(displayName)
}
