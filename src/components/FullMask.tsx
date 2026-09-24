import { Field, Fieldset, Label } from '@/components/ui/fieldset'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ignorePasswordManagerProps } from '@/shared/form-ignore-password-manager'
import { binaryLabels, type RapidDraft } from '@/shared/ratings/schema'

type Props = {
  draft: RapidDraft
  onChange: (next: RapidDraft) => void
}

export function FullMask({ draft, onChange }: Props) {
  return (
    <Fieldset data-testid="full-mask" id="full-mask">
      <Field>
        <Label>Virtueller Knoten (ist_virtuell)</Label>
        <select
          className="mt-1 w-full rounded-lg border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-white"
          value={String(draft.ist_virtuell)}
          data-testid="full-ist_virtuell"
          onChange={(event) =>
            onChange({ ...draft, ist_virtuell: Number(event.currentTarget.value) as 0 | 1 })
          }
        >
          <option value="0">{binaryLabels[0]}</option>
          <option value="1">{binaryLabels[1]}</option>
        </select>
      </Field>
      <Field>
        <Label>Mapillary-ID</Label>
        <Input
          value={draft['Mapillary-ID'] ?? ''}
          data-testid="full-mapillary"
          {...ignorePasswordManagerProps}
          onChange={(event) => onChange({ ...draft, 'Mapillary-ID': event.currentTarget.value })}
        />
      </Field>
      <Field>
        <Label>Kommentar</Label>
        <Textarea
          value={draft.Kommentar ?? ''}
          data-testid="full-comment"
          rows={3}
          {...ignorePasswordManagerProps}
          onChange={(event) => onChange({ ...draft, Kommentar: event.currentTarget.value })}
        />
      </Field>
    </Fieldset>
  )
}
