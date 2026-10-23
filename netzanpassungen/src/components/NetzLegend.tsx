import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import { useState } from 'react'

const entries = [
  { label: 'REN+ Radvorrangnetz', color: '#A21CAF', style: 'line' },
  { label: 'REN+ Radergänzungsnetz', color: '#F49E00', style: 'line' },
  { label: 'REN+ sonstige', color: '#1d4ed8', style: 'line' },
  { label: 'Radfernweg', color: '#16a34a', style: 'wide' },
  { label: 'Lücke (Radfernweg ohne Kante)', color: '#dc2626', style: 'dashed' },
  { label: 'Neue Kante', color: '#a855f7', style: 'line' },
  { label: 'Knotenvorschlag (Kreuzung)', color: '#ea580c', style: 'ring' },
  { label: 'Virtueller Knoten, neu', color: '#a855f7', style: 'dot' },
  { label: 'Virtueller Knoten, Bestand', color: '#d8b4fe', style: 'dot' },
] as const

function Swatch({ color, style }: { color: string; style: (typeof entries)[number]['style'] }) {
  if (style === 'ring') {
    return (
      <span className="size-2.5 rounded-full bg-white" style={{ border: `2px solid ${color}` }} />
    )
  }
  if (style === 'dot') {
    return (
      <span className="size-2.5 rounded-full ring-1 ring-white" style={{ background: color }} />
    )
  }
  return (
    <span
      className="h-0 w-5"
      style={{
        borderTop: `${style === 'wide' ? 6 : 3}px ${style === 'dashed' ? 'dashed' : 'solid'} ${color}`,
        opacity: style === 'wide' ? 0.6 : 1,
      }}
    />
  )
}

export function NetzLegend() {
  const [open, setOpen] = useState(false)
  return (
    <div className="max-w-64 rounded-lg bg-zinc-900/90 px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/10">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 font-medium"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDownIcon className="size-4" aria-hidden />
        ) : (
          <ChevronRightIcon className="size-4" aria-hidden />
        )}
        Netz
      </button>
      {open ? (
        <ul className="mt-2 space-y-1">
          {entries.map((entry) => (
            <li key={entry.label} className="flex items-center gap-2">
              <span className="flex w-5 justify-center">
                <Swatch color={entry.color} style={entry.style} />
              </span>
              {entry.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
