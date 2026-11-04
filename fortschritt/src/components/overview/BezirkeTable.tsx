import { Badge } from '@shared/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/components/ui/table'
import { ProgressBar } from '@/components/overview/ProgressBar'
import { bezirkRows } from '@/stats/bezirke'
import { formatCount, formatKm, formatPercent } from '@/stats/format'
import type { Dataset } from '@/stats/model'

export function BezirkeTable({ dataset, running }: { dataset: Dataset; running: number }) {
  const rows = bezirkRows(dataset)
  return (
    <Table dense className="[--gutter:--spacing(1)]" data-testid="bezirke-table">
      <TableHead>
        <TableRow>
          <TableHeader>Bezirk</TableHeader>
          <TableHeader>Lieferung</TableHeader>
          <TableHeader className="w-48">erledigt</TableHeader>
          <TableHeader className="text-right">km</TableHeader>
          <TableHeader className="text-right">Kanten</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => {
          const position = rows.filter((item) => item.delivery === row.delivery).indexOf(row) + 1
          return (
            <TableRow key={row.bezirk}>
              <TableCell>
                <span className="text-zinc-500 tabular-nums">{position}.</span> {row.bezirk}
              </TableCell>
              <TableCell>
                <Badge color={row.delivery === running ? 'sky' : 'zinc'}>
                  Lieferung {row.delivery}
                </Badge>
              </TableCell>
              <TableCell>
                <ProgressBar
                  share={row.share}
                  label={`${row.bezirk}: ${formatPercent(row.share)}`}
                />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatKm(row.doneKm)} / {formatKm(row.km)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCount(row.edgesDone)} / {formatCount(row.edges)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
