import { useRef } from 'react'
import { OverviewView } from '@/components/overview/OverviewView'
import { PeopleView } from '@/components/people/PeopleView'
import { usePendingSection, useReportScrollActions } from '@/components/report/report-scroll-store'
import { reportSectionIds, type ReportSectionId } from '@/components/report/sections'
import { Route } from '@/routes/index'
import type { Dataset } from '@/stats/model'

/** A section counts as current once its heading is this close to the top of the report. */
const activeOffsetPx = 32

/** Überblick and Personen on one scrolling page; the sidebar follows the scroll position. */
export function ReportView({ dataset }: { dataset: Dataset }) {
  const search = Route.useSearch()
  const pending = usePendingSection()
  const { setActive, setPending } = useReportScrollActions()
  const scrolledInitially = useRef(false)

  function updateActive(container: HTMLElement) {
    const top = container.getBoundingClientRect().top
    let current: ReportSectionId = reportSectionIds[0]!
    for (const id of reportSectionIds) {
      const element = document.getElementById(id)
      if (element && element.getBoundingClientRect().top - top <= activeOffsetPx) current = id
    }
    const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 2
    setActive(atBottom ? reportSectionIds.at(-1)! : current)
  }

  function attach(container: HTMLDivElement | null) {
    if (!container || scrolledInitially.current) return
    scrolledInitially.current = true
    const target = pending ?? (search.view === 'personen' ? 'personen' : null)
    if (target) document.getElementById(target)?.scrollIntoView({ block: 'start' })
    setPending(null)
    updateActive(container)
  }

  return (
    <div
      ref={attach}
      onScroll={(event) => updateActive(event.currentTarget)}
      className="h-full overflow-y-auto"
      data-testid="report"
    >
      <div className="mx-auto max-w-5xl space-y-14 p-4 pb-24 sm:p-6 sm:pb-32">
        <OverviewView dataset={dataset} />
        <PeopleView dataset={dataset} />
      </div>
    </div>
  )
}
