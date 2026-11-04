import { isAdmin } from '@/config/admins.const'

export function canRunQa(opts: {
  displayName: string | undefined | null
  createdBy: string | undefined
}) {
  if (!opts.displayName || !opts.createdBy) return false
  if (isAdmin(opts.displayName)) return true
  return opts.displayName !== opts.createdBy
}
