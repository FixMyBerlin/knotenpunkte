import { Button } from '@shared/components/ui/button'
import { Checkbox, CheckboxField } from '@shared/components/ui/checkbox'
import { Field, Label } from '@shared/components/ui/fieldset'
import { Subheading } from '@shared/components/ui/heading'
import { Select } from '@shared/components/ui/select'
import { Text } from '@shared/components/ui/text'
import { useHotkeys } from '@tanstack/react-hotkeys'
import { useDrawActions } from '@/components/draw-store'
import {
  useSelectedSuggestionId,
  useNoActionSuggestions,
  useSkippedSuggestions,
  useSuggestionActions,
  useSuggestionFilter,
  useSuggestionsVisible,
} from '@/components/suggestion-store'
import { useNetwork, useSaveEntries } from '@/components/use-netz'
import { useOpenSuggestions } from '@/components/use-suggestions'
import { planSuggestedNode } from '@/network/edit'
import { suggestVirtualNodeName } from '@/network/naming'
import { suggestionHost } from '@/network/suggestion-lookup'
import {
  suggestionFilterLabels,
  type NodeSuggestion,
  type SuggestionFilter,
} from '@/network/suggestions'
import { Route } from '@/routes/index'

const filters = Object.keys(suggestionFilterLabels) as SuggestionFilter[]

function SuggestionDetails({
  suggestion,
  neighbour,
  gebiet,
}: {
  suggestion: NodeSuggestion
  /** The suggestion to show after this one is taken over or skipped. */
  neighbour: NodeSuggestion | undefined
  gebiet: string | undefined
}) {
  const { network } = useNetwork(gebiet)
  const save = useSaveEntries(gebiet)
  const draw = useDrawActions()
  const actions = useSuggestionActions()
  const host = network ? suggestionHost(network, suggestion) : null

  function goTo(next: NodeSuggestion | undefined) {
    actions.select(next?.id ?? null)
    if (next) draw.flyTo(next.lngLat)
  }

  function take() {
    if (!network || !host) return
    const writes = planSuggestedNode(network, host)
    save.mutate(writes, {
      onSuccess: (saved) => {
        draw.setLastNewNodes(saved.map((entry) => `v:${entry.id}`))
        goTo(neighbour)
      },
    })
  }

  function skip() {
    if (gebiet) actions.skip(gebiet, suggestion.id)
    goTo(neighbour)
  }

  function markNoAction() {
    if (gebiet) actions.markNoAction(gebiet, suggestion.id)
    goTo(neighbour)
  }

  const canTake = Boolean(host) && !save.isPending
  useHotkeys([
    {
      hotkey: 'W',
      callback: () => {
        if (canTake) take()
      },
      options: { meta: { name: 'Vorschlag übernehmen' } },
    },
    { hotkey: 'E', callback: skip, options: { meta: { name: 'Vorschlag überspringen' } } },
    {
      hotkey: 'R',
      callback: () => {
        markNoAction()
      },
      options: { meta: { name: 'Keine Aktion nötig' } },
    },
  ])

  if (!network) return null
  const name = host
    ? suggestVirtualNodeName({ network, host: host.edge, stationM: host.stationM })
    : null

  return (
    <div className="space-y-3 rounded-lg bg-zinc-800 p-3" data-testid="suggestion-details">
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-400">Kante</dt>
          <dd className="text-right break-words text-zinc-100">
            {suggestion.elementNr ?? '–'}
            {suggestion.strassenname ? ` (${suggestion.strassenname})` : ''}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-400">Radfernweg</dt>
          <dd className="text-right break-words text-zinc-100">{suggestion.routen ?? '–'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-400">Schnittwinkel</dt>
          <dd className="text-zinc-100">
            {Math.round(suggestion.winkelGrad)}°{suggestion.steil ? '' : ' (flach)'}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-400">Lücke in der Nähe</dt>
          <dd className="text-zinc-100">{suggestion.lueckeNah ? 'ja' : 'nein'}</dd>
        </div>
      </dl>
      {name ? (
        <Text className="text-xs">
          Es entsteht der virtuelle Knoten <strong className="text-zinc-200">{name.name}</strong>:{' '}
          {name.reason}. Der Name lässt sich danach ändern.
        </Text>
      ) : (
        <Text className="text-xs text-red-400">
          Hier liegt keine Kante (mehr); der Knoten kann nicht angelegt werden.
        </Text>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          color="sky"
          disabled={!host || save.isPending}
          onClick={take}
          data-testid="suggestion-take"
        >
          Übernehmen <kbd className="ml-1 text-xs opacity-60">W</kbd>
        </Button>
        <Button type="button" outline onClick={skip}>
          Überspringen <kbd className="ml-1 text-xs opacity-60">E</kbd>
        </Button>
        <Button type="button" outline onClick={markNoAction} data-testid="suggestion-no-action">
          Keine Aktion nötig <kbd className="ml-1 text-xs opacity-60">R</kbd>
        </Button>
      </div>
    </div>
  )
}

/** Node suggestions where a Radfernweg crosses an edge: look at them one by one and take over. */
export function SuggestionsPanel() {
  const { gebiet } = Route.useSearch()
  const { network } = useNetwork(gebiet)
  const { open, selected } = useOpenSuggestions(gebiet, network)
  const filter = useSuggestionFilter()
  const visible = useSuggestionsVisible()
  const skipped = useSkippedSuggestions()
  const noAction = useNoActionSuggestions()
  const selectedId = useSelectedSuggestionId()
  const actions = useSuggestionActions()
  const draw = useDrawActions()
  if (!network || network.base.suggestions.length === 0) return null

  const skippedCount = gebiet ? (skipped[gebiet]?.length ?? 0) : 0
  const noActionCount = gebiet ? (noAction[gebiet]?.length ?? 0) : 0
  const index = selected ? open.indexOf(selected) : -1
  const neighbour = open[index + 1] ?? open[index - 1]

  function show(suggestion: NodeSuggestion | undefined) {
    actions.select(suggestion?.id ?? null)
    if (suggestion) draw.flyTo(suggestion.lngLat)
  }

  return (
    <div className="space-y-3" data-testid="suggestions-panel">
      <Subheading>Knotenvorschläge</Subheading>
      <Text className="text-xs">
        Hier kreuzt ein Radfernweg eine Detailnetzkante ohne Knoten in der Nähe. Übernehmen legt
        dort einen virtuellen Knoten an.
      </Text>
      <CheckboxField>
        <Checkbox checked={visible} onChange={actions.setVisible} />
        <Label>Auf der Karte zeigen</Label>
      </CheckboxField>
      <Field>
        <Label>Anzeigen</Label>
        <Select
          value={filter}
          onChange={(event) => actions.setFilter(event.currentTarget.value as SuggestionFilter)}
        >
          {filters.map((item) => (
            <option key={item} value={item}>
              {suggestionFilterLabels[item]}
            </option>
          ))}
        </Select>
      </Field>
      <Text className="text-xs" data-testid="suggestions-count">
        {open.length} offen{skippedCount > 0 ? `, ${skippedCount} übersprungen` : ''}
        {noActionCount > 0 ? `, ${noActionCount} ohne Aktion` : ''}
        {skippedCount + noActionCount > 0 && gebiet ? (
          <>
            {' · '}
            <button
              type="button"
              className="text-sky-400 hover:underline"
              onClick={() => actions.clearSkipped(gebiet)}
            >
              zurücksetzen
            </button>
          </>
        ) : null}
      </Text>
      {selected ? (
        <SuggestionDetails
          key={selected.id}
          suggestion={selected}
          neighbour={neighbour}
          gebiet={gebiet}
        />
      ) : open.length > 0 ? (
        <Button type="button" outline onClick={() => show(open[0])}>
          {selectedId ? 'Zum ersten Vorschlag' : 'Ersten Vorschlag zeigen'}
        </Button>
      ) : null}
    </div>
  )
}
