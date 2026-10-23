import { cn } from '@shared/cn'
import { Button } from '@shared/components/ui/button'
import { Callout } from '@shared/components/ui/callout'
import { Field, Label } from '@shared/components/ui/fieldset'
import { Subheading } from '@shared/components/ui/heading'
import { Input } from '@shared/components/ui/input'
import { Text } from '@shared/components/ui/text'
import { isValidDatasetName, slugifyDatasetName } from '@shared/datasets/dataset-name'
import { ignorePasswordManagerProps } from '@shared/form-ignore-password-manager'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useNetwork } from '@/components/use-netz'
import {
  baseNetworkQueryKey,
  deleteInput,
  inputsQueryKey,
  listInputs,
  saveInput,
} from '@/network/data-idb'
import { parseInputText, type InputFile } from '@/network/input-schema'
import { areasQueryKey, networkStore } from '@/network/store'
import { Route } from '@/routes/index'

const filePickerLabelClassName =
  'relative isolate inline-flex cursor-pointer items-baseline justify-center rounded-lg border border-white/15 px-[calc(--spacing(3)-1px)] py-[calc(--spacing(1.5)-1px)] text-sm/6 font-semibold text-white hover:bg-white/5'

export function GebietPanel() {
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: Route.fullPath })
  const gebiet = Route.useSearch({ select: (search) => search.gebiet })
  const inputsQuery = useQuery({ queryKey: inputsQueryKey, queryFn: listInputs })
  const areasQuery = useQuery({ queryKey: areasQueryKey, queryFn: () => networkStore.listAreas() })
  const { input, network, entries } = useNetwork(gebiet)

  const [pending, setPending] = useState<{ file: InputFile; fileName: string } | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)

  const local = inputsQuery.data ?? []
  const remote = areasQuery.data ?? []
  const names = [...new Set([...local, ...remote.map((area) => area.gebiet)])].sort((a, b) =>
    a.localeCompare(b),
  )

  function choose(next: string) {
    void navigate({
      search: (previous) => ({ ...previous, gebiet: next, sel: undefined, step: 'gebiet' }),
      replace: true,
    })
  }

  const { mutate: importFile, isPending: importing } = useMutation({
    mutationFn: async ({ file, target }: { file: InputFile; target: string }) => {
      if (!isValidDatasetName(target)) {
        throw new Error('Gebietsname: 3–60 Zeichen, nur Kleinbuchstaben, Ziffern und Bindestriche.')
      }
      await saveInput(target, file)
      return target
    },
    onSuccess: async (target) => {
      setPending(null)
      setError(null)
      await queryClient.invalidateQueries({ queryKey: inputsQueryKey })
      await queryClient.resetQueries({ queryKey: baseNetworkQueryKey(target) })
      await navigate({
        search: (previous) => ({ ...previous, gebiet: target, sel: undefined, step: 'zeichnen' }),
        replace: true,
      })
    },
    onError: (caught) =>
      setError(caught instanceof Error ? caught.message : 'Import fehlgeschlagen'),
  })

  return (
    <div className="space-y-6">
      <div>
        <Subheading>Gebiet</Subheading>
        {names.length === 0 ? (
          <Text className="mt-2">
            Noch kein Gebiet. Importiere unten die Datei aus infravelo-radnetz.
          </Text>
        ) : (
          <ul className="mt-2 space-y-1" data-testid="area-list">
            {names.map((item) => {
              const count = remote.find((area) => area.gebiet === item)?.count ?? 0
              const hasFile = local.includes(item)
              return (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => choose(item)}
                    className={cn(
                      'w-full rounded-lg px-3 py-2 text-left text-sm ring-1 ring-white/10 hover:bg-white/5',
                      item === gebiet && 'bg-sky-500/15 ring-sky-500/40',
                    )}
                  >
                    <span className="font-medium text-white">{item}</span>
                    <span className="block text-xs text-zinc-400">
                      {hasFile ? 'Datei in diesem Browser' : 'Keine Datei in diesem Browser'}
                      {networkStore.mode === 'kv' ? ` · ${count} Einträge in der Datenbank` : ''}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {gebiet && input ? (
        <div className="space-y-1 text-sm text-zinc-300" data-testid="area-summary">
          <Text>
            Datei vom {input.file.erzeugt_am.slice(0, 10)}, importiert am{' '}
            {input.importedAt.slice(0, 10)}.
          </Text>
          <ul className="list-inside list-disc text-xs text-zinc-400">
            <li>{input.file.detailnetz.features.length} Detailnetzkanten</li>
            <li>{input.file.knoten.features.length} Knoten</li>
            <li>{input.file.ren_netz.features.length} REN+-Linien</li>
            <li>{input.file.radfernwege.features.length} Radfernweg-Linien</li>
            <li>{input.file.luecken.features.length} Lücken</li>
            <li>
              Stände:{' '}
              {Object.entries(input.file.quellen)
                .map(([key, value]) => `${key} ${value}`)
                .join(', ')}
            </li>
          </ul>
          {network ? (
            <Text>
              Gezeichnet: {network.newEdges.length} Kanten, {network.virtualNodes.length} virtuelle
              Knoten ({entries.length} Einträge mit gelöschten).
            </Text>
          ) : null}
          <Button
            type="button"
            plain
            className="mt-2"
            onClick={async () => {
              await deleteInput(gebiet)
              await queryClient.invalidateQueries({ queryKey: inputsQueryKey })
              await queryClient.resetQueries({ queryKey: baseNetworkQueryKey(gebiet) })
            }}
          >
            Datei aus diesem Browser entfernen
          </Button>
        </div>
      ) : null}

      <div className="space-y-3">
        <Subheading>Datei importieren</Subheading>
        <Text>
          <code>netzanpassungen_&lt;gebiet&gt;.json</code> aus{' '}
          <code>infravelo-radnetz/netzanpassungen/export_app_daten.py</code>. Sie bleibt in diesem
          Browser; gezeichnete Kanten und Knoten gehen in die Datenbank.
        </Text>
        <label className={filePickerLabelClassName}>
          {reading ? 'Lese Datei …' : 'Datei wählen'}
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            data-testid="input-file"
            onChange={async (event) => {
              const chosen = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (!chosen) return
              setReading(true)
              setError(null)
              try {
                const file = parseInputText(await chosen.text())
                setPending({ file, fileName: chosen.name })
                setName(slugifyDatasetName(file.gebiet))
              } catch (caught) {
                setPending(null)
                setError(caught instanceof Error ? caught.message : 'Datei nicht lesbar')
              } finally {
                setReading(false)
              }
            }}
          />
        </label>
        {pending ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              importFile({ file: pending.file, target: name.trim() })
            }}
          >
            <Text>
              {pending.fileName}: {pending.file.detailnetz.features.length} Detailnetzkanten,{' '}
              {pending.file.luecken.features.length} Lücken.
            </Text>
            <Field>
              <Label>Gebiet</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
                {...ignorePasswordManagerProps}
              />
            </Field>
            <Button type="submit" color="sky" disabled={importing}>
              {importing ? 'Importiere …' : 'Importieren'}
            </Button>
          </form>
        ) : null}
        {error ? (
          <Callout tone="error" title="Import">
            {error}
          </Callout>
        ) : null}
      </div>
    </div>
  )
}
