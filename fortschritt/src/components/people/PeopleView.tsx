import { ClipboardDocumentIcon } from '@heroicons/react/20/solid'
import { Badge } from '@shared/components/ui/badge'
import { Button } from '@shared/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/components/ui/table'
import { nowIso } from '@shared/now-iso'
import { useState } from 'react'
import { WeeklyColumns } from '@/components/charts/WeeklyColumns'
import { accountColor } from '@/components/colors'
import { AmpelText } from '@/components/people/AmpelText'
import { PartHeading } from '@/components/report/PartHeading'
import { Toggle } from '@/components/Toggle'
import { useUpdateSearch } from '@/components/use-fortschritt-nav'
import { minPaceWorkDays, paceWindowDays, rampUp, workTime } from '@/config/plan.const'
import { useNow } from '@/data/now-store'
import { Route } from '@/routes/index'
import { accountRows } from '@/stats/accounts'
import { accountSummaryText } from '@/stats/copy'
import { formatDay, formatKm, formatNumber, formatStamp, formatWeeks } from '@/stats/format'
import type { Dataset } from '@/stats/model'
import { runningScope, scopes } from '@/stats/status'

function perWeek(km: number) {
  return Number.isFinite(km) ? `${formatNumber(km)} km` : 'Deadline vorbei'
}

export function PeopleView({ dataset }: { dataset: Dataset }) {
  const now = useNow()
  const search = Route.useSearch()
  const updateSearch = useUpdateSearch()
  const all = scopes(dataset)
  const running = runningScope(dataset, now)
  const scope = all.find((item) => item.key === search.umfang) ?? running
  const short = scope.key === 'gesamt' ? 'gesamt' : `L${scope.key}`
  const rows = accountRows(dataset, now, scope)
  const later = dataset.deliveries.filter(
    (delivery) => !scope.deliveries.includes(delivery.nr) && delivery.deadline > scope.end,
  )
  const overdueNrs = [...new Set(rows.flatMap((row) => row.overdueDeliveries))].sort(
    (a, b) => a - b,
  )
  const [copied, setCopied] = useState<'ok' | 'fehler' | null>(null)

  async function copySummary() {
    const text = accountSummaryText(rows, scope.end, formatStamp(nowIso()))
    try {
      await navigator.clipboard.writeText(text)
      setCopied('ok')
    } catch {
      setCopied('fehler')
    }
  }

  return (
    <div className="space-y-6">
      <PartHeading id="personen">Personen</PartHeading>
      <section id="tempo" aria-label="Tempo je Account" className="scroll-mt-4 space-y-4">
        {/* Controls first, so they stay in place whatever the heading below says. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Toggle
            label="Umfang"
            options={all.map((item) => ({ value: item.key, label: item.label }))}
            value={scope.key}
            onChange={(value) =>
              updateSearch({ umfang: value === running.key ? undefined : value })
            }
          />
          <div className="flex items-center gap-2">
            {copied ? (
              <span className="text-xs text-zinc-400" role="status">
                {copied === 'ok' ? 'Kopiert' : 'Kopieren nicht erlaubt'}
              </span>
            ) : null}
            <Button outline onClick={() => void copySummary()} data-testid="copy-summary">
              <ClipboardDocumentIcon data-slot="icon" />
              Für Gespräch kopieren
            </Button>
          </div>
        </div>
        <div>
          <h3 className="text-base font-semibold text-zinc-100">{scope.label}: Tempo je Account</h3>
          <p className="text-sm text-zinc-400">
            Deadline Mapping {formatDay(scope.end)}, noch{' '}
            {formatWeeks(Math.max(0, (scope.end - now) / 7))}.
            {scope.key !== running.key ? ` Gerade läuft ${running.label}.` : ''}
          </p>
        </div>

        <Table
          dense
          className="[--gutter:--spacing(1)] [&_td]:px-2 [&_th]:px-2"
          data-testid="people-table"
        >
          <TableHead>
            <TableRow>
              <TableHeader>Account</TableHeader>
              <TableHeader className="text-right">Rest {short}</TableHeader>
              {overdueNrs.length > 0 ? (
                <TableHeader className="text-right" data-testid="overdue-header">
                  Rückstand L{overdueNrs.join(', L')}³
                </TableHeader>
              ) : null}
              <TableHeader className="text-right">nötig/Woche</TableHeader>
              <TableHeader className="text-right">Ø 2 Wochen¹</TableHeader>
              <TableHeader>Stand</TableHeader>
              {later.length > 0 ? (
                <TableHeader className="text-right">
                  schon in L{later.map((delivery) => delivery.nr).join(', L')}
                </TableHeader>
              ) : null}
              <TableHeader className="text-right">fremde Gebiete²</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.account} data-testid={`account-${row.account}`}>
                <TableCell>
                  <span className="inline-flex items-center gap-2 font-medium">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: accountColor(dataset.accounts, row.account) }}
                      aria-hidden="true"
                    />
                    {row.account}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.totalKm > 0 ? (
                    <>
                      {formatKm(row.restKm)}
                      <span className="block text-xs text-zinc-500">
                        von {formatKm(row.totalKm)}
                      </span>
                    </>
                  ) : (
                    <>
                      –<span className="block text-xs text-zinc-500">nichts zugeteilt</span>
                    </>
                  )}
                </TableCell>
                {overdueNrs.length > 0 ? (
                  <TableCell className="text-right tabular-nums" data-testid="overdue-cell">
                    {row.overdueKm > 0 ? (
                      <Badge color="red">{formatKm(row.overdueKm)}</Badge>
                    ) : (
                      <span className="text-zinc-500">–</span>
                    )}
                  </TableCell>
                ) : null}
                <TableCell className="text-right tabular-nums">
                  {row.ampel === 'keine' ? '–' : perWeek(row.neededPerWeek)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{perWeek(row.pace)}</TableCell>
                <TableCell>
                  <AmpelText ampel={row.ampel} ratio={row.ratio} anlernBis={row.anlernBis} />
                </TableCell>
                {later.length > 0 ? (
                  <TableCell className="text-right tabular-nums">
                    {formatKm(row.laterDoneKm)}
                  </TableCell>
                ) : null}
                <TableCell className="text-right tabular-nums">
                  {formatKm(row.foreignKm)}
                  {row.foreignEdges > 0 ? (
                    <span className="block text-xs text-zinc-500">{row.foreignEdges} Kanten</span>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="space-y-1 text-xs text-zinc-400">
          <p>
            Gezählt wird nach dem zugeteilten Account der Kante, im gewählten Umfang ({scope.label}
            ). Nötig je Woche = (Rest + Rückstand) ÷ Arbeitswochen bis zur Deadline. Stand: „im
            Plan“ ab 100 % des nötigen Tempos, „fast im Plan“ ab 80 %, sonst „braucht mehr Tempo“;
            „nichts zugeteilt“, wenn der Account im gewählten Umfang keine Kanten hat. In der
            Anlernphase, den ersten {rampUp.days} Tagen nach der ersten Markierung eines Accounts,
            reichen {Math.round(rampUp.factor * 100)} % des Nötigen für „im Plan“.
          </p>
          <p>
            ¹ Ø letzte 2 Wochen = km der letzten {paceWindowDays.account} Tage je Arbeitswoche.
            Gezählt wird nur Arbeitszeit, Mo–Fr {workTime.startHour}–{workTime.endHour} Uhr, und
            eine Woche sind 5 Arbeitstage; Nächte und Wochenenden senken das Tempo also nicht. Es
            zählen mindestens {minPaceWorkDays} Arbeitstage, damit ein guter erster Tag nicht als
            Wochentempo gilt.
          </p>
          <p>
            ² km, die dieser Account in Gebieten anderer Accounts als erledigt markiert hat (nach
            dem Namen, mit dem markiert wurde). Sie zählen beim zugeteilten Account.
          </p>
          {overdueNrs.length > 0 ? (
            <p>
              ³ Rückstand = km einer früheren Lieferung, deren Deadline vorbei ist und die noch
              nicht erledigt sind. Sie sind in „nötig/Woche“ enthalten.
            </p>
          ) : null}
        </div>
      </section>

      <section id="wochen" aria-labelledby="weekly-heading" className="scroll-mt-4 space-y-3">
        <h3 id="weekly-heading" className="text-base font-semibold text-zinc-100">
          km je Woche, {scope.label}
        </h3>
        <p className="text-xs text-zinc-400">
          Kalenderwochen ab Montag. Die laufende Woche ist heller. Die Linie ist das Nötige je Woche
          ab jetzt.
        </p>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <li key={row.account} className="rounded-lg bg-zinc-900 p-3 ring-1 ring-white/10">
              <h4 className="mb-1 text-sm font-medium text-zinc-200">{row.account}</h4>
              <WeeklyColumns
                weeks={row.weeks}
                neededPerWeek={row.neededPerWeek}
                color={accountColor(dataset.accounts, row.account)}
                account={row.account}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
