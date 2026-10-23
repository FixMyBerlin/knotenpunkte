import { cn } from '@shared/cn'
import { Badge } from '@shared/components/ui/badge'
import { Subheading } from '@shared/components/ui/heading'
import { Text } from '@shared/components/ui/text'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useDrawActions } from '@/components/draw-store'
import { useNetwork } from '@/components/use-netz'
import { nearestOnLine, pointAtStation, lineLengthM, type LngLat } from '@/network/geo'
import type { Network } from '@/network/model'
import { Route } from '@/routes/index'

/** A gap counts as drawn when a new edge passes its middle this close. */
const GAP_DONE_DISTANCE_M = 10

function gapMiddle(coords: number[][]): LngLat {
  const line = coords.map((position) => [position[0]!, position[1]!] as LngLat)
  return pointAtStation(line, lineLengthM(line) / 2)
}

function gapDone(network: Network, middle: LngLat) {
  return network.newEdges.some(
    (edge) => nearestOnLine(edge.coords, middle).distanceM <= GAP_DONE_DISTANCE_M,
  )
}

const listButtonClassName =
  'flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-white/5'

export function OverviewPanel() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { gebiet, sel } = Route.useSearch()
  const { network, input, elementNrs, issues } = useNetwork(gebiet)
  const { flyTo } = useDrawActions()
  const [showDone, setShowDone] = useState(false)
  if (!network || !input) return <Text>Lade Netz …</Text>

  const gaps = input.file.luecken.features
    .map((feature, index) => {
      const middle = gapMiddle(feature.geometry.coordinates)
      return {
        index,
        name: feature.properties.name ?? 'Radfernweg',
        lengthM: feature.properties.laenge_m,
        middle,
        done: gapDone(network, middle),
      }
    })
    .sort((a, b) => b.lengthM - a.lengthM)
  const openGaps = gaps.filter((gap) => !gap.done)
  const shownGaps = showDone ? gaps : openGaps

  function open(key: string, lngLat: LngLat) {
    flyTo(lngLat)
    void navigate({
      search: (previous) => ({ ...previous, sel: key, step: 'zeichnen' }),
      replace: true,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <Subheading>Lücken</Subheading>
          <button
            type="button"
            className="text-xs text-sky-400 hover:underline"
            onClick={() => setShowDone(!showDone)}
          >
            {showDone ? 'Nur offene' : 'Auch gezeichnete'}
          </button>
        </div>
        <Text className="text-xs">
          Abschnitte der Radfernwege ohne Kante in 10 m: {openGaps.length} offen,{' '}
          {gaps.length - openGaps.length} mit neuer Kante. Klick zeigt die Lücke.
        </Text>
        <ul className="mt-2 max-h-80 overflow-y-auto" data-testid="gap-list">
          {shownGaps.map((gap) => (
            <li key={gap.index}>
              <button
                type="button"
                className={listButtonClassName}
                onClick={() => flyTo(gap.middle)}
              >
                <span className="min-w-0 truncate">{gap.name}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-400">
                  {gap.done ? <Badge color="green">gezeichnet</Badge> : null}
                  {Math.round(gap.lengthM)} m
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Subheading>Prüfliste</Subheading>
        {issues.length === 0 ? (
          <Text className="text-xs">Keine Auffälligkeiten.</Text>
        ) : (
          <ul className="mt-2 space-y-0.5" data-testid="issue-list">
            {issues.map((issue, index) => {
              const node = network.nodeByKey(issue.target)
              const edge = node ? undefined : network.edgeByKey(issue.target)
              const lngLat = node?.lngLat ?? edge?.coords[0]
              return (
                <li key={`${issue.target}:${index}`}>
                  <button
                    type="button"
                    className={listButtonClassName}
                    onClick={() => lngLat && open(issue.target, lngLat)}
                  >
                    <span className="min-w-0">{issue.message}</span>
                    <Badge color={issue.level === 'fehler' ? 'red' : 'amber'}>{issue.level}</Badge>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div>
        <Subheading>Neue Kanten ({network.newEdges.length})</Subheading>
        <ul className="mt-2 max-h-64 overflow-y-auto">
          {network.newEdges.map((edge) => (
            <li key={edge.key}>
              <button
                type="button"
                className={cn(listButtonClassName, edge.key === sel && 'bg-sky-500/15')}
                onClick={() => open(edge.key, edge.coords[Math.floor(edge.coords.length / 2)]!)}
              >
                <span className="min-w-0 truncate">{elementNrs.get(edge.key)}</span>
                <span className="shrink-0 text-xs text-zinc-400">
                  {edge.stored?.data.routen_fernradweg ?? ''} {Math.round(edge.lengthM)} m
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Subheading>Neue virtuelle Knoten ({network.virtualNodes.length})</Subheading>
        <ul className="mt-2 max-h-64 overflow-y-auto">
          {network.virtualNodes.map((node) => (
            <li key={node.key}>
              <button
                type="button"
                className={cn(listButtonClassName, node.key === sel && 'bg-sky-500/15')}
                onClick={() => open(node.key, node.lngLat)}
              >
                <span className="min-w-0 truncate">{node.name}</span>
                <span className="shrink-0 text-xs text-zinc-400">
                  {node.stored?.data.name === node.stored?.data.name_vorschlag
                    ? 'Vorschlag'
                    : 'von Hand'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
