import { cn } from '@shared/cn'
import { Callout } from '@shared/components/ui/callout'
import { Field, Label } from '@shared/components/ui/fieldset'
import { Heading } from '@shared/components/ui/heading'
import { Input } from '@shared/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/components/ui/table'
import { Text } from '@shared/components/ui/text'
import { ignorePasswordManagerProps } from '@shared/form-ignore-password-manager'
import type { ReactNode } from 'react'

export type DataColumn<T> = {
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

type Props<T> = {
  title: string
  /** What the table shows, below the title. */
  scope: ReactNode
  searchValue: string | undefined
  searchPlaceholder: string
  searchLabel: string
  onSearchChange: (value: string | undefined) => void
  status: { isPending: boolean; isError: boolean; error: unknown }
  pendingText: string
  emptyText: string
  errorText: string
  rows: T[]
  columns: DataColumn<T>[]
  rowKey: (row: T) => string
  selectedKey?: string
  onSelect: (row: T) => void
  tableTestId?: string
  rowTestId?: (row: T) => string
  /** Details of the selected row, next to the table. */
  aside: ReactNode
}

/** A database page: search, the entries as a table, and the selected entry next to it. */
export function DataTablePage<T>({
  title,
  scope,
  searchValue,
  searchPlaceholder,
  searchLabel,
  onSearchChange,
  status,
  pendingText,
  emptyText,
  errorText,
  rows,
  columns,
  rowKey,
  selectedKey,
  onSelect,
  tableTestId,
  rowTestId,
  aside,
}: Props<T>) {
  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-8 px-4 py-6 lg:flex-row lg:px-8">
      <div className="min-w-0 flex-1">
        <Heading level={2}>{title}</Heading>
        <Text className="mt-2" data-testid="data-page-scope">
          {scope}
        </Text>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <Field className="min-w-64 flex-1">
            <Label>Suche</Label>
            <Input
              value={searchValue ?? ''}
              placeholder={searchPlaceholder}
              aria-label={searchLabel}
              {...ignorePasswordManagerProps}
              onChange={(event) => onSearchChange(event.currentTarget.value.trim() || undefined)}
            />
          </Field>
        </div>

        {status.isError ? (
          <Callout className="mt-4" tone="error" title="Laden fehlgeschlagen">
            {status.error instanceof Error ? status.error.message : errorText}
          </Callout>
        ) : null}

        {status.isPending ? (
          <Text className="mt-6">{pendingText}</Text>
        ) : rows.length === 0 ? (
          <Text className="mt-6">{emptyText}</Text>
        ) : (
          <Table
            className="mt-4 [--gutter:--spacing(4)] lg:[--gutter:--spacing(6)]"
            dense
            striped
            data-testid={tableTestId}
          >
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableHeader key={column.header}>{column.header}</TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const key = rowKey(row)
                return (
                  <TableRow
                    key={key}
                    className={cn(
                      'cursor-pointer hover:bg-white/5',
                      key === selectedKey && 'bg-sky-500/15 hover:bg-sky-500/20',
                    )}
                    data-testid={rowTestId?.(row)}
                    onClick={() => onSelect(row)}
                  >
                    {columns.map((column) => (
                      <TableCell key={column.header} className={column.className}>
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <aside className="w-full shrink-0 lg:w-96">
        <div className="rounded-lg p-4 ring-1 ring-white/10 lg:sticky lg:top-4">{aside}</div>
      </aside>
    </div>
  )
}
