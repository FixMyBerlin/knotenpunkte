import { useHotkeys } from '@tanstack/react-hotkeys'
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
  type RapidAttributeKey,
  type RapidDraft,
  type RapidValue,
} from '@/shared/ratings/schema'
import { formatSuggestionValue, suggestionMismatch } from '@/shared/suggestions/apply'
import type { SuggestionRow } from '@/shared/suggestions/schema'

type Props = {
  draft: RapidDraft
  onChange: (next: RapidDraft) => void
  onSkip: () => void
  onPrevious: () => void
  onNext: () => void
  onSave: () => void
  suggestions: SuggestionRow[]
  saveDisabled?: boolean
}

export function RapidForm({
  draft,
  onChange,
  onSkip,
  onPrevious,
  onNext,
  onSave,
  suggestions,
  saveDisabled,
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
        options: { meta: { name: 'Überspringen' } },
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
            <legend className="px-1 text-sm font-medium text-white">{meta.title}</legend>
            <p className="mb-2 text-xs text-zinc-500">{key}</p>
            <div className="flex flex-wrap gap-1.5">
              {meta.kind === 'binary'
                ? ([0, 1] as const).map((value) => (
                    <ChoiceButton
                      key={value}
                      pressed={chosen === value}
                      hotkey={hotkeyFor(key, value)}
                      testId={`attr-${key}-${value}`}
                      onClick={() => setValue(key, value)}
                    >
                      {binaryLabels[value]}
                    </ChoiceButton>
                  ))
                : (['keine', 'teilweise', 'gänzlich'] as const).map((value) => (
                    <ChoiceButton
                      key={value}
                      pressed={chosen === value}
                      hotkey={hotkeyFor(key, value)}
                      testId={`attr-${key}-${value}`}
                      onClick={() => setValue(key, value)}
                    >
                      {ternaryLabels[value]}
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
            {suggestion && !mismatch && chosen !== undefined ? (
              <p className="mt-1 text-xs text-zinc-500" data-testid={`suggestion-${key}`}>
                Vorschlag übernommen ({Math.round(suggestion.confidence * 100)} %)
              </p>
            ) : null}
          </fieldset>
        )
      })}
      <div className="flex flex-wrap gap-2">
        <Button type="button" outline data-testid="skip-node" onClick={onSkip}>
          Überspringen ({skipHotkey})
        </Button>
        <Button type="button" outline data-testid="prev-node" onClick={onPrevious}>
          Zurück ({previousHotkey})
        </Button>
        <Button type="button" outline data-testid="next-node" onClick={onNext}>
          Weiter ({nextHotkey})
        </Button>
        <Button type="submit" color="sky" data-testid="save-next" disabled={saveDisabled}>
          Speichern und weiter (Enter)
        </Button>
      </div>
      <p className="sr-only">
        {binaryAttributeKeys.join(', ')}, {ternaryAttributeKeys.join(', ')}
      </p>
    </form>
  )
}

function ChoiceButton({
  pressed,
  hotkey,
  testId,
  onClick,
  children,
}: {
  pressed: boolean
  hotkey: string
  testId: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm',
        pressed ? 'bg-sky-500/30 text-white' : 'bg-white/5 text-zinc-200 hover:bg-white/10',
      )}
    >
      <kbd className="rounded bg-black/30 px-1 font-mono text-[10px] text-zinc-300">{hotkey}</kbd>
      {children}
    </button>
  )
}
