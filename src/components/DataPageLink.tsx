import { CircleStackIcon } from '@heroicons/react/20/solid'
import { cn } from '@shared/cn'
import { Tooltip } from '@shared/components/Tooltip/Tooltip'
import { Link } from '@tanstack/react-router'
import type { IndexSearch } from '@/shared/routing/search-schema'

type Props = {
  dataPage?: boolean
  /** Search of the rating page; the database page keeps it, so the project stays selected. */
  search?: IndexSearch
}

export function DataPageLink({ dataPage = false, search }: Props) {
  const dataLabel = dataPage
    ? 'Zurück zur Bewertung'
    : 'Bewertungs-Datenbank — Bewertungen des Projekts als Tabelle'
  return (
    <Tooltip text={dataLabel}>
      <Link
        to={dataPage ? '/' : '/data'}
        search={search}
        aria-label={dataLabel}
        data-testid="data-page-link"
        aria-current={dataPage ? 'page' : undefined}
        className={cn(
          'rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white',
          dataPage && 'bg-white/10 text-white',
        )}
      >
        <CircleStackIcon className="size-5" aria-hidden="true" />
      </Link>
    </Tooltip>
  )
}
