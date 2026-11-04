import { chartColors } from '@/components/colors'
import { formatDayShort, formatKm, formatNumber } from '@/stats/format'
import type { WeekBucket } from '@/stats/series'
import { niceTicks } from '@/stats/ticks'

const W = 320
const H = 120
const M = { top: 10, right: 8, bottom: 20, left: 32 }

/** Bar with 4px rounded top corners, anchored to the baseline. */
function barPath(x: number, y: number, width: number, height: number) {
  const r = Math.min(4, width / 2, height)
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`
}

/** km per week of one account with the needed km/week as a line. */
export function WeeklyColumns({
  weeks,
  neededPerWeek,
  color,
  account,
}: {
  weeks: WeekBucket[]
  neededPerWeek: number
  color: string
  account: string
}) {
  const needed = Number.isFinite(neededPerWeek) ? neededPerWeek : 0
  const max = Math.max(needed, ...weeks.map((week) => week.km), 1)
  const ticks = niceTicks(max * 1.1, 2)
  const yMax = ticks.at(-1) ?? max
  const innerW = W - M.left - M.right
  const slot = innerW / Math.max(weeks.length, 1)
  const barW = Math.max(2, Math.min(28, slot - 2))
  const y = (v: number) => H - M.bottom - (v / yMax) * (H - M.top - M.bottom)
  const labelEvery = Math.ceil(weeks.length / 6)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full max-w-sm"
      role="img"
      aria-label={`${account}: km je Woche, nötig ${formatKm(needed)} je Woche`}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={M.left}
            x2={W - M.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke={tick === 0 ? chartColors.baseline : chartColors.grid}
          />
          <text
            x={M.left - 4}
            y={y(tick)}
            dy="0.32em"
            textAnchor="end"
            fontSize={10}
            fill={chartColors.muted}
          >
            {formatNumber(tick).replace(',0', '')}
          </text>
        </g>
      ))}
      {weeks.map((week, index) => {
        const x = M.left + index * slot + (slot - barW) / 2
        const height = y(0) - y(week.km)
        return (
          <g key={week.week}>
            {week.km > 0 ? (
              <path
                d={barPath(x, y(week.km), barW, height)}
                fill={color}
                opacity={week.partial ? 0.5 : 1}
              />
            ) : null}
            <rect
              x={M.left + index * slot}
              y={M.top}
              width={slot}
              height={y(0) - M.top}
              fill="transparent"
            >
              <title>
                {`Woche ab ${formatDayShort(week.week)}: ${formatKm(week.km)}, ${week.edges} Kanten${week.partial ? ' (läuft noch)' : ''}`}
              </title>
            </rect>
            {index % labelEvery === 0 ? (
              <text
                x={M.left + index * slot + slot / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize={10}
                fill={chartColors.muted}
              >
                {formatDayShort(week.week)}
              </text>
            ) : null}
          </g>
        )
      })}
      {needed > 0 ? (
        <g>
          <line
            x1={M.left}
            x2={W - M.right}
            y1={y(needed)}
            y2={y(needed)}
            stroke={chartColors.soll}
            strokeDasharray="5 3"
            strokeWidth={1.5}
          />
          <text
            x={W - M.right}
            y={y(needed) - 4}
            textAnchor="end"
            fontSize={10}
            fill={chartColors.inkSecondary}
          >
            nötig {formatNumber(needed)}
          </text>
        </g>
      ) : null}
    </svg>
  )
}
