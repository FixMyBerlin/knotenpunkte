import type { AccountRow } from '@/stats/accounts'
import { ampelLabels } from '@/stats/accounts'
import { formatDayNumeric, formatKm, formatNumber, formatWeeks } from '@/stats/format'

function perWeek(km: number) {
  return Number.isFinite(km) ? `${formatNumber(km)} km/Woche` : 'Deadline vorbei'
}

/** Plain text for the notes of the weekly talks, one paragraph per account. */
export function accountSummaryText(rows: AccountRow[], deadline: number, stampText: string) {
  const first = rows[0]
  const weeksLeft = first ? first.weeksLeft : 0
  const head = `Fortschritt, Stand ${stampText}\nLieferung ${first?.delivery ?? '?'}: Deadline Mapping ${formatDayNumeric(deadline)}, noch ${formatWeeks(weeksLeft)}`
  const lines = rows.map((row) => {
    const ratio = row.ratio === null ? '' : ` (${Math.round(row.ratio * 100)} % vom Soll)`
    return [
      `${row.account}: ${formatKm(row.doneKm)} von ${formatKm(row.totalKm)} erledigt, Rest ${formatKm(row.restKm)}.`,
      `  Nötig ${perWeek(row.neededPerWeek)}, Ø letzte 2 Wochen ${perWeek(row.pace)}: ${ampelLabels[row.ampel]}${ratio}.`,
      `  Spätere Lieferung schon erledigt: ${formatKm(row.laterDoneKm)}. In fremden Gebieten markiert: ${formatKm(row.foreignKm)}.`,
    ].join('\n')
  })
  return [head, ...lines].join('\n\n')
}
