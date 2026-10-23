/**
 * Version of each KV entry as last read or written here. A save sends it along (`If-Match`), so
 * the store refuses to overwrite an entry that somebody else changed in the meantime.
 */
export function createVersionTracker() {
  const versions = new Map<string, number>()
  return {
    /** From a list; one that was requested before a save of ours may arrive after it. */
    seen(id: string, version: number) {
      versions.set(id, Math.max(version, versions.get(id) ?? 0))
    },
    saved(id: string, version: number) {
      versions.set(id, version)
    },
    /** Options for `put`; a new entry has no version yet. */
    putOptions(id: string) {
      const version = versions.get(id)
      return version === undefined ? undefined : { ifMatch: `"${version}"` }
    },
  }
}
