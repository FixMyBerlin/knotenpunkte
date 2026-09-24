import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { FullMask } from '@/components/FullMask'
import { QaPanel } from '@/components/QaPanel'
import { RapidActions, RapidForm } from '@/components/RapidForm'
import { MotionCollapse } from '@/components/shared/motion/MotionCollapse'
import { Tooltip } from '@/components/shared/Tooltip/Tooltip'
import { useOsmAuth } from '@/components/shared/use-osm-auth'
import { Callout } from '@/components/ui/callout'
import { Subheading } from '@/components/ui/heading'
import { SidebarBody, SidebarFooter } from '@/components/ui/sidebar'
import { Text } from '@/components/ui/text'
import { Route } from '@/routes/index'
import { loadNodes, loadSuggestions } from '@/shared/datasets/dataset-idb'
import { readOnlyNodeFields } from '@/shared/nodes/schema'
import { buildRatingRecord } from '@/shared/ratings/build-record'
import {
  hasAllRapidAttributes,
  isRatingComplete,
  ratingProgress,
} from '@/shared/ratings/completeness'
import { osmLoginRequiredMessage } from '@/shared/ratings/kv-rating-store'
import { defaultWorkNodeId, nextNodeId, previousNodeId } from '@/shared/ratings/queue'
import {
  allRatingsQueryKey,
  datasetSummariesQueryKey,
  ratingStore,
  ratingsQueryKey,
} from '@/shared/ratings/ratings-query'
import { emptyRapidDraft, rapidValuesFromRecord, type RapidDraft } from '@/shared/ratings/schema'
import { resolveStatusFilter } from '@/shared/routing/search-schema'
import { applySuggestions } from '@/shared/suggestions/apply'
import { suggestionsForNode } from '@/shared/suggestions/schema'

function revealFullMask() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.getElementById('full-mask')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  })
}

export function WorkPanel() {
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const { dataset, node } = search
  const statusFilter = resolveStatusFilter(search)
  const auth = useOsmAuth()
  const [fullOpen, setFullOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftByNode, setDraftByNode] = useState<Record<string, RapidDraft>>({})

  const nodesQuery = useQuery({
    queryKey: ['dataset', dataset],
    queryFn: () => loadNodes(dataset!),
    enabled: Boolean(dataset),
  })
  const ratingsQuery = useQuery({
    queryKey: ratingsQueryKey(dataset ?? ''),
    queryFn: () => ratingStore.list(dataset!),
    enabled: Boolean(dataset),
  })
  const suggestionsQuery = useQuery({
    queryKey: ['suggestions', dataset],
    queryFn: () => loadSuggestions(dataset!),
    enabled: Boolean(dataset),
  })

  const nodes = nodesQuery.data?.collection
  const records = ratingsQuery.data ?? {}
  const nodeIds = nodes?.features.map((feature) => feature.properties.id) ?? []
  const currentId = defaultWorkNodeId(nodeIds, records, node)
  const feature = nodes?.features.find((item) => item.properties.id === currentId)
  const record = currentId ? records[currentId] : undefined
  const suggestionRows = suggestionsForNode(suggestionsQuery.data?.rows ?? [], currentId ?? '')
  const storedDraft = currentId ? draftByNode[currentId] : undefined
  const draft = storedDraft
    ? storedDraft
    : record
      ? rapidValuesFromRecord(record)
      : applySuggestions(emptyRapidDraft(), suggestionRows)

  function setDraft(next: RapidDraft) {
    if (!currentId) return
    setDraftByNode((previous) => ({ ...previous, [currentId]: next }))
  }

  function goToNode(nextId: string | undefined) {
    void navigate({
      search: (previous) => ({
        ...previous,
        node: nextId,
        step: 'work',
      }),
      replace: true,
    })
  }

  const saveMutation = useMutation({
    mutationFn: async (opts: { kind: 'save' | 'confirmed' | 'corrected'; draft: RapidDraft }) => {
      if (!dataset || !currentId) throw new Error('Kein Knoten')
      if (!auth.authenticated || !auth.displayName) throw new Error(osmLoginRequiredMessage)
      const next = buildRatingRecord({
        previous: record,
        draft: opts.draft,
        suggestions: suggestionRows,
        actor: auth.displayName,
        kind: opts.kind,
      })
      if (opts.kind === 'save' && next.status !== 'complete') {
        throw new Error('Alle sieben Attribute setzen oder überspringen.')
      }
      await ratingStore.put(dataset, currentId, next)
      return next
    },
    onSuccess: async (_next, variables) => {
      if (!dataset) return
      setError(null)
      setCorrecting(false)
      await queryClient.invalidateQueries({ queryKey: ratingsQueryKey(dataset) })
      await queryClient.invalidateQueries({ queryKey: allRatingsQueryKey })
      await queryClient.invalidateQueries({ queryKey: datasetSummariesQueryKey })
      if (variables.kind === 'save' || variables.kind === 'corrected') {
        const refreshed = await ratingStore.list(dataset)
        const next = nextNodeId(nodeIds, currentId, refreshed, statusFilter)
        if (currentId) {
          setDraftByNode((previous) => {
            const copy = { ...previous }
            delete copy[currentId]
            return copy
          })
        }
        goToNode(next)
      }
    },
    onError: (caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Speichern fehlgeschlagen')
    },
  })

  if (!dataset) {
    return (
      <SidebarBody>
        <Callout title="Kein Gebiet">Wähle zuerst ein Gebiet.</Callout>
      </SidebarBody>
    )
  }
  if (!nodes) {
    return (
      <SidebarBody>
        <Callout title="Keine Knoten">Importiere eine Knoten-Datei für {dataset}.</Callout>
      </SidebarBody>
    )
  }
  if (!feature || !currentId) {
    return (
      <SidebarBody>
        <Callout title="Keine Knoten in diesem Filter">
          Filter ändern oder Datei importieren.
        </Callout>
      </SidebarBody>
    )
  }

  const readonly = readOnlyNodeFields(feature.properties)
  const { rated, total } = ratingProgress(records, nodeIds)
  const canSave =
    auth.authenticated &&
    (isRatingComplete(draft) || (hasAllRapidAttributes(draft) && draft.KP_Nichtbetrachten !== 1))
  const skip = () => {
    const skipped = { ...emptyRapidDraft(), KP_Nichtbetrachten: 1 as const }
    setDraft(skipped)
    saveMutation.mutate({ kind: 'save', draft: skipped })
  }
  const previous = () => goToNode(previousNodeId(nodeIds, currentId, records, statusFilter))
  const next = () => goToNode(nextNodeId(nodeIds, currentId, records, statusFilter))
  const save = () => saveMutation.mutate({ kind: correcting ? 'corrected' : 'save', draft })

  return (
    <>
      <SidebarBody>
        <section className="space-y-4" data-testid="work-panel">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1">
                <Subheading data-testid="selected-node-id">Knoten {readonly.nummer}</Subheading>
                <Tooltip text={detailsOpen ? 'Knoten-Angaben schließen' : 'Knoten-Angaben'}>
                  <button
                    type="button"
                    aria-expanded={detailsOpen}
                    aria-controls="node-details"
                    data-testid="node-details-toggle"
                    className="rounded p-0.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                    aria-label={detailsOpen ? 'Knoten-Angaben schließen' : 'Knoten-Angaben'}
                    onClick={() => setDetailsOpen((open) => !open)}
                  >
                    {detailsOpen ? (
                      <ChevronDownIcon className="size-4" aria-hidden />
                    ) : (
                      <ChevronRightIcon className="size-4" aria-hidden />
                    )}
                  </button>
                </Tooltip>
              </div>
              <Text data-testid="progress-count">
                {rated}/{total} bewertet
              </Text>
            </div>
            <MotionCollapse open={detailsOpen}>
              <dl
                id="node-details"
                className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-2 text-xs text-zinc-400"
              >
                <dt>Referenz</dt>
                <dd className="min-w-0 truncate">{readonly.okstraId || '—'}</dd>
                <dt>Bezirk</dt>
                <dd>{readonly.bezirksnummer || '—'}</dd>
                <dt>Radverkehrsnetz</dt>
                <dd>{readonly.radvorrangnetz || '—'}</dd>
              </dl>
            </MotionCollapse>
          </div>

          <RapidForm
            draft={draft}
            suggestions={suggestionRows}
            onChange={setDraft}
            onSkip={skip}
            onPrevious={previous}
            onNext={next}
            onSave={save}
          />

          <div>
            <button
              type="button"
              data-testid="toggle-full-mask"
              aria-expanded={fullOpen || correcting}
              aria-controls="full-mask"
              className="flex items-center gap-1 text-sm font-medium text-white"
              onClick={() => {
                setFullOpen((open) => {
                  const next = !open
                  if (next) revealFullMask()
                  return next
                })
              }}
            >
              {fullOpen || correcting ? (
                <ChevronDownIcon className="size-4" aria-hidden />
              ) : (
                <ChevronRightIcon className="size-4" aria-hidden />
              )}
              Weitere Angaben
            </button>
            <MotionCollapse open={fullOpen || correcting}>
              <div className="pt-2">
                <FullMask draft={draft} onChange={setDraft} />
              </div>
            </MotionCollapse>
          </div>

          {record?.status === 'complete' ? (
            <QaPanel
              record={record}
              displayName={auth.displayName}
              correcting={correcting}
              onConfirm={() =>
                saveMutation.mutate({ kind: 'confirmed', draft: rapidValuesFromRecord(record) })
              }
              onMarkProblematic={() => {
                setCorrecting(true)
                setFullOpen(true)
                revealFullMask()
              }}
            />
          ) : null}

          {error ? <Callout tone="error">{error}</Callout> : null}
          {!auth.authenticated ? <Callout>Zum Speichern mit OSM anmelden.</Callout> : null}
        </section>
      </SidebarBody>
      <SidebarFooter>
        <RapidActions
          onSkip={skip}
          onPrevious={previous}
          onNext={next}
          onSave={save}
          saveDisabled={!canSave || saveMutation.isPending}
        />
      </SidebarFooter>
    </>
  )
}
