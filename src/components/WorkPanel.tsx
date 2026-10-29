import { ChevronLeftIcon, ChevronRightIcon, InformationCircleIcon } from '@heroicons/react/20/solid'
import { cn } from '@shared/cn'
import { MotionCollapse } from '@shared/components/motion/MotionCollapse'
import { Tooltip } from '@shared/components/Tooltip/Tooltip'
import { Callout } from '@shared/components/ui/callout'
import { Subheading } from '@shared/components/ui/heading'
import { SidebarBody, SidebarFooter } from '@shared/components/ui/sidebar'
import { Text } from '@shared/components/ui/text'
import { useOsmAuth } from '@shared/components/use-osm-auth'
import { kvQueryOptions } from '@shared/kv/query-options'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { INTERNAL_NOTE_ID, NodeNotes } from '@/components/NodeNotes'
import { QaPanel } from '@/components/QaPanel'
import { OWN_ENTER_ATTRIBUTE, RapidActions, RapidForm } from '@/components/RapidForm'
import {
  clearDraftIfUnchanged,
  draftKey,
  useRatingDraft,
} from '@/components/shared/use-rating-draft'
import { Route } from '@/routes/index'
import { loadNodes, loadSuggestions } from '@/shared/datasets/dataset-idb'
import { lsaConflict, readOnlyNodeFields } from '@/shared/nodes/schema'
import { buildRatingRecord } from '@/shared/ratings/build-record'
import {
  hasAllRapidAttributes,
  isRatingComplete,
  notRelevantAttributes,
} from '@/shared/ratings/completeness'
import { nextHotkey, previousHotkey } from '@/shared/ratings/hotkeys'
import { osmLoginRequiredMessage, RatingConflictError } from '@/shared/ratings/kv-rating-store'
import { defaultWorkNodeId, nextNodeId, previousNodeId } from '@/shared/ratings/queue'
import {
  allRatingsQueryKey,
  datasetSummariesQueryKey,
  ratingStore,
  ratingsQueryKey,
  unreadableRatingsQueryKey,
} from '@/shared/ratings/ratings-query'
import {
  rapidAttributeKeys,
  rapidValuesFromRecord,
  type HistoryKind,
  type RapidDraft,
  type RatingRecord,
} from '@/shared/ratings/schema'
import { resolveStatusFilter } from '@/shared/routing/search-schema'
import { suggestedBetrachtung, suggestionsForNode } from '@/shared/suggestions/schema'

/** Edits are stored this long after the last change, and at once when the node is left. */
const AUTOSAVE_DELAY_MS = 800

type SaveArgs = {
  dataset: string
  nodeId: string
  draft: RapidDraft
  kind: HistoryKind
  autosave?: boolean
}

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
    ...kvQueryOptions,
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
  const { draft, dirty, ready, setDraft, clearDraft } = useRatingDraft(currentId)
  const unreadableQuery = useQuery({
    queryKey: unreadableRatingsQueryKey(dataset ?? ''),
    queryFn: () => ratingStore.listUnreadable(dataset!),
    enabled: Boolean(dataset),
    staleTime: Infinity,
  })
  const unreadable = currentId !== undefined && (unreadableQuery.data ?? []).includes(currentId)
  const [autosaving, setAutosaving] = useState(0)

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

  // Saves run one after the other, each on top of the result of the one before: the store
  // refuses a save that is not based on the latest version of the entry.
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve())
  function enqueueSave({ dataset, nodeId, draft, kind, autosave = false }: SaveArgs) {
    const actor = auth.displayName
    const run = async () => {
      if (!auth.authenticated || !actor) throw new Error(osmLoginRequiredMessage)
      const key = ratingsQueryKey(dataset)
      const previous = queryClient.getQueryData<Record<string, RatingRecord>>(key)?.[nodeId]
      const next = buildRatingRecord({
        previous,
        draft,
        suggestions: suggestionsForNode(suggestionsQuery.data?.rows ?? [], nodeId),
        actor,
        kind,
        autosave,
      })
      if (
        !autosave &&
        kind === 'save' &&
        next.Zurueckgestellt !== 1 &&
        next.status !== 'complete'
      ) {
        throw new Error(
          'Alle sieben Attribute setzen oder „Nicht relevant“ oder „Nicht betrachten“ wählen.',
        )
      }
      try {
        await ratingStore.put(dataset, nodeId, next)
      } catch (caught) {
        if (caught instanceof RatingConflictError) {
          // The edits were made on an outdated rating: show the current one instead.
          clearDraftIfUnchanged(draftKey(dataset, nodeId), draft)
          void queryClient.invalidateQueries({ queryKey: key })
        }
        throw caught
      }
      queryClient.setQueryData<Record<string, RatingRecord>>(key, (old) => ({
        ...old,
        [nodeId]: next,
      }))
      clearDraftIfUnchanged(draftKey(dataset, nodeId), draft)
      return next
    }
    const result = saveQueueRef.current.then(run, run)
    saveQueueRef.current = result.catch(() => undefined)
    return result
  }

  const pendingAutosaveRef = useRef<SaveArgs | null>(null)
  const autosaveTimerRef = useRef<number | undefined>(undefined)
  function cancelAutosave() {
    window.clearTimeout(autosaveTimerRef.current)
    pendingAutosaveRef.current = null
  }
  function flushAutosave() {
    const pending = pendingAutosaveRef.current
    cancelAutosave()
    if (!pending) return
    setAutosaving((count) => count + 1)
    enqueueSave(pending)
      .then(() => setError(null))
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error ? caught.message : 'Automatisches Speichern fehlgeschlagen',
        )
      })
      .finally(() => setAutosaving((count) => count - 1))
  }

  const canAutosave = auth.authenticated && ready && !unreadable
  useEffect(
    function scheduleAutosaveOfEdits() {
      if (!dirty || !canAutosave || !dataset || !currentId) return
      pendingAutosaveRef.current = {
        dataset,
        nodeId: currentId,
        draft,
        kind: 'save',
        autosave: true,
      }
      window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = window.setTimeout(flushAutosave, AUTOSAVE_DELAY_MS)
    },
    // `flushAutosave` only reads refs and stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, dirty, canAutosave, dataset, currentId],
  )
  useEffect(
    function flushAutosaveWhenLeavingNode() {
      return flushAutosave
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataset, currentId],
  )

  const saveMutation = useMutation({
    mutationFn: (opts: { kind: HistoryKind; draft: RapidDraft }) => {
      if (!dataset || !currentId) throw new Error('Kein Knoten')
      // This save includes the edits an autosave would have stored.
      cancelAutosave()
      return enqueueSave({ dataset, nodeId: currentId, draft: opts.draft, kind: opts.kind })
    },
    onSuccess: (_next, variables) => {
      if (!dataset) return
      setError(null)
      setCorrecting(false)
      clearDraft()
      void queryClient.invalidateQueries({ queryKey: allRatingsQueryKey })
      void queryClient.invalidateQueries({ queryKey: datasetSummariesQueryKey })
      if (variables.kind === 'save' || variables.kind === 'corrected') {
        const saved =
          queryClient.getQueryData<Record<string, RatingRecord>>(ratingsQueryKey(dataset)) ?? {}
        goToNode(nextNodeId(nodeIds, currentId, saved, statusFilter))
      }
      // Picks up what other raters stored in the meantime.
      void queryClient.invalidateQueries({ queryKey: ratingsQueryKey(dataset) })
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
  if (ratingsQuery.isError) {
    return (
      <SidebarBody>
        <Callout tone="error" title="Bewertungen nicht geladen">
          Die gespeicherten Bewertungen konnten nicht geladen werden. Ohne sie wird nichts
          gespeichert, damit nichts überschrieben wird. Bitte die Seite neu laden.
        </Callout>
      </SidebarBody>
    )
  }
  if (!ready) {
    return (
      <SidebarBody>
        <Text>Lade Bewertungen …</Text>
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
    // A record that only holds notes, photos or sources (autosave) is no rating yet.
    (record !== undefined &&
      record.KP_Nichtbetrachten !== 1 &&
      (record.Zurueckgestellt === 1 || rapidAttributeKeys.some((key) => record[key] !== undefined)))
  const busy = saveMutation.isPending
  const canSave =
    auth.authenticated &&
    !unreadable &&
    (!attributesVisible ||
      isRatingComplete(draft) ||
      (hasAllRapidAttributes(draft) && draft.KP_Nichtbetrachten !== 1))
  // Not relevant. Notes, photos and sources stay; HVS and LSA are set to Nein and the other
  // attributes are cleared.
  const skip = () => {
    if (busy || unreadable) return
    saveMutation.mutate({
      kind: 'save',
      draft: { ...draft, ...notRelevantAttributes(), KP_Nichtbetrachten: 1, Zurueckgestellt: 0 },
    })
  }
  // Not considered, e.g. a motorway node: HVS and LSA and all other answers stay as they are,
  // the node counts as finished.
  const exclude = () => {
    if (busy || unreadable) return
    saveMutation.mutate({
      kind: 'save',
      draft: { ...draft, KP_Nichtbetrachten: 1, Zurueckgestellt: 0 },
    })
  }
  // Later, not now: the node stays open. The internal note says why.
  const defer = () => {
    if (busy || unreadable) return
    if (!draft.Kommentar_intern?.trim()) {
      setNoteRequiredNodeId(currentId)
      document.getElementById(INTERNAL_NOTE_ID)?.focus()
      return
    }
    saveMutation.mutate({
      kind: 'save',
      draft: { ...draft, KP_Nichtbetrachten: 0, Zurueckgestellt: 1 },
    })
  }
  const previous = () => goToNode(previousNodeId(nodeIds, currentId, records, statusFilter))
  const next = () => goToNode(nextNodeId(nodeIds, currentId, records, statusFilter))
  const save = () => {
    if (busy || unreadable) return
    if (!attributesVisible) return skip()
    saveMutation.mutate({
      kind: correcting ? 'corrected' : 'save',
      draft: { ...draft, Zurueckgestellt: 0 },
    })
  }
  const saveState = !auth.authenticated
    ? null
    : busy || autosaving > 0
      ? 'Speichert …'
      : dirty
        ? 'Änderungen noch nicht gespeichert'
        : record
          ? record.Zurueckgestellt === 1
            ? 'Gespeichert · zurückgestellt'
            : record.status === 'complete'
              ? 'Gespeichert'
              : 'Zwischenstand gespeichert · noch offen'
          : null
  const rateAnyway = () => {
    setRateAnywayByNode((previous) => ({ ...previous, [currentId]: true }))
  }

  return (
    <>
      <SidebarBody>
        <section className="space-y-4" data-testid="work-panel" {...{ [OWN_ENTER_ATTRIBUTE]: '' }}>
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
              </div>
              <div className="flex shrink-0 items-center gap-1">
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
                      className="flex items-center gap-0.5 rounded px-1 py-0.5 text-zinc-300 ring-1 ring-white/15 hover:bg-white/10 hover:text-white"
                      onClick={onClick}
                    >
                      <Icon className="size-4" aria-hidden />
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
            {saveState ? (
              <p className="pt-1 text-xs text-zinc-400" data-testid="save-state">
                {saveState}
              </p>
            ) : null}
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

          {unreadable ? (
            <Callout
              tone="error"
              title="Gespeicherter Eintrag nicht lesbar"
              data-testid="unreadable"
            >
              Für diesen Knoten liegt ein Eintrag in der Datenbank, den die Anwendung nicht lesen
              kann. Damit er nicht überschrieben wird, ist das Speichern hier gesperrt. Bitte an die
              Entwicklung melden.
            </Callout>
          ) : null}

          <RapidForm
            key={currentId}
            busy={busy}
            draft={draft}
            suggestions={suggestionRows}
            attributesVisible={attributesVisible}
            lsaConflict={lsaConflictSource}
            onRateAnyway={rateAnyway}
            onChange={setDraft}
            onSkip={skip}
            onExclude={exclude}
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
          onExclude={exclude}
          onDefer={defer}
          busy={busy || unreadable}
          saveDisabled={!canSave || busy}
        />
      </SidebarFooter>
    </>
  )
}
