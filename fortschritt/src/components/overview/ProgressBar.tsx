import { chartColors } from '@/components/colors'
import { formatPercent } from '@/stats/format'

export function ProgressBar({ share, label }: { share: number; label: string }) {
  const width = Math.min(100, Math.max(0, share * 100))
  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
        className="h-2 w-28 overflow-hidden rounded-full bg-zinc-800"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${width}%`, backgroundColor: chartColors.ist }}
        />
      </div>
      <span className="w-14 text-right text-xs text-zinc-300 tabular-nums">
        {formatPercent(share)}
      </span>
    </div>
  )
}
