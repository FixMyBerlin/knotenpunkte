import { InformationCircleIcon, PlusIcon } from '@heroicons/react/20/solid'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import clsx from 'clsx'
import { useState } from 'react'
import { MotionCollapse } from '@/components/shared/motion/MotionCollapse'
import { useOsmAuth } from '@/components/shared/use-osm-auth'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Field, Fieldset, Label } from '@/components/ui/fieldset'
import { Subheading } from '@/components/ui/heading'
import { Input } from '@/components/ui/input'
import { SidebarDivider } from '@/components/ui/sidebar'
import { Text, TextLink } from '@/components/ui/text'
import { sampleNodesGithubUrl, sampleSuggestionsGithubUrl } from '@/config/app.const'
import { Route } from '@/routes/index'
import {
  listNodesDatasets,
  loadNodes,
  loadSuggestions,
  saveNodes,
  saveSuggestions,
} from '@/shared/datasets/dataset-idb'
import { isValidDatasetName } from '@/shared/datasets/dataset-name'
import { buildDatasetInventory, datasetInventoryCopy } from '@/shared/datasets/inventory'
import { ignorePasswordManagerProps } from '@/shared/form-ignore-password-manager'
import { parseNodesText } from '@/shared/nodes/parse-nodes'
import { osmLoginRequiredMessage } from '@/shared/ratings/kv-rating-store'
import { defaultWorkNodeId } from '@/shared/ratings/queue'
import {
  datasetSummariesQueryKey,
  projectMetaQueryKey,
  ratingStore,
  ratingsQueryKey,
} from '@/shared/ratings/ratings-query'
import { parseSuggestionsText } from '@/shared/suggestions/schema'

const filePickerLabelClassName =
  'relative isolate inline-flex cursor-pointer items-baseline justify-center rounded-lg border border-zinc-950/10 px-[calc(--spacing(3)-1px)] py-[calc(--spacing(1.5)-1px)] text-sm/6 font-semibold text-zinc-950 hover:bg-zinc-950/2.5 dark:border-white/15 dark:text-white dark:hover:bg-white/5'

const infoIconButtonClassName =
  'rounded-full text-zinc-400 hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'

const projectNameHelp =
  'Der Gebietsname ist der Schlüssel für alle Bewertungen und kann später nicht geändert werden. Empfehlung: ein kurzer Slug ohne Datum, z. B. berlin. Gleicher Name = gleiches Gebiet, auch wenn du die Knoten später neu hochlädst.'

const invalidProjectNameMessage =
  'Gebietsname: 3–60 Zeichen, nur Kleinbuchstaben, Ziffern und Bindestriche (z. B. berlin).'

export function DatasetPanel() {
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: Route.fullPath })
  const dataset = Route.useSearch({ select: (search) => search.dataset })
  const datasetsQuery = useQuery({
    queryKey: ['datasets'],
    queryFn: listNodesDatasets,
  })
  const summariesQuery = useQuery({
    queryKey: datasetSummariesQueryKey,
    queryFn: () => ratingStore.listDatasetSummaries(),
  })
  const projectMetaQuery = useQuery({
    queryKey: projectMetaQueryKey,
    queryFn: () => ratingStore.listProjectMeta(),
  })
  const localDatasets = datasetsQuery.data ?? []
  const suggestionQueries = useQuery({
    queryKey: ['suggestions-counts'],
    queryFn: async () => {
      const counts: Record<string, number> = {}
      for (const item of localDatasets) {
        const stored = await loadSuggestions(item.dataset)
        counts[item.dataset] = stored?.rows.length ?? 0
      }
      return counts
    },
    enabled: localDatasets.length > 0,
  })
  const metaOnlyDatasets = (projectMetaQuery.data ?? []).map((meta) => meta.dataset)
  const inventory = buildDatasetInventory(
    localDatasets,
    summariesQuery.data ?? [],
    suggestionQueries.data ?? {},
    metaOnlyDatasets,
  )
  const selectedRow = inventory.find((row) => row.dataset === dataset)

  const auth = useOsmAuth()
  const [createOpen, setCreateOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [pendingText, setPendingText] = useState<string | null>(null)
  const [pendingSuggestions, setPendingSuggestions] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [projectNameHelpOpen, setProjectNameHelpOpen] = useState(false)
  const [importHelpOpen, setImportHelpOpen] = useState(false)

  const { mutate: createProject, isPending: createPending } = useMutation({
    mutationFn: async (name: string) => {
      if (!auth.authenticated) throw new Error(osmLoginRequiredMessage)
      if (!isValidDatasetName(name)) throw new Error(invalidProjectNameMessage)
      if (inventory.some((row) => row.dataset === name)) {
        throw new Error(`Gebiet „${name}“ existiert bereits.`)
      }
      await ratingStore.putProjectMeta(name, {
        createdAt: new Date().toISOString(),
        createdBy: auth.displayName,
      })
      return name
    },
    onSuccess: async (name) => {
      setCreateOpen(false)
      setNewProjectName('')
      setCreateError(null)
      await queryClient.invalidateQueries({ queryKey: projectMetaQueryKey })
      await queryClient.invalidateQueries({ queryKey: datasetSummariesQueryKey })
      await navigate({
        search: (previous) => ({
          ...previous,
          dataset: name,
          node: undefined,
          step: 'dataset',
        }),
        replace: true,
      })
    },
    onError: (caught: unknown) => {
      setCreateError(caught instanceof Error ? caught.message : 'Anlegen fehlgeschlagen')
    },
  })

  const { mutate: importNodes, isPending: importPending } = useMutation({
    mutationFn: async ({ text, name }: { text: string; name: string }) => {
      const parsed = parseNodesText(text, name)
      const stored = await saveNodes(parsed.collection, name)
      const records = await ratingStore.list(name).catch(() => ({}))
      const first = defaultWorkNodeId(
        stored.collection.features.map((feature) => feature.properties.id),
        records,
      )
      return { stored, first }
    },
    onSuccess: async ({ stored, first }) => {
      setError(null)
      setPendingText(null)
      await queryClient.invalidateQueries({ queryKey: ['datasets'] })
      await queryClient.invalidateQueries({ queryKey: ['dataset', stored.dataset] })
      await queryClient.invalidateQueries({ queryKey: ratingsQueryKey(stored.dataset) })
      await navigate({
        search: (previous) => ({
          ...previous,
          dataset: stored.dataset,
          node: first,
          view: 'work',
          status: 'unrated',
          step: 'work',
        }),
        replace: true,
      })
    },
    onError: (caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Import fehlgeschlagen')
    },
  })

  const { mutate: importSuggestions, isPending: suggestionsPending } = useMutation({
    mutationFn: async ({ text, name }: { text: string; name: string }) => {
      const rows = parseSuggestionsText(text)
      return saveSuggestions(rows, name)
    },
    onSuccess: async (stored) => {
      setPendingSuggestions(null)
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['suggestions', stored.dataset] })
      await queryClient.invalidateQueries({ queryKey: ['suggestions-counts'] })
    },
    onError: (caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Vorschläge fehlgeschlagen')
    },
  })

  function stageFileText(text: string) {
    if (!dataset) return
    try {
      parseNodesText(text, dataset)
      setPendingText(text)
      setError(null)
    } catch (caught: unknown) {
      setPendingText(null)
      setError(caught instanceof Error ? caught.message : 'Import fehlgeschlagen')
    }
  }

  function stageSuggestions(text: string) {
    if (!dataset) return
    try {
      parseSuggestionsText(text)
      setPendingSuggestions(text)
      setError(null)
    } catch (caught: unknown) {
      setPendingSuggestions(null)
      setError(caught instanceof Error ? caught.message : 'Vorschläge fehlgeschlagen')
    }
  }

  const importHeadline = !dataset
    ? 'Knoten importieren'
    : selectedRow?.local
      ? `Knoten überschreiben für ${dataset}`
      : `Knoten importieren für ${dataset}`

  return (
    <section>
      <Fieldset>
        <div className="flex items-center justify-between gap-2">
          <Subheading>Gebiet auswählen</Subheading>
          <Button
            outline
            type="button"
            aria-label="Neues Gebiet anlegen"
            aria-expanded={createOpen}
            aria-controls="create-project-panel"
            data-testid="create-project-toggle"
            onClick={() => setCreateOpen((open) => !open)}
          >
            <PlusIcon className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <MotionCollapse open={createOpen}>
          <div id="create-project-panel" className="mt-3">
            {!auth.authenticated ? (
              <Callout>Zum Anlegen eines Gebiets mit OSM anmelden.</Callout>
            ) : (
              <Field>
                <div className="flex items-center gap-1.5">
                  <Label>Gebietsname</Label>
                  <button
                    type="button"
                    className={infoIconButtonClassName}
                    aria-expanded={projectNameHelpOpen}
                    aria-controls="project-name-help"
                    aria-label="Erklärung zum Gebietsnamen"
                    onClick={() => setProjectNameHelpOpen((open) => !open)}
                  >
                    <InformationCircleIcon className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <MotionCollapse open={projectNameHelpOpen}>
                  <div id="project-name-help" className="pt-2">
                    <Text>{projectNameHelp}</Text>
                  </div>
                </MotionCollapse>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input
                    value={newProjectName}
                    onChange={(event) =>
                      setNewProjectName(event.currentTarget.value.trim().toLowerCase())
                    }
                    placeholder="berlin"
                    data-testid="dataset-name-input"
                    {...ignorePasswordManagerProps}
                    className="max-w-64"
                  />
                  <Button
                    type="button"
                    color="sky"
                    data-testid="create-project"
                    disabled={!newProjectName || createPending}
                    onClick={() => createProject(newProjectName)}
                  >
                    Anlegen
                  </Button>
                </div>
                {createError ? (
                  <Callout className="mt-2" tone="error">
                    {createError}
                  </Callout>
                ) : null}
              </Field>
            )}
          </div>
        </MotionCollapse>

        {dataset && selectedRow && !selectedRow.local ? (
          <Callout className="mt-3" title="Nur in der Datenbank">
            {selectedRow.remoteEntryCount} Bewertungen unter {dataset}. Knoten importieren, um zu
            bewerten.
          </Callout>
        ) : null}
        {inventory.length > 0 ? (
          <ul className="mt-3 space-y-1" data-testid="dataset-inventory">
            {inventory.map((row) => {
              const selected = row.dataset === dataset
              return (
                <li key={row.dataset}>
                  <button
                    type="button"
                    data-testid={`dataset-row-${row.dataset}`}
                    className={clsx(
                      'w-full rounded-lg px-3 py-2 text-left text-sm/6',
                      selected
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-300 hover:bg-white/5 hover:text-white',
                    )}
                    onClick={() => {
                      void (async () => {
                        const stored = await loadNodes(row.dataset)
                        if (!stored) {
                          await navigate({
                            search: (previous) => ({
                              ...previous,
                              dataset: row.dataset,
                              node: undefined,
                              step: 'dataset',
                            }),
                            replace: true,
                          })
                          return
                        }
                        const records = await ratingStore.list(row.dataset).catch(() => ({}))
                        const first = defaultWorkNodeId(
                          stored.collection.features.map((feature) => feature.properties.id),
                          records,
                        )
                        await navigate({
                          search: (previous) => ({
                            ...previous,
                            dataset: row.dataset,
                            node: first,
                            view: 'work',
                            status: 'unrated',
                            step: 'work',
                          }),
                          replace: true,
                        })
                      })()
                    }}
                  >
                    <span className="font-semibold">{row.dataset}</span>
                    <span className="ml-2 text-xs text-zinc-400">
                      {row.local
                        ? `Knoten importiert (${row.localNodeCount})`
                        : 'Keine Knoten in diesem Browser'}
                    </span>
                    <span className="mt-0.5 block text-xs/5 text-zinc-400">
                      {datasetInventoryCopy(row)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <Text className="mt-3">Noch kein Gebiet. Mit + oben ein neues Gebiet anlegen.</Text>
        )}
      </Fieldset>
      <SidebarDivider />
      <Fieldset>
        <div className="flex items-center gap-1.5">
          <Subheading>{importHeadline}</Subheading>
          <button
            type="button"
            className={infoIconButtonClassName}
            aria-expanded={importHelpOpen}
            aria-controls="import-help"
            aria-label="Hinweise zum Knotenimport"
            onClick={() => setImportHelpOpen((open) => !open)}
          >
            <InformationCircleIcon className="size-4" aria-hidden="true" />
          </button>
        </div>
        <MotionCollapse open={importHelpOpen}>
          <div id="import-help" className="space-y-2 pt-2">
            <Text>
              Knoten bleiben in diesem Browser. Bewertungen liegen in der gemeinsamen Datenbank. Sie
              gehören über den Gebietsnamen und die Knoten-IDs zusammen.
            </Text>
            <Text>
              ID aus <code>NUMMER</code> oder <code>Knotenpunkt-ID</code> (auch
              Unicode-Bindestrich). Point oder MultiPoint.
            </Text>
            <Text>
              <TextLink href={sampleNodesGithubUrl} target="_blank" rel="noreferrer">
                Testdaten herunterladen (dann hochladen)
              </TextLink>
            </Text>
            <Text>
              Optionale Vorschläge:{' '}
              <TextLink href={sampleSuggestionsGithubUrl} target="_blank" rel="noreferrer">
                Beispiel-Vorschläge herunterladen
              </TextLink>
            </Text>
          </div>
        </MotionCollapse>
        {!dataset ? (
          <Text className="mt-3">
            Zuerst oben ein Gebiet auswählen oder mit + ein neues anlegen.
          </Text>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label
            className={clsx(filePickerLabelClassName, !dataset && 'pointer-events-none opacity-50')}
          >
            Datei wählen
            <input
              type="file"
              accept=".geojson,application/geo+json,application/json"
              className="sr-only"
              data-testid="nodes-file-input"
              disabled={!dataset}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                if (file) void file.text().then(stageFileText)
              }}
            />
          </label>
          <Button
            type="button"
            color="sky"
            data-testid="import-dataset"
            disabled={!pendingText || !dataset || importPending}
            onClick={() => {
              if (!pendingText || !dataset) return
              if (selectedRow?.local) {
                const confirmed = window.confirm(
                  `Vorhandene lokale Knoten für „${dataset}“ werden ersetzt. Fortfahren?`,
                )
                if (!confirmed) return
              }
              importNodes({ text: pendingText, name: dataset })
            }}
          >
            {selectedRow?.local ? 'Überschreiben' : 'Importieren'}
          </Button>
        </div>
        {pendingText ? (
          <Text className="mt-2">
            Datei gelesen. {selectedRow?.local ? 'Überschreiben' : 'Importieren'} klicken.
          </Text>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label
            className={clsx(filePickerLabelClassName, !dataset && 'pointer-events-none opacity-50')}
          >
            Vorschläge wählen
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              data-testid="suggestions-file-input"
              disabled={!dataset}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                if (file) void file.text().then(stageSuggestions)
              }}
            />
          </label>
          <Button
            type="button"
            outline
            data-testid="import-suggestions"
            disabled={!pendingSuggestions || !dataset || suggestionsPending}
            onClick={() => {
              if (!pendingSuggestions || !dataset) return
              importSuggestions({ text: pendingSuggestions, name: dataset })
            }}
          >
            Vorschläge ersetzen
          </Button>
        </div>
        {error ? (
          <Callout className="mt-4" tone="error">
            {error}
          </Callout>
        ) : null}
      </Fieldset>
    </section>
  )
}
