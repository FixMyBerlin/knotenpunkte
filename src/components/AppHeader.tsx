import { Bars3Icon, CircleStackIcon } from '@heroicons/react/20/solid'
import { Link } from '@tanstack/react-router'
import { AuthButton } from '@/components/AuthButton'
import { Tooltip } from '@/components/shared/Tooltip/Tooltip'
import { StepNav, type StepNavItem } from '@/components/StepNav'
import { cn } from '@/shared/cn'
import type { AppStep } from '@/shared/routing/app-step'
import type { IndexSearch } from '@/shared/routing/search-schema'

type Props = {
  steps: StepNavItem[]
  onSelect: (id: AppStep) => void
  onOpenSidebar?: () => void
  dataPage?: boolean
  /** Search of the rating page; the database page keeps it, so the project stays selected. */
  search?: IndexSearch
}

export function AppHeader({ steps, onSelect, onOpenSidebar, dataPage = false, search }: Props) {
  const dataLabel = dataPage
    ? 'Zurück zur Bewertung'
    : 'Bewertungs-Datenbank — Bewertungen des Projekts als Tabelle'
  return (
    <header className="shrink-0 border-b border-white/10 bg-zinc-900">
      <div className="flex min-h-11 items-stretch">
        {onOpenSidebar ? (
          <div className="flex shrink-0 items-center pl-1 lg:hidden">
            <Tooltip text="Seitenleiste öffnen">
              <button
                type="button"
                className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Seitenleiste öffnen"
                onClick={onOpenSidebar}
              >
                <Bars3Icon className="size-5" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        ) : null}
        <StepNav steps={steps} onSelect={onSelect} />
        <div className="flex shrink-0 items-center gap-1 pr-3 pl-2">
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
          <AuthButton />
        </div>
      </div>
    </header>
  )
}
