import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import { useState } from 'react'
import { Tooltip } from '@/components/shared/Tooltip/Tooltip'
import { streetsLegend } from '@/shared/map/streets'

export function StreetsLegend({
  streetsOn,
  onStreetsChange,
}: {
  streetsOn: boolean
  onStreetsChange: (on: boolean) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="max-w-64 rounded-lg bg-zinc-900/90 px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/10">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-pressed={streetsOn}
          data-testid="streets-toggle"
          className="rounded px-1.5 py-0.5 font-medium ring-1 ring-white/20 hover:bg-white/10"
          onClick={() => onStreetsChange(!streetsOn)}
        >
          {streetsOn ? 'An' : 'Aus'}
        </button>
        <span className="min-w-0 flex-1 truncate font-medium">Straßennetz Berlin</span>
        <Tooltip text={open ? 'Legende schließen' : 'Legende öffnen'}>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="streets-legend-list"
            data-testid="streets-legend-toggle"
            className="rounded p-0.5 hover:bg-white/10"
            aria-label={open ? 'Legende schließen' : 'Legende öffnen'}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? (
              <ChevronDownIcon className="size-4" aria-hidden />
            ) : (
              <ChevronRightIcon className="size-4" aria-hidden />
            )}
          </button>
        </Tooltip>
      </div>
      {open ? (
        <ul id="streets-legend-list" className="mt-2 space-y-1">
          {streetsLegend.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <span
                className="mt-1 inline-block h-0.5 w-4 shrink-0"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              <span>{item.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
