import type { ReactNode } from 'react'

export function StatTile({
  label,
  value,
  detail,
  testId,
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  testId?: string
}) {
  return (
    <div className="rounded-lg bg-zinc-900 p-4 ring-1 ring-white/10" data-testid={testId}>
      <dt className="text-xs font-medium text-zinc-400">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-zinc-50">{value}</dd>
      {detail ? <dd className="mt-1 text-xs text-zinc-400">{detail}</dd> : null}
    </div>
  )
}
