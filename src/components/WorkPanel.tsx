import { ChevronLeftIcon, ChevronRightIcon, InformationCircleIcon } from '@heroicons/react/20/solid'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { INTERNAL_NOTE_ID, NodeNotes } from '@/components/NodeNotes'
import { QaPanel } from '@/components/QaPanel'
import { RapidActions, RapidForm } from '@/components/RapidForm'
import { MotionCollapse } from '@/components/shared/motion/MotionCollapse'
import { Tooltip } from '@/components/shared/Tooltip/Tooltip'
import { useOsmAuth } from '@/components/shared/use-osm-auth'
import { useRatingDraft } from '@/components/shared/use-rating-draft'
import { Callout } from '@/components/ui/callout'
import { Subheading } from '@/components/ui/heading'
import { SidebarBody, SidebarFooter } from '@/components/ui/sidebar'
import { Text } from '@/components/ui/text'
import { Route } from '@/routes/index'
import { cn } from '@/shared/cn'
import { loadNodes, loadSuggestions } from '@/shared/datasets/dataset-idb'
import { lsaConflict, readOnlyNodeFields } from '@/shared/nodes/schema'
import { buildRatingRecord } from '@/shared/ratings/build-record'
import {
  hasAllRapidAttributes,
  isRatingComplete,
  ratingProgress,
} from '@/shared/ratings/completeness'
import { nextHotkey, previousHotkey } from '@/shared/ratings/hotkeys'
import { osmLoginRequiredMessage } from '@/shared/ratings/kv-rating-store'
import { defaultWorkNodeId, nextNodeId, previousNodeId } from '@/shared/ratings/queue'
import {
  allRatingsQueryKey,
  datasetSummariesQueryKey,
  ratingStore,
  ratingsQueryKey,
} from '@/shared/ratings/ratings-query'
import { rapidValuesFromRecord, type RapidDraft } from '@/shared/ratings/schema'
import { resolveStatusFilter } from '@/shared/routing/search-schema'
import { suggestedBetrachtung, suggestionsForNode } from '@/shared/suggestions/schema'

export function WorkPanel() {
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const { dataset, node } = search
  const statusFilter = resolveStatusFilter(search)
  const auth = useOsmAuth()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noteRequiredNodeId, setNoteRequiredNodeId] = useState<string | null>(null)
  const [rateAnywayByNode, setRateAnywayByNode] = useState<Record<string, boolean>>({})

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
  const { draft, setDraft, clearDraft } = useRatingDraft(currentId)

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
    mutationFn: async (opts: {
      kind: 'save' | 'confirmed' | 'corrected'
      draft: RapidDraft
      deferred?: boolean
    }) => {
      if (!dataset || !currentId) throw new Error('Kein Knoten')
      if (!auth.authenticated || !auth.displayName) throw new Error(osmLoginRequiredMessage)
      const next = buildRatingRecord({
        previous: record,
        draft: opts.draft,
        suggestions: suggestionRows,
        actor: auth.displayName,
        kind: opts.kind,
        deferred: opts.deferred,
      })
      if (opts.kind === 'save' && !opts.deferred && next.status !== 'complete') {
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
        clearDraft()
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
  const lsaConflictSource = lsaConflict(feature.properties)
  const attributesVisible =
    suggestedBetrachtung(suggestionRows) === 1 ||
    lsaConflictSource !== undefined ||
    rateAnywayByNode[currentId] === true ||
    (record !== undefined && record.KP_Nichtbetrachten !== 1)
  const { rated, total } = ratingProgress(records, nodeIds)
  const canSave =
    auth.authenticated &&
    (!attributesVisible ||
      isRatingComplete(draft) ||
      (hasAllRapidAttributes(draft) && draft.KP_Nichtbetrachten !== 1))
  const skip = () => {
    // Notes, photos and sources stay; the record builder clears the seven attributes.
    const skipped = { ...draft, KP_Nichtbetrachten: 1 as const }
    setDraft(skipped)
    saveMutation.mutate({ kind: 'save', draft: skipped })
  }
  // Later, not now: the node stays open. The internal note says why.
  const defer = () => {
    if (!draft.Kommentar_intern?.trim()) {
      setNoteRequiredNodeId(currentId)
      document.getElementById(INTERNAL_NOTE_ID)?.focus()
      return
    }
    saveMutation.mutate({ kind: 'save', draft, deferred: true })
  }
  const previous = () => goToNode(previousNodeId(nodeIds, currentId, records, statusFilter))
  const next = () => goToNode(nextNodeId(nodeIds, currentId, records, statusFilter))
  const save = () =>
    attributesVisible
      ? saveMutation.mutate({ kind: correcting ? 'corrected' : 'save', draft })
      : skip()
  const rateAnyway = () => {
    setRateAnywayByNode((previous) => ({ ...previous, [currentId]: true }))
  }

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
                    className={cn(
                      'rounded p-0.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200',
                      detailsOpen && 'bg-white/10 text-white',
                    )}
                    aria-label={detailsOpen ? 'Knoten-Angaben schließen' : 'Knoten-Angaben'}
                    onClick={() => setDetailsOpen((open) => !open)}
                  >
                    <InformationCircleIcon className="size-4" aria-hidden />
                  </button>
                </Tooltip>
                {(
                  [
                    [
                      'prev-node',
                      `Vorheriger Knoten (${previousHotkey})`,
                      previous,
                      ChevronLeftIcon,
                    ],
                    ['next-node', `Nächster Knoten (${nextHotkey})`, next, ChevronRightIcon],
                  ] as const
                ).map(([testId, label, onClick, Icon]) => (
                  <Tooltip key={testId} text={label}>
                    <button
                      type="button"
                      data-testid={testId}
                      aria-label={label}
                      className="rounded p-0.5 text-zinc-300 ring-1 ring-white/15 hover:bg-white/10 hover:text-white"
                      onClick={onClick}
                    >
                      <Icon className="size-4" aria-hidden />
                    </button>
                  </Tooltip>
                ))}
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
            key={currentId}
            draft={draft}
            suggestions={suggestionRows}
            attributesVisible={attributesVisible}
            lsaConflict={lsaConflictSource}
            onRateAnyway={rateAnyway}
            onChange={setDraft}
            onSkip={skip}
            onDefer={defer}
            onPrevious={previous}
            onNext={next}
            onSave={save}
          />

          <NodeNotes
            draft={draft}
            onChange={setDraft}
            internalNoteRequired={noteRequiredNodeId === currentId}
          />

          {record?.status === 'complete' ? (
            <QaPanel
              record={record}
              displayName={auth.displayName}
              correcting={correcting}
              onConfirm={() =>
                saveMutation.mutate({ kind: 'confirmed', draft: rapidValuesFromRecord(record) })
              }
              onMarkProblematic={() => setCorrecting(true)}
            />
          ) : null}

          {error ? <Callout tone="error">{error}</Callout> : null}
          {!auth.authenticated ? <Callout>Zum Speichern mit OSM anmelden.</Callout> : null}
        </section>
      </SidebarBody>
      <SidebarFooter>
        <RapidActions
          onSkip={skip}
          onDefer={defer}
          saveDisabled={!canSave || saveMutation.isPending}
        />
      </SidebarFooter>
    </>
  )
}
