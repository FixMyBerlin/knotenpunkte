import { Field, Fieldset, Label } from '@/components/ui/fieldset'
import { Textarea } from '@/components/ui/textarea'
import { ignorePasswordManagerProps } from '@/shared/form-ignore-password-manager'
import { addToList, removeFromList, splitList } from '@/shared/ratings/list-field'
import { ratingSources, type RapidDraft } from '@/shared/ratings/schema'

type Props = {
  draft: RapidDraft
  onChange: (next: RapidDraft) => void
  /** "Zurückstellen" was tried without an internal note: mark the field until it is filled. */
  internalNoteRequired?: boolean
}

export const INTERNAL_NOTE_ID = 'note-internal'

/** Quick answer for the internal note of a node that is put off. */
const missingPhotosNote = 'Fehlendes Fotomaterial'

const checkboxRowClass = 'flex items-center gap-2 text-sm text-zinc-200'

/** Notes, imagery sources and the virtual-node flag: always shown below the attributes. */
export function NodeNotes({ draft, onChange, internalNoteRequired = false }: Props) {
  const sources = splitList(draft.Quelle)
  const noteMissing = internalNoteRequired && !draft.Kommentar_intern?.trim()

  return (
    <Fieldset data-testid="node-notes" className="space-y-3">
      <Field>
        <Label>Hinweis an den Kunden</Label>
        <Textarea
          value={draft.Kommentar ?? ''}
          data-testid="note-customer"
          rows={2}
          {...ignorePasswordManagerProps}
          onChange={(event) => onChange({ ...draft, Kommentar: event.currentTarget.value })}
        />
      </Field>
      <Field>
        <div className="flex items-center justify-between gap-2">
          <Label>Hinweis intern</Label>
          <button
            type="button"
            data-testid="note-internal-missing-photos"
            className="rounded px-1.5 py-0.5 text-xs text-zinc-200 ring-1 ring-white/20 hover:bg-white/10"
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
        <p className="text-sm font-medium text-white">Quelle</p>
        <p className="text-xs text-zinc-400">
          Wird gesetzt, wenn ein Mapillary-Foto zugeordnet oder infra3D geöffnet wird.
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
          {ratingSources.map((source) => (
            <label key={source} className={checkboxRowClass}>
              <input
                type="checkbox"
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
