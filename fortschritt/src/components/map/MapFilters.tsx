import { cn } from '@shared/cn'
import { Field, Label } from '@shared/components/ui/fieldset'
import { Select } from '@shared/components/ui/select'
import { accountColor, edgeColors } from '@/components/colors'
import { Toggle } from '@/components/Toggle'
import { useUpdateSearch } from '@/components/use-fortschritt-nav'
import { useNow } from '@/data/now-store'
import { Route } from '@/routes/index'
import { bezirkRows } from '@/stats/bezirke'
import { formatDayNumeric, formatPercent } from '@/stats/format'
import { filteredBezirke, mapFilterOf } from '@/stats/map-filter'
import type { Dataset } from '@/stats/model'
import { runningScope, scopeFromSearch, scopes } from '@/stats/status'

/** Share of km done per account, within the deliveries and (optionally) one Bezirk. */
function accountShares(dataset: Dataset, deliveries: number[], bezirk: string | undefined) {
  const totals = new Map<string, { km: number; doneKm: number }>()
  for (const edge of dataset.edges) {
    if (edge.delivery === null || !deliveries.includes(edge.delivery)) continue
    if (bezirk && edge.bezirk !== bezirk) continue
    const total = totals.get(edge.account) ?? { km: 0, doneKm: 0 }
    total.km += edge.km
    if (dataset.doneById.has(edge.id)) total.doneKm += edge.km
    totals.set(edge.account, total)
  }
  return new Map(
    [...totals].map(([account, total]) => [account, total.km > 0 ? total.doneKm / total.km : 0]),
  )
}

export function MapFilters({ dataset }: { dataset: Dataset }) {
  const search = Route.useSearch()
  const updateSearch = useUpdateSearch()
  const now = useNow()
  const running = runningScope(dataset, now)
  const scope = scopeFromSearch(dataset, search.umfang, now)
  const delivery = dataset.deliveries.find((item) => `${item.nr}` === scope.key)
  const bezirkOptions =
    filteredBezirke(dataset, mapFilterOf(scope, {})) ??
    dataset.deliveries.flatMap((item) => item.bezirke)
  const byMapper = search.farbe === 'mapper'
  const bezirkShare = new Map(bezirkRows(dataset).map((row) => [row.bezirk, row.share]))
  const accountShare = accountShares(dataset, scope.deliveries, search.bezirk)

  return (
    <section className="space-y-3" aria-label="Filter">
      <div className="space-y-1">
        <Toggle
          label="Umfang"
          options={scopes(dataset).map((item) => ({ value: item.key, label: item.label }))}
          value={scope.key}
          onChange={(value) =>
            updateSearch({ umfang: value === running.key ? undefined : value, bezirk: undefined })
          }
        />
        <p className="text-xs text-zinc-400">
          {delivery
            ? `Mapping bis ${formatDayNumeric(delivery.deadline)} · Abgabe ${formatDayNumeric(delivery.abgabe)}`
            : 'Alle Lieferungen'}
        </p>
      </div>
      <Toggle
        label="Färbung"
        options={[
          { value: 'status', label: 'Erledigt / offen' },
          { value: 'mapper', label: 'Mapper' },
        ]}
        value={byMapper ? 'mapper' : 'status'}
        onChange={(value) => updateSearch({ farbe: value === 'mapper' ? 'mapper' : undefined })}
      />
      <Field>
        <Label>Bezirk</Label>
        <Select
          value={search.bezirk ?? ''}
          onChange={(event) => updateSearch({ bezirk: event.target.value || undefined })}
          data-testid="filter-bezirk"
        >
          <option value="">Alle</option>
          {bezirkOptions.map((bezirk) => (
            <option key={bezirk} value={bezirk}>
              {bezirk} · {formatPercent(bezirkShare.get(bezirk) ?? 0)}
            </option>
          ))}
        </Select>
      </Field>
      <fieldset className="space-y-1" data-testid="filter-account">
        <legend className="mb-1 text-sm/6 font-medium text-white">Account</legend>
        <p className="text-xs text-zinc-400">
          {byMapper ? 'Farbe der Kanten und Gebiete. ' : ''}% erledigt im gewählten Umfang. Klick
          filtert, noch ein Klick zeigt wieder alle.
        </p>
        <ul className="space-y-0.5 text-sm">
          {dataset.accounts.map((account) => {
            const active = search.account === account
            const dimmed = search.account !== undefined && !active
            return (
              <li key={account}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateSearch({ account: active ? undefined : account })}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left',
                    active ? 'bg-white/10 text-white' : 'text-zinc-300 hover:bg-white/5',
                    dimmed && 'opacity-50',
                  )}
                >
                  <span
                    className="h-1 w-5 shrink-0 rounded"
                    style={{
                      backgroundColor: byMapper
                        ? accountColor(dataset.accounts, account)
                        : '#a1a1aa',
                    }}
                    aria-hidden="true"
                  />
                  {account}
                  <span className="ml-auto text-xs text-zinc-400 tabular-nums">
                    {formatPercent(accountShare.get(account) ?? 0)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <ul className="space-y-1 text-xs text-zinc-300" aria-label="Legende">
        {byMapper ? (
          <li className="text-zinc-400">
            Kräftig: erledigt, blass und dünn: offen. Farbe ist der zugeteilte Account.
          </li>
        ) : (
          <>
            <li className="flex items-center gap-2">
              <span className="h-1 w-5 rounded" style={{ backgroundColor: edgeColors.done }} />
              Kante erledigt
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1 w-5 rounded" style={{ backgroundColor: edgeColors.open }} />
              Kante offen
            </li>
            <li className="flex items-center gap-2">
              <span className="size-3 rounded-sm border-2 border-zinc-400" />
              Gebiet eines Accounts
            </li>
            <li className="flex items-center gap-2">
              <span
                className="size-3 rounded-sm"
                style={{ backgroundColor: edgeColors.done, opacity: 0.6 }}
              />
              Gebiet fertig (alle Kanten erledigt)
            </li>
          </>
        )}
      </ul>
    </section>
  )
}
