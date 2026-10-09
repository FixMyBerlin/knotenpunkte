import {
  ArrowDownOnSquareIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ForwardIcon,
} from '@heroicons/react/20/solid'
import { useHotkeys } from '@tanstack/react-hotkeys'
import { Tooltip } from '@/components/shared/Tooltip/Tooltip'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { cn } from '@/shared/cn'
import { useTextEntryFocused } from '@/shared/dom/text-entry-focus'
import { firstEmptyRapidKey } from '@/shared/ratings/completeness'
import {
  hotkeyFor,
  nextHotkey,
  previousHotkey,
  rapidHotkeyBindings,
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

const rankClasses: Record<ProbabilityRank, string> = {
  high: 'bg-emerald-400/15 text-emerald-300',
  mid: 'bg-orange-400/15 text-orange-300',
  low: 'bg-red-400/15 text-red-300',
}

type Props = {
  draft: RapidDraft
  onChange: (next: RapidDraft) => void
  onSkip: () => void
  onPrevious: () => void
  onNext: () => void
  onSave: () => void
  suggestions: SuggestionRow[]
}

export function RapidForm({
  draft,
  onChange,
  onSkip,
  onPrevious,
  onNext,
  onSave,
  suggestions,
}: Props) {
  const textEntryFocused = useTextEntryFocused()
  const focused = firstEmptyRapidKey(draft)

  useHotkeys(
    [
      ...rapidHotkeyBindings.map((binding) => ({
        hotkey: binding.hotkey,
        callback: () => setValue(binding.attribute, binding.value),
        options: { meta: { name: binding.attribute } },
      })),
      {
        hotkey: skipHotkey,
        callback: onSkip,
        options: { meta: { name: 'Knotenpunkt nicht betrachten' } },
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
        options: { meta: { name: 'Speichern und weiter' } },
      },
    ],
    { enabled: !textEntryFocused, ignoreInputs: false },
  )

  function setValue(attribute: RapidAttributeKey, value: RapidValue) {
    onChange({ ...draft, [attribute]: value, KP_Nichtbetrachten: 0 })
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
      {rapidAttributeKeys.map((key) => {
        const meta = rapidAttributeMeta[key]
        const suggestion = suggestions.find((row) => row.attribute === key)
        const chosen = draft[key]
        const values: readonly RapidValue[] = meta.kind === 'binary' ? binaryValues : ternaryValues
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
            data-testid={`attr-${key}`}
            className={cn(
              'rounded-lg p-2 ring-1 ring-white/10',
              focused === key && 'ring-2 ring-sky-400',
            )}
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
                  hotkey={hotkeyFor(key, value)}
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
      <p className="sr-only">
        {binaryAttributeKeys.join(', ')}, {ternaryAttributeKeys.join(', ')}
      </p>
    </form>
  )
}

export function RapidActions({
  onSkip,
  onPrevious,
  onNext,
  onSave,
  saveDisabled,
}: Pick<Props, 'onSkip' | 'onPrevious' | 'onNext' | 'onSave'> & { saveDisabled?: boolean }) {
  return (
    <div className="@container flex w-full gap-1">
      <ActionButton
        testId="skip-node"
        label={`Knotenpunkt nicht betrachten (${skipHotkey})`}
        onClick={onSkip}
      >
        <ForwardIcon data-slot="icon" aria-hidden />
      </ActionButton>
      <ActionButton testId="prev-node" label={`Zurück (${previousHotkey})`} onClick={onPrevious}>
        <ChevronLeftIcon data-slot="icon" aria-hidden />
      </ActionButton>
      <ActionButton testId="next-node" label={`Weiter (${nextHotkey})`} onClick={onNext}>
        <ChevronRightIcon data-slot="icon" aria-hidden />
      </ActionButton>
      <ActionButton
        testId="save-next"
        label="Speichern und weiter (Enter)"
        onClick={onSave}
        disabled={saveDisabled}
        submit
      >
        <ArrowDownOnSquareIcon data-slot="icon" aria-hidden />
        <ArrowRightIcon data-slot="icon" aria-hidden />
      </ActionButton>
    </div>
  )
}

function ActionButton({
  testId,
  label,
  onClick,
  disabled,
  submit,
  children,
}: {
  testId: string
  label: string
  onClick: () => void
  disabled?: boolean
  submit?: boolean
  children: React.ReactNode
}) {
  const labelNode = <span className="hidden truncate @[32rem]:inline">{label}</span>
  const button = submit ? (
    <Button
      type="submit"
      form="rapid-form"
      color="sky"
      data-testid={testId}
      aria-label={label}
      disabled={disabled}
      className="w-full min-w-0"
    >
      {children}
      {labelNode}
    </Button>
  ) : (
    <Button
      type="button"
      outline
      data-testid={testId}
      aria-label={label}
      onClick={onClick}
      className="w-full min-w-0"
    >
      {children}
      {labelNode}
    </Button>
  )
  return (
    <Tooltip text={label} className="min-w-0 flex-1">
      {button}
    </Tooltip>
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
  hotkey: string
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
      <kbd className="rounded bg-black/30 px-1 font-mono text-[10px] text-zinc-300">{hotkey}</kbd>
      {children}
    </button>
  )
}
