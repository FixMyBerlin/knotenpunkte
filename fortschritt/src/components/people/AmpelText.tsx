import {
  ArrowUpCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  MinusCircleIcon,
} from '@heroicons/react/20/solid'
import { rampUp } from '@/config/plan.const'
import { ampelLabels, type Ampel } from '@/stats/accounts'
import { formatDayShort } from '@/stats/format'

const icons = {
  keine: { Icon: MinusCircleIcon, className: 'text-zinc-500' },
  fertig: { Icon: CheckCircleIcon, className: 'text-green-500' },
  gruen: { Icon: CheckCircleIcon, className: 'text-green-500' },
  gelb: { Icon: ClockIcon, className: 'text-amber-300' },
  rot: { Icon: ArrowUpCircleIcon, className: 'text-orange-400' },
} as const

export function AmpelText({
  ampel,
  ratio,
  anlernBis,
}: {
  ampel: Ampel
  ratio: number | null
  anlernBis: number | null
}) {
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
      {anlernBis !== null ? (
        <span className="block pl-5.5 text-xs text-sky-300" data-testid="anlernphase">
          Anlernphase bis {formatDayShort(anlernBis)}: {Math.round(rampUp.factor * 100)} % reichen
        </span>
      ) : null}
    </span>
  )
}
