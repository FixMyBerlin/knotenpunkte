import { Bars3Icon } from '@heroicons/react/20/solid'
import { AuthButton } from '@shared/components/AuthButton'
import { StepNav, type StepNavItem } from '@shared/components/StepNav'
import { Tooltip } from '@shared/components/Tooltip/Tooltip'
import type { ReactNode } from 'react'

type Props<Id extends string> = {
  title: string
  steps: StepNavItem<Id>[]
  onSelect: (id: Id) => void
  onOpenSidebar?: () => void
  /** Buttons of the app, left of the login. */
  actions?: ReactNode
}

export function AppHeader<Id extends string>({
  title,
  steps,
  onSelect,
  onOpenSidebar,
  actions,
}: Props<Id>) {
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
        <StepNav title={title} steps={steps} onSelect={onSelect} />
        <div className="flex shrink-0 items-center gap-1 pr-3 pl-2">
          {actions}
          <AuthButton />
        </div>
      </div>
    </header>
  )
}
