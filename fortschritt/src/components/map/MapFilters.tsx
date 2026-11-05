import { Field, Label } from '@shared/components/ui/fieldset'
import { Select } from '@shared/components/ui/select'
import { accountColor, edgeColors } from '@/components/colors'
import { useUpdateSearch } from '@/components/use-fortschritt-nav'
import { Route } from '@/routes/index'
import { formatDayNumeric } from '@/stats/format'
import { filteredBezirke } from '@/stats/map-filter'
import type { Dataset } from '@/stats/model'

export function MapFilters({ dataset }: { dataset: Dataset }) {
  const search = Route.useSearch()
  const updateSearch = useUpdateSearch()
  const bezirkOptions =
    filteredBezirke(dataset, { lieferung: search.lieferung }) ??
    dataset.deliveries.flatMap((delivery) => delivery.bezirke)

  return (
    <section className="space-y-3" aria-label="Filter">
      <Field>
        <Label>Lieferung</Label>
        <Select
          value={search.lieferung ?? ''}
          onChange={(event) =>
            updateSearch({ lieferung: event.target.value || undefined, bezirk: undefined })
          }
          data-testid="filter-lieferung"
        >
          <option value="">Alle</option>
          {dataset.deliveries.map((delivery) => (
            <option key={delivery.nr} value={`${delivery.nr}`}>
              Lieferung {delivery.nr} · Mapping bis {formatDayNumeric(delivery.deadline)} · Abgabe{' '}
              {formatDayNumeric(delivery.abgabe)}
            </option>
          ))}
        </Select>
      </Field>
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
              {bezirk}
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
        <li className="flex items-center gap-2">
          <span className="h-1 w-5 rounded" style={{ backgroundColor: edgeColors.done }} />
          Kante erledigt
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1 w-5 rounded" style={{ backgroundColor: edgeColors.open }} />
          Kante offen
        </li>
        {dataset.accounts.map((account) => (
          <li key={account} className="flex items-center gap-2">
            <span
              className="size-3 rounded-sm border-2"
              style={{ borderColor: accountColor(dataset.accounts, account) }}
            />
            Gebiet {account}
          </li>
        ))}
      </ul>
    </section>
  )
}
