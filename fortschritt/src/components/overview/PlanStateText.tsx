import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid'
import { formatKm } from '@/stats/format'
import type { PlanState } from '@/stats/status'

/** "im Plan" / "x km voraus" / "x km hinterher", with an icon, not colour alone. */
export function PlanStateText({ state, diffKm }: { state: PlanState; diffKm: number }) {
  switch (state) {
    case 'im-plan':
      return (
        <span className="inline-flex items-center gap-1.5">
          <CheckCircleIcon className="size-5 text-green-500" aria-hidden="true" />
          im Plan
        </span>
      )
    case 'voraus':
      return (
        <span className="inline-flex items-center gap-1.5">
          <CheckCircleIcon className="size-5 text-green-500" aria-hidden="true" />
          {formatKm(diffKm)} voraus
        </span>
      )
    case 'hinterher':
      return (
        <span className="inline-flex items-center gap-1.5">
          <ExclamationTriangleIcon className="size-5 text-amber-400" aria-hidden="true" />
          {formatKm(-diffKm)} hinterher
        </span>
      )
  }
}
