import { streetsLegend } from '@/shared/map/streets'

export function StreetsLegend() {
  return (
    <div className="max-w-64 rounded-lg bg-zinc-900/90 px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/10">
      <div className="mb-1 font-medium">Straßennetz Berlin</div>
      <ul className="space-y-1">
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
    </div>
  )
}
