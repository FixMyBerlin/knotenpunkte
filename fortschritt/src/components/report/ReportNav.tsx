import { MapIcon } from '@heroicons/react/20/solid'
import { cn } from '@shared/cn'
import type { MouseEvent } from 'react'
import { useActiveSection } from '@/components/report/report-scroll-store'
import { reportSections, type ReportSectionId } from '@/components/report/sections'
import { useFortschrittNav } from '@/components/use-fortschritt-nav'

/**
 * Left-hand navigation: the parts and sections of the report with the one in view highlighted
 * (after the table of contents of the Tailwind Plus "Syntax" template), then the map.
 */
export function ReportNav() {
  const { current, descriptions, goToSection, goToMap } = useFortschrittNav()
  const active = useActiveSection()
  const inReport = current === 'bericht'

  function onSection(event: MouseEvent, id: ReportSectionId) {
    event.preventDefault()
    goToSection(id)
  }

  return (
    <nav aria-label="Inhalt" className="text-sm">
      <ol role="list" className="space-y-5">
        {reportSections.map((part) => {
          const partActive =
            inReport && (part.id === active || part.children.some((child) => child.id === active))
          return (
            <li key={part.id}>
              <a
                href={`#${part.id}`}
                onClick={(event) => onSection(event, part.id)}
                aria-current={partActive ? 'location' : undefined}
                className={cn(
                  'block font-semibold',
                  partActive ? 'text-sky-400' : 'text-zinc-200 hover:text-white',
                )}
              >
                {part.title}
              </a>
              <p className="text-xs text-zinc-500 tabular-nums">{descriptions[part.id]}</p>
              <ol role="list" className="mt-2 space-y-1 border-l border-white/10">
                {part.children.map((child) => {
                  const childActive = inReport && child.id === active
                  return (
                    <li key={child.id}>
                      <a
                        href={`#${child.id}`}
                        onClick={(event) => onSection(event, child.id)}
                        aria-current={childActive ? 'location' : undefined}
                        className={cn(
                          '-ml-px block border-l py-0.5 pl-3',
                          childActive
                            ? 'border-sky-400 text-sky-400'
                            : 'border-transparent text-zinc-400 hover:border-zinc-500 hover:text-zinc-200',
                        )}
                      >
                        {child.title}
                      </a>
                    </li>
                  )
                })}
              </ol>
            </li>
          )
        })}
        <li>
          <a
            href="?view=karte"
            onClick={(event) => {
              event.preventDefault()
              goToMap()
            }}
            aria-current={current === 'karte' ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 font-semibold',
              current === 'karte' ? 'text-sky-400' : 'text-zinc-200 hover:text-white',
            )}
          >
            <MapIcon className="size-4" aria-hidden="true" />
            Karte
          </a>
          <p className="pl-6 text-xs text-zinc-500 tabular-nums">{descriptions.karte}</p>
        </li>
      </ol>
    </nav>
  )
}
