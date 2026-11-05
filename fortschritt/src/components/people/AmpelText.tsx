import {
  ArrowUpCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  MinusCircleIcon,
} from '@heroicons/react/20/solid'
import { ampelLabels, type Ampel } from '@/stats/accounts'

const icons = {
  keine: { Icon: MinusCircleIcon, className: 'text-zinc-500' },
  fertig: { Icon: CheckCircleIcon, className: 'text-green-500' },
  gruen: { Icon: CheckCircleIcon, className: 'text-green-500' },
  gelb: { Icon: ClockIcon, className: 'text-amber-300' },
  rot: { Icon: ArrowUpCircleIcon, className: 'text-orange-400' },
} as const

export function AmpelText({ ampel, ratio }: { ampel: Ampel; ratio: number | null }) {
  const { Icon, className } = icons[ampel]
  return (
    <span className="inline-block" data-ampel={ampel}>
      <span className="inline-flex items-center gap-1.5">
        <Icon className={`size-4 ${className}`} aria-hidden="true" />
        {ampelLabels[ampel]}
      </span>
      {ratio !== null ? (
        <span className="block pl-5.5 text-xs text-zinc-400 tabular-nums">
          {Math.round(ratio * 100)} % des nötigen Tempos
        </span>
      ) : null}
    </span>
  )
}
