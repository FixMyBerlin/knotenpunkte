import { CircleStackIcon } from '@heroicons/react/20/solid'
import { cn } from '@shared/cn'
import { Tooltip } from '@shared/components/Tooltip/Tooltip'
import { Link } from '@tanstack/react-router'
import type { IndexSearch } from '@/routing/search-schema'

export function NetzDataLink({
  dataPage = false,
  search,
}: {
  dataPage?: boolean
  search?: IndexSearch
}) {
  const label = dataPage
    ? 'Zurück zur Karte'
    : 'Datenbank — gezeichnete Kanten und Knoten als Tabelle'
  return (
    <Tooltip text={label}>
      <Link
        to={dataPage ? '/' : '/data'}
        search={search}
        aria-label={label}
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
