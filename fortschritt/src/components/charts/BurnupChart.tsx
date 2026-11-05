import { useState, type PointerEvent } from 'react'
import { chartColors } from '@/components/colors'
import { formatDay, formatDayShort, formatKm, formatNumber, formatPercent } from '@/stats/format'
import { sollAt } from '@/stats/series'
import type { ScopeStatus } from '@/stats/status'
import { monthStarts, niceTicks } from '@/stats/ticks'

type Props = {
  status: ScopeStatus
  unit: 'km' | 'prozent'
  now: number
  start: number
}

const W = 760
const H = 300
const M = { top: 20, right: 20, bottom: 28, left: 56 }
const monthFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'UTC', month: 'short' })

/**
 * Burn-up: done km (cumulative, end of each week), the target, the straight Soll line and the
 * forecast (pace of the last 4 weeks in work time). y in km or in % of the target.
 */
export function BurnupChart({ status, unit, now, start }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const { scope, targetKm, points } = status
  const end = scope.end
  const target = targetKm > 0 ? targetKm : 1
  const value = (km: number) => (unit === 'prozent' ? (km / target) * 100 : km)
  const label = (km: number) => (unit === 'prozent' ? formatPercent(km / target) : formatKm(km))

  const maxValue = value(target) * 1.05
  const ticks = niceTicks(maxValue, 5)
  const yMax = Math.max(maxValue, ticks.at(-1) ?? maxValue)
  const x = (t: number) => M.left + ((t - start) / (end - start)) * (W - M.left - M.right)
  const y = (v: number) => H - M.bottom - (v / yMax) * (H - M.top - M.bottom)

  const sollTimes = [
    ...new Set([start, end, ...scope.segments.flatMap((segment) => [segment.from, segment.to])]),
  ]
    .filter((t) => t >= start && t <= end)
    .sort((a, b) => a - b)
  const sollPath = sollTimes
    .map((t) => `${x(t).toFixed(1)},${y(value(sollAt(scope.segments, t))).toFixed(1)}`)
    .join(' ')
  const istPath = points.map((p) => `${x(p.t).toFixed(1)},${y(value(p.km)).toFixed(1)}`).join(' ')

  const doneKm = status.doneKm
  const forecastPath =
    doneKm < targetKm
      ? status.forecastPoints
          .filter((point) => point.t <= end)
          .map((point) => `${x(point.t).toFixed(1)},${y(value(point.km)).toFixed(1)}`)
          .join(' ')
      : ''
  const last = points.at(-1)

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!box || box.width === 0) return
    const svgX = ((event.clientX - box.left) / box.width) * W
    const t = start + ((svgX - M.left) / (W - M.left - M.right)) * (end - start)
    let nearest = 0
    points.forEach((point, index) => {
      if (Math.abs(point.t - t) < Math.abs((points[nearest]?.t ?? 0) - t)) nearest = index
    })
    setHover(nearest)
  }

  const hovered = hover === null ? undefined : points[hover]

  return (
    <figure className="space-y-2" data-testid="burnup">
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-300">
        <LegendItem color={chartColors.ist} text="Erledigt" />
        <LegendItem color={chartColors.soll} dashed text="Soll (gerade Linie bis zur Deadline)" />
        <LegendItem color={chartColors.ist} dashed text="Prognose (Ø 4 Wochen, Arbeitszeit)" />
        <LegendItem color={chartColors.muted} dotted text={`Ziel ${formatKm(targetKm)}`} />
      </figcaption>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Burn-up ${scope.label}: ${formatKm(doneKm)} von ${formatKm(targetKm)} erledigt, Soll heute ${formatKm(status.sollKm)}.`}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={M.left}
                x2={W - M.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke={tick === 0 ? chartColors.baseline : chartColors.grid}
                strokeWidth={1}
              />
              <text
                x={M.left - 8}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                fontSize={11}
                fill={chartColors.muted}
                className="tabular-nums"
              >
                {unit === 'prozent' ? `${tick} %` : formatNumber(tick).replace(',0', '')}
              </text>
            </g>
          ))}
          {monthStarts(start, end).map((day) => (
            <text
              key={day}
              x={x(day)}
              y={H - 8}
              textAnchor="middle"
              fontSize={11}
              fill={chartColors.muted}
            >
              {monthFormat.format(new Date(day * 86_400_000))}
            </text>
          ))}

          <line
            x1={M.left}
            x2={W - M.right}
            y1={y(value(targetKm))}
            y2={y(value(targetKm))}
            stroke={chartColors.muted}
            strokeDasharray="1 4"
            strokeLinecap="round"
            strokeWidth={1.5}
          />
          <text
            x={W - M.right}
            y={y(value(targetKm)) - 6}
            textAnchor="end"
            fontSize={11}
            fill={chartColors.inkSecondary}
          >
            Ziel {label(targetKm)}
          </text>

          {now >= start && now <= end ? (
            <g>
              <line
                x1={x(now)}
                x2={x(now)}
                y1={M.top}
                y2={H - M.bottom}
                stroke={chartColors.baseline}
                strokeWidth={1}
              />
              <text x={x(now) + 4} y={M.top + 10} fontSize={11} fill={chartColors.muted}>
                heute
              </text>
            </g>
          ) : null}

          <polyline
            points={sollPath}
            fill="none"
            stroke={chartColors.soll}
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
          {forecastPath ? (
            <polyline
              points={forecastPath}
              fill="none"
              stroke={chartColors.ist}
              strokeWidth={2}
              strokeDasharray="4 4"
              opacity={0.7}
            />
          ) : null}
          <polyline
            points={istPath}
            fill="none"
            stroke={chartColors.ist}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {last ? (
            <>
              <circle
                cx={x(last.t)}
                cy={y(value(last.km))}
                r={4}
                fill={chartColors.ist}
                stroke="#18181b"
                strokeWidth={2}
              />
              <text
                x={x(last.t) + 8}
                y={y(value(last.km)) - 8}
                fontSize={12}
                fill={chartColors.ink}
                fontWeight={500}
              >
                {label(last.km)}
              </text>
            </>
          ) : null}

          {hovered ? (
            <g pointerEvents="none">
              <line
                x1={x(hovered.t)}
                x2={x(hovered.t)}
                y1={M.top}
                y2={H - M.bottom}
                stroke={chartColors.inkSecondary}
                strokeWidth={1}
              />
              <circle
                cx={x(hovered.t)}
                cy={y(value(hovered.km))}
                r={4}
                fill={chartColors.ist}
                stroke="#18181b"
                strokeWidth={2}
              />
            </g>
          ) : null}
          <rect
            x={M.left}
            y={M.top}
            width={W - M.left - M.right}
            height={H - M.top - M.bottom}
            fill="transparent"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {hovered ? (
          <div
            className="pointer-events-none absolute top-2 rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-100 shadow-lg ring-1 ring-white/10"
            style={{
              left: `${(x(hovered.t) / W) * 100}%`,
              transform: x(hovered.t) > W / 2 ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)',
            }}
          >
            <p className="font-medium">
              {hover === 0
                ? 'Start'
                : hovered.t >= now
                  ? 'heute'
                  : `bis ${formatDay(hovered.t - 1)}`}
            </p>
            <p>Erledigt: {label(hovered.km)}</p>
            <p className="text-zinc-400">Soll: {label(sollAt(scope.segments, hovered.t))}</p>
          </div>
        ) : null}
      </div>
      <details className="text-xs text-zinc-400">
        <summary>Als Tabelle</summary>
        <table className="mt-2 tabular-nums">
          <thead>
            <tr className="text-left">
              <th className="pr-4 font-medium">bis</th>
              <th className="pr-4 text-right font-medium">erledigt</th>
              <th className="pr-4 text-right font-medium">Soll</th>
              <th className="text-right font-medium">in der Woche</th>
            </tr>
          </thead>
          <tbody>
            {points.slice(1).map((point, index) => (
              <tr key={point.t}>
                <td className="pr-4">{point.t >= now ? 'heute' : formatDayShort(point.t - 1)}</td>
                <td className="pr-4 text-right">{formatKm(point.km)}</td>
                <td className="pr-4 text-right">{formatKm(sollAt(scope.segments, point.t))}</td>
                <td className="text-right">{formatKm(point.km - (points[index]?.km ?? 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

function LegendItem({
  color,
  text,
  dashed,
  dotted,
}: {
  color: string
  text: string
  dashed?: boolean
  dotted?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="20" height="8" aria-hidden="true">
        <line
          x1="1"
          x2="19"
          y1="4"
          y2="4"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={dotted ? '1 3' : dashed ? '5 3' : undefined}
          strokeLinecap="round"
        />
      </svg>
      {text}
    </span>
  )
}
