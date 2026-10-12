import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon, PhotoIcon, StarIcon } from '@heroicons/react/20/solid'
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline'
import type { EliCategory, EliLayer } from '@osm-editor-kit/maplibre-editor-layer-index/react'
import { useEditorLayerIndex } from '@osm-editor-kit/maplibre-editor-layer-index/react'
import * as countryCoder from '@rapideditor/country-coder'
import { useState } from 'react'
import {
  useBackgroundFavorites,
  useRemoveBackgroundFavorite,
  useToggleBackgroundFavorite,
} from '@/components/shared/background-favorites-store'
import { useMapUiActions, usePrivateRasters } from '@/components/shared/map-ui-store'
import { Tooltip } from '@/components/shared/Tooltip/Tooltip'
import { useChooseBackground } from '@/components/shared/use-choose-background'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/shared/cn'
import { ignorePasswordManagerProps } from '@/shared/form-ignore-password-manager'
import { MAIN_MAP_ID } from '@/shared/map/map-ids'
import {
  type BackgroundChoice,
  backgroundChoiceId,
  newPrivateRasterId,
  POSITRON_BG,
  type PrivateRaster,
  privateRasterDisplayName,
  privateRasterUrlError,
  writePrivateRasters,
} from '@/shared/map/private-raster'

/** The private background in the form: `id` is `null` for one that is being added. */
type PrivateRasterDraft = { id: string | null; title: string; url: string }

const CATEGORY_LABELS: Record<EliCategory, string> = {
  photo: 'Luftbild / Satellit',
  map: 'Karten',
  osmbasedmap: 'OSM-basierte Karten',
  historicmap: 'Historische Karten',
  historicphoto: 'Historische Luftbilder',
  elevation: 'Höhenmodell',
  qa: 'QA',
  other: 'Sonstige',
}

const CATEGORY_ORDER: EliCategory[] = [
  'photo',
  'map',
  'osmbasedmap',
  'historicmap',
  'historicphoto',
  'elevation',
  'qa',
  'other',
]

function sortLayers(layers: EliLayer[]): EliLayer[] {
  return [...layers].sort((a, b) => {
    if (a.best !== b.best) return a.best ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export function MapBackgroundLayerControl({
  background,
  lat,
  lng,
}: {
  background: BackgroundChoice
  lat: number
  lng: number
}) {
  const chooseBackground = useChooseBackground()
  const privateRasters = usePrivateRasters()
  const { setPrivateRasters } = useMapUiActions()
  const removeFavorite = useRemoveBackgroundFavorite()
  const [draft, setDraft] = useState<PrivateRasterDraft | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)
  const centerCountry = countryCoder.iso1A2Code([lng, lat])

  const { layers, status } = useEditorLayerIndex({
    mapId: MAIN_MAP_ID,
    filter: {
      excludeOverlays: true,
      ...(centerCountry ? { countryCodes: [centerCountry] } : {}),
    },
  })

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    items: sortLayers(layers.filter((layer) => (layer.category ?? 'other') === category)),
  })).filter((group) => group.items.length > 0)

  const value = backgroundChoiceId(background)
  const selectedLayer =
    background.kind === 'eli' ? layers.find((layer) => layer.id === value) : undefined

  function storePrivateRasters(rasters: PrivateRaster[]) {
    writePrivateRasters(rasters)
    setPrivateRasters(rasters)
  }

  function editPrivateRaster(next: PrivateRasterDraft) {
    setDraft(next)
    setDraftError(null)
  }

  function savePrivateRaster() {
    if (!draft) return
    const url = draft.url.trim()
    const error = privateRasterUrlError(url)
    if (error) {
      setDraftError(error)
      return
    }
    const id = draft.id ?? newPrivateRasterId(privateRasters)
    const raster = { id, title: draft.title.trim() || privateRasterDisplayName(url), url }
    storePrivateRasters(
      draft.id
        ? privateRasters.map((item) => (item.id === id ? raster : item))
        : [...privateRasters, raster],
    )
    setDraft(null)
    chooseBackground(id)
  }

  function removePrivateRaster(id: string) {
    storePrivateRasters(privateRasters.filter((item) => item.id !== id))
    removeFavorite(id)
    setDraft(null)
    if (value === id) chooseBackground(POSITRON_BG)
  }

  const label = selectedLayer
    ? selectedLayer.name
    : background.kind === 'private'
      ? background.title
      : 'Hintergrundkarte'

  return (
    <Listbox value={value} onChange={chooseBackground}>
      <ListboxButton
        aria-label="Hintergrundkarte"
        className="flex max-w-52 items-center gap-1.5 rounded-lg bg-zinc-900/90 px-3 py-2 text-xs font-medium text-white shadow-lg ring-1 ring-white/10 hover:bg-zinc-800"
      >
        <PhotoIcon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
        <ChevronUpDownIcon className="size-4 shrink-0 opacity-70" aria-hidden />
      </ListboxButton>
      <ListboxOptions
        anchor={{ to: 'bottom end', gap: 8, padding: 12 }}
        className="z-50 max-h-[min(28rem,calc(100dvh-5.5rem))] w-[min(22rem,calc(100vw-1.25rem))] rounded-lg bg-zinc-900/95 p-1 text-sm text-white shadow-lg ring-1 ring-white/10"
      >
        <div className="flex items-center gap-1 pr-1">
          <ListboxOption
            value={POSITRON_BG}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 data-focus:bg-white/10"
          >
            <CheckIcon
              className={cn('size-4 shrink-0', value === POSITRON_BG ? '' : 'opacity-0')}
              aria-hidden
            />
            <span>OpenFreeMap Positron</span>
          </ListboxOption>
          <FavoriteButton id={POSITRON_BG} name="OpenFreeMap Positron" />
        </div>
        <div className="mt-1 border-t border-white/10 pt-1">
          <div className="px-2 py-1 text-[11px] font-semibold tracking-wide text-white/50 uppercase">
            Private Hintergründe
          </div>
          {privateRasters.map((raster) =>
            draft?.id === raster.id ? null : (
              <div key={raster.id} className="flex items-center gap-1 pr-1">
                <ListboxOption
                  value={raster.id}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 data-focus:bg-white/10"
                >
                  <CheckIcon
                    className={cn('size-4 shrink-0', raster.id === value ? '' : 'opacity-0')}
                    aria-hidden
                  />
                  <span className="truncate">{raster.title}</span>
                </ListboxOption>
                <button
                  type="button"
                  data-testid={`private-raster-edit-${raster.id}`}
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-white/20 hover:bg-white/10"
                  onMouseDown={stopMenuEvent}
                  onClick={(event) => {
                    stopMenuEvent(event)
                    editPrivateRaster(raster)
                  }}
                >
                  Bearbeiten
                </button>
                <FavoriteButton id={raster.id} name={raster.title} />
              </div>
            ),
          )}
          {draft ? (
            <PrivateRasterForm
              draft={draft}
              error={draftError}
              onChange={editPrivateRaster}
              onSave={savePrivateRaster}
              onCancel={() => setDraft(null)}
              onRemove={draft.id ? () => removePrivateRaster(draft.id!) : undefined}
            />
          ) : (
            <button
              type="button"
              data-testid="private-raster-add"
              className="w-full rounded-md px-2 py-1.5 text-left text-white/80 hover:bg-white/10"
              onMouseDown={stopMenuEvent}
              onClick={(event) => {
                stopMenuEvent(event)
                editPrivateRaster({ id: null, title: '', url: '' })
              }}
            >
              + Hintergrund mit eigener URL hinzufügen
            </button>
          )}
        </div>

        {status === 'loading' && groups.length === 0 ? (
          <div className="px-2 py-1.5 text-white/60">Ebenen werden geladen …</div>
        ) : null}

        {groups.map((group) => (
          <div
            key={group.category}
            className="mt-1 border-t border-white/10 pt-1 first:mt-0 first:border-0 first:pt-0"
          >
            <div className="px-2 py-1 text-[11px] font-semibold tracking-wide text-white/50 uppercase">
              {group.label}
            </div>
            {group.items.map((layer) => (
              <div key={layer.id} className="flex items-start gap-1 pr-1">
                <ListboxOption
                  value={layer.id}
                  className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 data-focus:bg-white/10"
                >
                  <CheckIcon
                    className={cn('mt-0.5 size-4 shrink-0', layer.id === value ? '' : 'opacity-0')}
                    aria-hidden
                  />
                  <span className="whitespace-normal">
                    {layer.name}
                    {layer.best ? <span className="text-white/50"> · empfohlen</span> : null}
                  </span>
                </ListboxOption>
                <FavoriteButton id={layer.id} name={layer.name} />
              </div>
            ))}
          </div>
        ))}

        {status === 'ready' && groups.length === 0 ? (
          <div className="px-2 py-1.5 text-white/60">Keine Luftbild-Ebenen hier</div>
        ) : null}
      </ListboxOptions>
    </Listbox>
  )
}

const PRIVATE_URL_ERROR_ID = 'private-raster-url-error'

function stopMenuEvent(event: { preventDefault: () => void; stopPropagation: () => void }) {
  event.preventDefault()
  event.stopPropagation()
}

function PrivateRasterForm({
  draft,
  error,
  onChange,
  onSave,
  onCancel,
  onRemove,
}: {
  draft: PrivateRasterDraft
  error: string | null
  onChange: (draft: PrivateRasterDraft) => void
  onSave: () => void
  onCancel: () => void
  /** Only for a background that is already stored. */
  onRemove?: () => void
}) {
  const smallButtonClass =
    'shrink-0 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-white/20 hover:bg-white/10'
  const menuButton = (action: () => void) => ({
    onMouseDown: stopMenuEvent,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      stopMenuEvent(event)
      action()
    },
  })

  return (
    <div
      className="space-y-1.5 px-2 py-1.5"
      data-testid="private-raster-form"
      onMouseDown={stopMenuEvent}
      onClick={stopMenuEvent}
    >
      <Input
        autoFocus
        value={draft.title}
        placeholder="Titel, z. B. Befliegung 2025"
        aria-label="Titel des privaten Hintergrunds"
        data-testid="private-raster-title"
        {...ignorePasswordManagerProps}
        onChange={(event) => onChange({ ...draft, title: event.currentTarget.value })}
        onKeyDown={(event) => event.stopPropagation()}
      />
      <Input
        value={draft.url}
        placeholder="https://…/{z}/{x}/{y}.png?key=…"
        aria-label="Raster-Kachel-URL des privaten Hintergrunds"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? PRIVATE_URL_ERROR_ID : undefined}
        data-testid="private-raster-url"
        {...ignorePasswordManagerProps}
        onChange={(event) => onChange({ ...draft, url: event.currentTarget.value })}
        onKeyDown={(event) => event.stopPropagation()}
      />
      {error ? (
        <p id={PRIVATE_URL_ERROR_ID} role="alert" className="text-xs text-red-400">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          color="sky"
          className="shrink-0"
          data-testid="private-raster-save"
          {...menuButton(onSave)}
        >
          Speichern
        </Button>
        <button type="button" className={smallButtonClass} {...menuButton(onCancel)}>
          Abbrechen
        </button>
        {onRemove ? (
          <button
            type="button"
            data-testid="private-raster-remove"
            className={cn(smallButtonClass, 'ml-auto text-red-300')}
            {...menuButton(onRemove)}
          >
            Löschen
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** Star at the end of a row: starred backgrounds get a button on the map. */
function FavoriteButton({ id, name }: { id: string; name: string }) {
  const favorite = useBackgroundFavorites().some((item) => item.id === id)
  const toggleFavorite = useToggleBackgroundFavorite()
  const label = favorite ? 'Favorit entfernen' : 'Als Favorit auf der Karte zeigen'

  return (
    <Tooltip text={label}>
      <button
        type="button"
        aria-pressed={favorite}
        aria-label={`${label}: ${name}`}
        data-testid={`background-star-${id}`}
        className="mt-0.5 shrink-0 rounded-md p-1 hover:bg-white/10"
        onMouseDown={stopMenuEvent}
        onClick={(event) => {
          stopMenuEvent(event)
          toggleFavorite({ id, name })
        }}
      >
        {favorite ? (
          <StarIcon className="size-4 text-amber-300" aria-hidden />
        ) : (
          <StarOutlineIcon className="size-4 text-white/50" aria-hidden />
        )}
      </button>
    </Tooltip>
  )
}
