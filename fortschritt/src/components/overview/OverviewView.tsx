import { Callout } from '@shared/components/ui/callout'
import { BurnupChart } from '@/components/charts/BurnupChart'
import { BezirkeTable } from '@/components/overview/BezirkeTable'
import { PlanStateText } from '@/components/overview/PlanStateText'
import { StatTile } from '@/components/overview/StatTile'
import { PartHeading } from '@/components/report/PartHeading'
import { Toggle } from '@/components/Toggle'
import { useUpdateSearch } from '@/components/use-fortschritt-nav'
import { rampUp } from '@/config/plan.const'
import { useNow } from '@/data/now-store'
import { Route } from '@/routes/index'
import {
  formatDay,
  formatDayDistance,
  formatKm,
  formatNumber,
  formatPercent,
  formatWeeks,
} from '@/stats/format'
import type { Dataset } from '@/stats/model'
import { runningDelivery } from '@/stats/plan'
import { neededPerWeek, overdueDeliveries, scopes, scopeStatus, sumKm } from '@/stats/status'

function perWeek(km: number) {
  return Number.isFinite(km) ? `${formatNumber(km)} km/Woche` : '–'
}

export function OverviewView({ dataset }: { dataset: Dataset }) {
  const now = useNow()
  const search = Route.useSearch()
  const updateSearch = useUpdateSearch()
  const all = scopes(dataset)
  const running = runningDelivery(dataset.deliveries, now)
  const runningScope = all.find((scope) => scope.key === `${running.nr}`) ?? all[0]!
  const runningStatus = scopeStatus(dataset, runningScope, now)
  const gesamt = scopeStatus(dataset, all[0]!, now)
  const chartScope = all.find((scope) => scope.key === search.umfang) ?? runningScope
  const chartStatus = scopeStatus(dataset, chartScope, now)
  const overdue = overdueDeliveries(dataset, now)
  const neededNow = neededPerWeek(
    runningStatus.targetKm -
      runningStatus.doneKm +
      sumKm(overdue.map((item) => ({ km: item.restKm }))),
    runningStatus.weeksLeft,
  )
  const unit = search.unit === 'prozent' ? 'prozent' : 'km'

  return (
    <div className="space-y-8">
      <PartHeading id="ueberblick">Überblick</PartHeading>
      <section id="stand" aria-labelledby="tiles-heading" className="scroll-mt-4 space-y-3">
        <h3 id="tiles-heading" className="text-base font-semibold text-zinc-100">
          Lieferung {running.nr} (laufend)
        </h3>
        {overdue.map((item) => (
          <Callout
            key={item.nr}
            tone="warning"
            title={`Rückstand Lieferung ${item.nr}`}
            data-testid={`overdue-${item.nr}`}
          >
            Deadline war der {formatDay(item.deadline)} ({formatDayDistance(item.deadline, now)}).
            Noch {formatKm(item.restKm)} offen von {formatKm(item.targetKm)} (
            {formatPercent(item.restKm / item.targetKm)}). Der Rückstand steckt in „nötig ab jetzt“.
          </Callout>
        ))}
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            label={`Lieferung ${running.nr} erledigt`}
            value={formatPercent(runningStatus.share)}
            detail={`${formatKm(runningStatus.doneKm)} von ${formatKm(runningStatus.targetKm)} · ${runningStatus.edgesDone.toLocaleString('de-DE')} von ${runningStatus.edges.toLocaleString('de-DE')} Kanten`}
            testId="tile-running"
          />
          <StatTile
            label="Gegenüber der Soll-Linie"
            value={<PlanStateText state={runningStatus.planState} diffKm={runningStatus.diffKm} />}
            detail={`Soll heute ${formatKm(runningStatus.sollKm)}`}
            testId="tile-plan"
          />
          <StatTile
            label="Tempo"
            value={perWeek(runningStatus.pace)}
            detail={`Ø letzte 4 Wochen · nötig ab jetzt ${perWeek(neededNow)}`}
            testId="tile-pace"
          />
          <StatTile
            label="Prognose fertig"
            value={runningStatus.forecast === null ? 'keine' : formatDay(runningStatus.forecast)}
            detail={
              runningStatus.forecast === null
                ? 'Noch kein Tempo in den letzten 4 Wochen'
                : `${formatDayDistance(runningStatus.forecast, now)}, ${
                    runningStatus.forecast <= running.deadline ? 'vor' : 'nach'
                  } der Deadline · Tempo der letzten 4 Wochen mit Anlauf`
            }
            testId="tile-forecast"
          />
          <StatTile
            label="Bis zur Deadline Mapping"
            value={formatWeeks(runningStatus.weeksLeft)}
            detail={`${formatDay(running.deadline)} · Abgabe ${formatDay(running.abgabe)}`}
            testId="tile-weeks"
          />
          <StatTile
            label="Gesamt erledigt"
            value={formatPercent(gesamt.share)}
            detail={`${formatKm(gesamt.doneKm)} von ${formatKm(gesamt.targetKm)} · ${gesamt.edgesDone.toLocaleString('de-DE')} von ${gesamt.edges.toLocaleString('de-DE')} Kanten`}
            testId="tile-gesamt"
          />
        </dl>
      </section>

      <section id="burnup" aria-labelledby="burnup-heading" className="scroll-mt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="burnup-heading" className="text-base font-semibold text-zinc-100">
            Burn-up {chartScope.label}
          </h3>
          <div className="flex flex-wrap gap-2">
            <Toggle
              label="Umfang"
              options={all.map((scope) => ({ value: scope.key, label: scope.label }))}
              value={chartScope.key}
              onChange={(value) =>
                updateSearch({ umfang: value === runningScope.key ? undefined : value })
              }
            />
            <Toggle
              label="Achse"
              options={[
                { value: 'km', label: 'km' },
                { value: 'prozent', label: '%' },
              ]}
              value={unit}
              onChange={(value) =>
                updateSearch({ unit: value === 'prozent' ? 'prozent' : undefined })
              }
            />
          </div>
        </div>
        <BurnupChart status={chartStatus} unit={unit} now={now} start={dataset.start} />
        <p className="text-xs text-zinc-400">
          Start ist der Montag der ersten Markierung ({formatDay(dataset.start)}).{' '}
          {chartScope.key === 'gesamt'
            ? 'Die Soll-Linie knickt an der Deadline von Lieferung 2: bis dahin ihr Ziel, danach der Rest bis zur Deadline von Lieferung 3.'
            : 'Die Soll-Linie geht gerade vom Start der Lieferung bis zum Ziel an ihrer Deadline.'}{' '}
          Prognose: {chartStatus.forecast === null ? 'keine' : formatDay(chartStatus.forecast)}. Sie
          nimmt an, dass ein Mapper in den ersten {rampUp.days} Tagen nach seiner ersten Markierung
          mit {Math.round(rampUp.factor * 100)} % seines späteren Tempos arbeitet; sein Tempo der
          letzten 4 Wochen wird darum hochgerechnet. Accounts ohne Markierung starten heute mit dem
          Durchschnitt der anderen.
        </p>
      </section>

      <section id="bezirke" aria-labelledby="bezirke-heading" className="scroll-mt-4 space-y-3">
        <h3 id="bezirke-heading" className="text-base font-semibold text-zinc-100">
          Bezirke
        </h3>
        <BezirkeTable dataset={dataset} running={running.nr} />
      </section>
    </div>
  )
}
