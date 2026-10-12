import { useHotkeys } from '@tanstack/react-hotkeys'
import { useEffect, useRef, useState } from 'react'
import { Tooltip } from '@/components/shared/Tooltip/Tooltip'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { cn } from '@/shared/cn'
import { scrollIntoContainer } from '@/shared/dom/scroll-into-container'
import { useTextEntryFocused } from '@/shared/dom/text-entry-focus'
import {
  choiceHotkeys,
  deferHotkey,
  nextHotkey,
  previousHotkey,
  skipHotkey,
} from '@/shared/ratings/hotkeys'
import {
  binaryAttributeKeys,
  binaryLabels,
  rapidAttributeKeys,
  rapidAttributeMeta,
  ternaryAttributeKeys,
  ternaryLabels,
  type BinaryValue,
  type RapidAttributeKey,
  type RapidDraft,
  type RapidValue,
  type TernaryValue,
} from '@/shared/ratings/schema'
import {
  formatSuggestionValue,
  rankProbabilities,
  suggestionMismatch,
  type ProbabilityRank,
} from '@/shared/suggestions/apply'
import { suggestionProbability, type SuggestionRow } from '@/shared/suggestions/schema'

const binaryValues = [0, 1] as const
const ternaryValues = ['keine', 'teilweise', 'gänzlich'] as const

function valuesOf(key: RapidAttributeKey): readonly RapidValue[] {
  return rapidAttributeMeta[key].kind === 'binary' ? binaryValues : ternaryValues
}

const rankClasses: Record<ProbabilityRank, string> = {
  high: 'bg-emerald-400/15 text-emerald-300',
  mid: 'bg-orange-400/15 text-orange-300',
  low: 'bg-red-400/15 text-red-300',
}

type Props = {
  draft: RapidDraft
  onChange: (next: RapidDraft) => void
  onSkip: () => void
  onDefer: () => void
  onPrevious: () => void
  onNext: () => void
  onSave: () => void
  suggestions: SuggestionRow[]
  /** `false`: the node needs no rating; show a hint instead of the attributes. */
  attributesVisible: boolean
  /** `LSA_Konflikt` of the node: Open Data and OSM disagree whether an LSA exists. */
  lsaConflict?: string
  onRateAnyway: () => void
}

export function RapidForm({
  draft,
  onChange,
  onSkip,
  onDefer,
  onPrevious,
  onNext,
  onSave,
  suggestions,
  attributesVisible,
  lsaConflict,
  onRateAnyway,
}: Props) {
  const textEntryFocused = useTextEntryFocused()
  // The attribute the choice keys answer. Each node starts at the top (the form is keyed by node).
  const [activeIndex, setActiveIndex] = useState(0)
  const activeKey = attributesVisible ? rapidAttributeKeys[activeIndex] : undefined
  const lastIndex = rapidAttributeKeys.length - 1
  const activeRef = useRef<HTMLFieldSetElement>(null)

  useEffect(
    function keepActiveAttributeInView() {
      if (activeRef.current) scrollIntoContainer(activeRef.current)
    },
    [activeIndex],
  )

  useHotkeys(
    [
      ...(activeKey ? choiceHotkeys : []).map((hotkey, index) => ({
        hotkey,
        callback: () => {
          const value = activeKey ? valuesOf(activeKey)[index] : undefined
          if (activeKey && value !== undefined) setValue(activeKey, value)
        },
        options: { meta: { name: `Antwort ${index + 1}` } },
      })),
      ...(activeKey
        ? [
            {
              hotkey: 'Tab' as const,
              callback: () => setActiveIndex((index) => Math.min(index + 1, lastIndex)),
              options: { meta: { name: 'Nächstes Attribut' } },
            },
            {
              hotkey: 'Shift+Tab' as const,
              callback: () => setActiveIndex((index) => Math.max(index - 1, 0)),
              options: { meta: { name: 'Vorheriges Attribut' } },
            },
          ]
        : []),
      {
        hotkey: skipHotkey,
        callback: onSkip,
        options: { meta: { name: 'Nicht relevant' } },
      },
      {
        hotkey: deferHotkey,
        callback: onDefer,
        options: { meta: { name: 'Zurückstellen' } },
      },
      {
        hotkey: previousHotkey,
        callback: onPrevious,
        options: { meta: { name: 'Vorheriger Knoten' } },
      },
      {
        hotkey: nextHotkey,
        callback: onNext,
        options: { meta: { name: 'Nächster Knoten' } },
      },
      {
        hotkey: 'Enter',
        callback: onSave,
        options: { meta: { name: 'Speichern' } },
      },
    ],
    { enabled: !textEntryFocused, ignoreInputs: false },
  )

  /** Answers the attribute and moves on to the next one. */
  function setValue(attribute: RapidAttributeKey, value: RapidValue) {
    onChange({ ...draft, [attribute]: value, KP_Nichtbetrachten: 0 })
    setActiveIndex(Math.min(rapidAttributeKeys.indexOf(attribute) + 1, lastIndex))
  }

  return (
    <form
      id="rapid-form"
      data-testid="rapid-form"
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
    >
      {attributesVisible ? null : (
        <Callout tone="info" title="Nicht zu betrachten" data-testid="not-considered-hint">
          <p>Laut Vorschlag weder HVS noch LSA.</p>
          <p>Bitte manuell prüfen!</p>
          <Button
            type="button"
            outline
            className="mt-2"
            data-testid="rate-anyway"
            onClick={onRateAnyway}
          >
            Doch bewerten
          </Button>
        </Callout>
      )}
      {lsaConflict ? (
        <Callout tone="warning" title="LSA unsicher" data-testid="lsa-conflict-hint">
          <p>
            Unklar, ob eine LSA vorhanden ist (
            {lsaConflict === 'nur_OSM'
              ? 'nur in OSM'
              : lsaConflict === 'nur_OpenData'
                ? 'nur in Open Data'
                : lsaConflict}
            ).
          </p>
          <p>Bitte manuell prüfen!</p>
        </Callout>
      ) : null}
      {(attributesVisible ? rapidAttributeKeys : []).map((key) => {
        const meta = rapidAttributeMeta[key]
        const suggestion = suggestions.find((row) => row.attribute === key)
        const chosen = draft[key]
        const values = valuesOf(key)
        const active = activeKey === key
        const probabilities = values.map((value) =>
          suggestion ? suggestionProbability(suggestion, value) : undefined,
        )
        const ranks = rankProbabilities(probabilities)
        const mismatch = suggestion
          ? suggestionMismatch(chosen, suggestion.value as RapidValue)
          : false
        return (
          <fieldset
            key={key}
            ref={active ? activeRef : undefined}
            data-testid={`attr-${key}`}
            data-active={active ? '' : undefined}
            className={cn(
              'rounded-lg p-2 ring-1 ring-white/10',
              active && 'bg-sky-400/5 ring-2 ring-sky-400',
            )}
            onMouseDown={() => setActiveIndex(rapidAttributeKeys.indexOf(key))}
          >
            <legend className="float-left mb-1.5 w-full px-1 text-sm font-medium text-white">
              <Tooltip text={key}>
                <span>{meta.title}</span>
              </Tooltip>
            </legend>
            <div className="clear-both flex flex-col gap-1.5">
              {values.map((value, index) => (
                <ChoiceButton
                  key={value}
                  pressed={chosen === value}
                  hotkey={active ? choiceHotkeys[index] : undefined}
                  testId={`attr-${key}-${value}`}
                  onClick={() => setValue(key, value)}
                  probability={probabilities[index]}
                  rank={ranks[index]}
                  reserveProbability={suggestion !== undefined}
                >
                  {meta.kind === 'binary'
                    ? binaryLabels[value as BinaryValue]
                    : ternaryLabels[value as TernaryValue]}
                </ChoiceButton>
              ))}
            </div>
            {mismatch && suggestion ? (
              <Callout className="mt-2" tone="warning" title="Abweichung vom Vorschlag">
                Vorschlag {formatSuggestionValue(suggestion.value)}, gewählt{' '}
                {chosen === 0 ||
                chosen === 1 ||
                chosen === 'keine' ||
                chosen === 'teilweise' ||
                chosen === 'gänzlich'
                  ? formatSuggestionValue(chosen)
                  : '—'}
              </Callout>
            ) : null}
          </fieldset>
        )
      })}
      {attributesVisible ? (
        <p className="sr-only">
          {binaryAttributeKeys.join(', ')}, {ternaryAttributeKeys.join(', ')}
        </p>
      ) : null}
    </form>
  )
}

const actionKbdClass = 'rounded bg-black/30 px-1 font-sans text-xs font-medium'

/** Save, and the two ways to leave a node unrated; each with its key. All go to the next node. */
export function RapidActions({
  onSkip,
  onDefer,
  saveDisabled,
}: Pick<Props, 'onSkip' | 'onDefer'> & { saveDisabled?: boolean }) {
  return (
    <div className="flex w-full flex-wrap gap-1">
      <Tooltip text="Speichern und zum nächsten Knoten" className="w-full">
        <Button
          type="submit"
          form="rapid-form"
          color="sky"
          data-testid="save-next"
          disabled={saveDisabled}
          className="w-full"
        >
          Speichern
          <kbd className={actionKbdClass}>Enter</kbd>
        </Button>
      </Tooltip>
      <Tooltip
        text="Knotenpunkt nicht betrachten: setzt HVS und LSA auf Nein, speichert und geht weiter"
        className="min-w-0 flex-1"
      >
        <Button type="button" outline data-testid="skip-node" onClick={onSkip} className="w-full">
          Nicht relevant
          <kbd className={actionKbdClass}>{skipHotkey}</kbd>
        </Button>
      </Tooltip>
      <Tooltip
        text="Später bewerten: braucht einen internen Hinweis, der Knoten bleibt offen"
        className="min-w-0 flex-1"
      >
        <Button type="button" outline data-testid="defer-node" onClick={onDefer} className="w-full">
          Zurückstellen
          <kbd className={actionKbdClass}>{deferHotkey}</kbd>
        </Button>
      </Tooltip>
    </div>
  )
}

function ChoiceButton({
  pressed,
  hotkey,
  testId,
  onClick,
  probability,
  rank,
  reserveProbability,
  children,
}: {
  pressed: boolean
  /** Only the active attribute's choices have a key. */
  hotkey?: string
  testId: string
  onClick: () => void
  probability?: number
  rank?: ProbabilityRank
  reserveProbability: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm',
        pressed ? 'bg-sky-500/30 text-white' : 'bg-white/5 text-zinc-200 hover:bg-white/10',
      )}
    >
      {reserveProbability ? (
        <span
          className={cn(
            'w-12 shrink-0 rounded px-1 text-right text-xs whitespace-nowrap tabular-nums',
            rank && rankClasses[rank],
          )}
          title="Wahrscheinlichkeit laut Vorschlagsmodell"
          data-testid={`${testId}-probability`}
        >
          {probability !== undefined ? `${Math.round(probability * 100)} %` : null}
        </span>
      ) : null}
      {hotkey ? (
        <kbd className="rounded bg-black/30 px-1 font-sans text-xs font-semibold text-zinc-200">
          {hotkey}
        </kbd>
      ) : null}
      {children}
    </button>
  )
}
