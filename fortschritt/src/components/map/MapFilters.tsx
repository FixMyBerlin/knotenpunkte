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
      <Field>
        <Label>Account</Label>
        <Select
          value={search.account ?? ''}
          onChange={(event) => updateSearch({ account: event.target.value || undefined })}
          data-testid="filter-account"
        >
          <option value="">Alle</option>
          {dataset.accounts.map((account) => (
            <option key={account} value={account}>
              {account}
            </option>
          ))}
        </Select>
      </Field>

      <ul className="space-y-1 text-xs text-zinc-300" aria-label="Legende">
        {byMapper ? (
          <>
            {dataset.accounts.map((account) => (
              <li key={account} className="flex items-center gap-2">
                <span
                  className="h-1 w-5 rounded"
                  style={{ backgroundColor: accountColor(dataset.accounts, account) }}
                />
                {account}
              </li>
            ))}
            <li className="pt-1 text-zinc-400">
              Kräftig: erledigt, blass und dünn: offen. Farbe ist der zugeteilte Account.
            </li>
          </>
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
