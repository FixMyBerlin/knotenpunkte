import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/index'
import { cn } from '@/shared/cn'
import { statusFilters, type StatusFilter } from '@/shared/ratings/queue'
import { resolveStatusFilter } from '@/shared/routing/search-schema'

const labels: Record<StatusFilter, string> = {
  all: 'Alle',
  unrated: 'Offen',
  rated: 'Bewertet',
  confirmed: 'Bestätigt',
  corrected: 'Korrigiert',
}

export function StatusFilterControl() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const current = resolveStatusFilter(search)

  return (
    <div
      role="tablist"
      aria-label="Statusfilter"
      className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-950/60 p-1"
    >
      {statusFilters.map((filter) => {
        const selected = current === filter
        return (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={selected}
            data-testid={`status-filter-${filter}`}
            className={cn(
              'rounded-md px-2 py-1.5 text-sm font-medium',
              filter === 'all' && 'col-span-2',
              selected
                ? 'bg-white text-zinc-950 shadow-sm'
                : 'text-zinc-300 hover:bg-white/10 hover:text-white',
            )}
            onClick={() => {
              void navigate({
                search: (previous) => ({
                  ...previous,
                  status: filter,
                }),
                replace: true,
              })
            }}
          >
            {labels[filter]}
          </button>
        )
      })}
    </div>
  )
}
