import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/index'
import { cn } from '@/shared/cn'
import { statusFilters, type StatusFilter } from '@/shared/ratings/queue'
import { resolveStatusFilter, resolveView } from '@/shared/routing/search-schema'

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
  const view = resolveView(search)

  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Statusfilter">
      {statusFilters.map((filter) => (
        <button
          key={filter}
          type="button"
          data-testid={`status-filter-${filter}`}
          aria-pressed={current === filter}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium',
            current === filter ? 'bg-sky-500/30 text-white' : 'text-zinc-400 hover:bg-white/10',
          )}
          onClick={() => {
            void navigate({
              search: (previous) => ({
                ...previous,
                status: filter,
                view,
              }),
              replace: true,
            })
          }}
        >
          {labels[filter]}
        </button>
      ))}
    </div>
  )
}
