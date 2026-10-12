import { useHotkeys } from '@tanstack/react-hotkeys'
import { Field, Fieldset, Label } from '@/components/ui/fieldset'
import { Textarea } from '@/components/ui/textarea'
import { useFocusInside } from '@/shared/dom/text-entry-focus'
import { ignorePasswordManagerProps } from '@/shared/form-ignore-password-manager'
import { customerNoteHotkey, internalNoteHotkey, sourceHotkey } from '@/shared/ratings/hotkeys'
import { addToList, removeFromList, splitList } from '@/shared/ratings/list-field'
import { ratingSources, type RapidDraft } from '@/shared/ratings/schema'

type Props = {
  draft: RapidDraft
  onChange: (next: RapidDraft) => void
  /** "Zurückstellen" was tried without an internal note: mark the field until it is filled. */
  internalNoteRequired?: boolean
}

export const NODE_NOTES_ID = 'node-notes'
export const CUSTOMER_NOTE_ID = 'note-customer'
export const INTERNAL_NOTE_ID = 'note-internal'
const FIRST_SOURCE_ID = 'source-first'

function focusElement(id: string) {
  document.getElementById(id)?.focus()
}

function Key({ children }: { children: string }) {
  return (
    <kbd className="ml-1.5 rounded bg-black/30 px-1 font-sans text-xs font-medium text-zinc-300">
      {children}
    </kbd>
  )
}

/** Quick answer for the internal note of a node that is put off. */
const missingPhotosNote = 'Fehlendes Fotomaterial'

const checkboxRowClass = 'flex items-center gap-2 text-sm text-zinc-200'

/** Notes, imagery sources and the virtual-node flag: always shown below the attributes. */
export function NodeNotes({ draft, onChange, internalNoteRequired = false }: Props) {
  const sources = splitList(draft.Quelle)
  const noteMissing = internalNoteRequired && !draft.Kommentar_intern?.trim()
  const focusInside = useFocusInside(NODE_NOTES_ID)

  // Outside these fields the keys jump in; inside, Tab moves on and Escape leaves.
  useHotkeys(
    [
      { hotkey: customerNoteHotkey, callback: () => focusElement(CUSTOMER_NOTE_ID) },
      { hotkey: internalNoteHotkey, callback: () => focusElement(INTERNAL_NOTE_ID) },
      { hotkey: sourceHotkey, callback: () => focusElement(FIRST_SOURCE_ID) },
    ],
    { enabled: !focusInside, ignoreInputs: false },
  )
  useHotkeys(
    [
      {
        hotkey: 'Escape',
        callback: () => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        },
      },
    ],
    { enabled: focusInside, ignoreInputs: false },
  )

  return (
    <Fieldset id={NODE_NOTES_ID} data-testid="node-notes" className="space-y-3">
      <Field>
        <Label>
          Hinweis an den Kunden<Key>{customerNoteHotkey}</Key>
        </Label>
        <Textarea
          id={CUSTOMER_NOTE_ID}
          value={draft.Kommentar ?? ''}
          data-testid="note-customer"
          rows={2}
          {...ignorePasswordManagerProps}
          onChange={(event) => onChange({ ...draft, Kommentar: event.currentTarget.value })}
        />
      </Field>
      <Field>
        <div className="flex items-center justify-between gap-2">
          <Label>
            Hinweis intern<Key>{internalNoteHotkey}</Key>
          </Label>
          <button
            type="button"
            data-testid="note-internal-missing-photos"
            className="rounded px-1.5 py-0.5 text-xs text-zinc-200 ring-1 ring-white/20 hover:bg-white/10"
            // Keeps the focus where it is, so the next key is a hotkey and not a second click.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChange({ ...draft, Kommentar_intern: missingPhotosNote })}
          >
            {missingPhotosNote}
          </button>
        </div>
        <Textarea
          id={INTERNAL_NOTE_ID}
          value={draft.Kommentar_intern ?? ''}
          data-testid="note-internal"
          rows={2}
          invalid={noteMissing}
          {...ignorePasswordManagerProps}
          onChange={(event) => onChange({ ...draft, Kommentar_intern: event.currentTarget.value })}
        />
        {noteMissing ? (
          <p className="mt-1 text-xs text-red-400" data-testid="note-internal-required">
            Zum Zurückstellen bitte einen internen Hinweis eintragen.
          </p>
        ) : null}
      </Field>
      <div>
        <p className="text-sm font-medium text-white">
          Quelle<Key>{sourceHotkey}</Key>
        </p>
        <p className="text-xs text-zinc-400">
          Wird gesetzt, wenn ein Mapillary-Foto zugeordnet oder infra3D geöffnet wird.
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
          {ratingSources.map((source, index) => (
            <label key={source} className={checkboxRowClass}>
              <input
                type="checkbox"
                id={index === 0 ? FIRST_SOURCE_ID : undefined}
                checked={sources.includes(source)}
                data-testid={`source-${source}`}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    Quelle: event.currentTarget.checked
                      ? addToList(draft.Quelle, source)
                      : removeFromList(draft.Quelle, source),
                  })
                }
              />
              {source}
            </label>
          ))}
        </div>
      </div>
      <label className={checkboxRowClass}>
        <input
          type="checkbox"
          checked={draft.ist_virtuell === 1}
          data-testid="node-ist_virtuell"
          onChange={(event) =>
            onChange({ ...draft, ist_virtuell: event.currentTarget.checked ? 1 : 0 })
          }
        />
        Virtueller Knoten (ist_virtuell)
      </label>
    </Fieldset>
  )
}
