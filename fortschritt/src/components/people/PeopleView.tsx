import { ClipboardDocumentIcon } from '@heroicons/react/20/solid'
import { Button } from '@shared/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/components/ui/table'
import { useState } from 'react'
import { WeeklyColumns } from '@/components/charts/WeeklyColumns'
import { accountColor } from '@/components/colors'
import { AmpelText } from '@/components/people/AmpelText'
import { paceWindowDays } from '@/config/plan.const'
import { useNow } from '@/data/now-store'
import { accountRows } from '@/stats/accounts'
import { accountSummaryText } from '@/stats/copy'
import { formatDay, formatKm, formatNumber, formatStamp, formatWeeks } from '@/stats/format'
import type { Dataset } from '@/stats/model'
import { runningDelivery } from '@/stats/plan'

function perWeek(km: number) {
  return Number.isFinite(km) ? `${formatNumber(km)} km` : 'Deadline vorbei'
}

export function PeopleView({ dataset }: { dataset: Dataset }) {
  const now = useNow()
  const rows = accountRows(dataset, now)
  const running = runningDelivery(dataset.deliveries, now)
  const later = dataset.deliveries.filter((delivery) => delivery.deadline > running.deadline)
  const [copied, setCopied] = useState<'ok' | 'fehler' | null>(null)

  async function copySummary() {
    const text = accountSummaryText(rows, running.deadline, formatStamp(new Date().toISOString()))
    try {
      await navigator.clipboard.writeText(text)
      setCopied('ok')
    } catch {
      setCopied('fehler')
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Lieferung {running.nr}: Tempo je Account
            </h2>
            <p className="text-sm text-zinc-400">
              Deadline Mapping {formatDay(running.deadline)}, noch{' '}
              {formatWeeks(Math.max(0, (running.deadline - now) / 7))}.
            </p>
          </div>
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

        <Table dense className="[--gutter:--spacing(1)]" data-testid="people-table">
          <TableHead>
            <TableRow>
              <TableHeader>Account</TableHeader>
              <TableHeader className="text-right">Rest in L{running.nr}</TableHeader>
              <TableHeader className="text-right">nötig je Woche</TableHeader>
              <TableHeader className="text-right">Ø letzte 2 Wochen¹</TableHeader>
              <TableHeader>Stand</TableHeader>
              {later.length > 0 ? (
                <TableHeader className="text-right">
                  schon in L{later.map((delivery) => delivery.nr).join(', L')}
                </TableHeader>
              ) : null}
              <TableHeader className="text-right">in fremden Gebieten²</TableHeader>
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
                  {formatKm(row.restKm)}
                  <span className="block text-xs text-zinc-500">von {formatKm(row.totalKm)}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {perWeek(row.neededPerWeek)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{perWeek(row.pace)}</TableCell>
                <TableCell>
                  <AmpelText ampel={row.ampel} ratio={row.ratio} />
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
            Gezählt wird nach dem zugeteilten Account der Kante, nur Kanten der laufenden Lieferung.
            Nötig je Woche = Rest ÷ Wochen bis zur Deadline, jede Woche neu gerechnet. Stand: grün
            ab 100 % des Nötigen, gelb ab 80 %, sonst rot.
          </p>
          <p>
            ¹ Ø letzte 2 Wochen = km, die in den letzten {paceWindowDays.account} Tagen bis jetzt
            erledigt wurden, je 7 Tage (also ÷ 2). Das Fenster rollt mit, darum verzerrt die
            laufende Woche nichts. Liegt der Projektstart weniger als {paceWindowDays.account} Tage
            zurück, zählt nur die Zeit seit dem Start (mindestens 7 Tage).
          </p>
          <p>
            ² km, die dieser Account in Gebieten anderer Accounts als erledigt markiert hat (nach
            dem Namen, mit dem markiert wurde). Sie zählen beim zugeteilten Account.
          </p>
        </div>

        <section aria-labelledby="weekly-heading" className="space-y-3">
          <h2 id="weekly-heading" className="text-base font-semibold text-zinc-100">
            km je Woche in Lieferung {running.nr}
          </h2>
          <p className="text-xs text-zinc-400">
            Kalenderwochen ab Montag. Die laufende Woche ist heller. Die Linie ist das Nötige je
            Woche ab jetzt.
          </p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <li key={row.account} className="rounded-lg bg-zinc-900 p-3 ring-1 ring-white/10">
                <h3 className="mb-1 text-sm font-medium text-zinc-200">{row.account}</h3>
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
    </div>
  )
}
