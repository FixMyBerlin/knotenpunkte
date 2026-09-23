import { Button } from '@/components/ui/button'
import { Field, Fieldset, Label } from '@/components/ui/fieldset'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ignorePasswordManagerProps } from '@/shared/form-ignore-password-manager'
import {
  binaryLabels,
  rapidAttributeKeys,
  rapidAttributeMeta,
  ternaryLabels,
  type RapidDraft,
} from '@/shared/ratings/schema'

type Props = {
  draft: RapidDraft
  onChange: (next: RapidDraft) => void
  onSubmit: () => void
  submitLabel?: string
}

export function FullMask({ draft, onChange, onSubmit, submitLabel = 'Speichern' }: Props) {
  return (
    <form
      data-testid="full-mask"
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <Fieldset>
        {rapidAttributeKeys.map((key) => {
          const meta = rapidAttributeMeta[key]
          return (
            <Field key={key}>
              <Label>
                {meta.title} ({key})
              </Label>
              <select
                className="mt-1 w-full rounded-lg border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-white"
                value={draft[key] === undefined ? '' : String(draft[key])}
                data-testid={`full-${key}`}
                onChange={(event) => {
                  const raw = event.currentTarget.value
                  if (raw === '') {
                    onChange({ ...draft, [key]: undefined })
                    return
                  }
                  if (meta.kind === 'binary') {
                    onChange({ ...draft, [key]: Number(raw) as 0 | 1, KP_Nichtbetrachten: 0 })
                    return
                  }
                  onChange({
                    ...draft,
                    [key]: raw as 'keine' | 'teilweise' | 'gänzlich',
                    KP_Nichtbetrachten: 0,
                  })
                }}
              >
                <option value="">—</option>
                {meta.kind === 'binary' ? (
                  <>
                    <option value="0">{binaryLabels[0]}</option>
                    <option value="1">{binaryLabels[1]}</option>
                  </>
                ) : (
                  <>
                    <option value="keine">{ternaryLabels.keine}</option>
                    <option value="teilweise">{ternaryLabels.teilweise}</option>
                    <option value="gänzlich">{ternaryLabels.gänzlich}</option>
                  </>
                )}
              </select>
            </Field>
          )
        })}
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
            <option value="0">Nein</option>
            <option value="1">Ja</option>
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
      <Button type="submit" color="sky" data-testid="full-mask-save">
        {submitLabel}
      </Button>
    </form>
  )
}
