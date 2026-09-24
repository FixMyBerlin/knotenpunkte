import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon, PhotoIcon } from '@heroicons/react/20/solid'
import type { EliCategory, EliLayer } from '@osm-editor-kit/maplibre-editor-layer-index/react'
import { useEditorLayerIndex } from '@osm-editor-kit/maplibre-editor-layer-index/react'
import * as countryCoder from '@rapideditor/country-coder'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useMapUiActions, usePrivateRasterUrl } from '@/components/shared/map-ui-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Route } from '@/routes/index'
import { cn } from '@/shared/cn'
import { ignorePasswordManagerProps } from '@/shared/form-ignore-password-manager'
import { MAIN_MAP_ID } from '@/shared/map/map-ids'
import {
  isPrivateRasterTemplate,
  POSITRON_BG,
  PRIVATE_BG,
  privateRasterDisplayName,
  writePrivateRasterUrl,
} from '@/shared/map/private-raster'

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
  bg,
  lat,
  lng,
}: {
  bg: string | null
  lat: number
  lng: number
}) {
  const navigate = useNavigate({ from: Route.fullPath })
  const privateUrl = usePrivateRasterUrl()
  const { setPrivateRasterUrl } = useMapUiActions()
  const [draftUrl, setDraftUrl] = useState(privateUrl)
  const [editingPrivateUrl, setEditingPrivateUrl] = useState(false)
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

  const selectedLayer = layers.find((layer) => layer.id === bg)
  const value = bg ?? (privateUrl ? PRIVATE_BG : POSITRON_BG)

  function handleChange(nextValue: string) {
    const nextBg =
      nextValue === POSITRON_BG || (nextValue === PRIVATE_BG && !bg && privateUrl)
        ? nextValue === POSITRON_BG
          ? POSITRON_BG
          : undefined
        : nextValue === PRIVATE_BG
          ? PRIVATE_BG
          : nextValue
    void navigate({
      search: (previous) => ({
        ...previous,
        bg: nextValue === PRIVATE_BG && privateUrl && !previous.bg ? undefined : nextBg,
      }),
      replace: true,
    })
  }

  function beginPrivateUrlEdit() {
    setDraftUrl(privateUrl)
    setEditingPrivateUrl(true)
  }

  function savePrivateUrl() {
    const trimmed = draftUrl.trim()
    if (trimmed && !isPrivateRasterTemplate(trimmed)) return
    writePrivateRasterUrl(trimmed)
    setPrivateRasterUrl(trimmed)
    setEditingPrivateUrl(false)
    if (trimmed) {
      void navigate({
        search: (previous) => ({ ...previous, bg: undefined }),
        replace: true,
      })
    }
  }

  const label = selectedLayer
    ? selectedLayer.name
    : value === PRIVATE_BG
      ? privateRasterDisplayName(privateUrl)
      : 'Hintergrundkarte'

  return (
    <Listbox value={value} onChange={handleChange}>
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
        <ListboxOption
          value={POSITRON_BG}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 data-focus:bg-white/10"
        >
          <CheckIcon
            className={cn('size-4 shrink-0', value === POSITRON_BG ? '' : 'opacity-0')}
            aria-hidden
          />
          <span>OpenFreeMap Positron</span>
        </ListboxOption>
        <div className="mt-1 border-t border-white/10 pt-1">
          <div className="px-2 py-1 text-[11px] font-semibold tracking-wide text-white/50 uppercase">
            Private background layer
          </div>
          <PrivateRasterRow
            editing={editingPrivateUrl}
            selected={value === PRIVATE_BG}
            url={privateUrl}
            draftUrl={draftUrl}
            onDraftUrl={setDraftUrl}
            onBeginEdit={beginPrivateUrlEdit}
            onSave={savePrivateUrl}
          />
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
              <ListboxOption
                key={layer.id}
                value={layer.id}
                className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 data-focus:bg-white/10"
              >
                <CheckIcon
                  className={cn('mt-0.5 size-4 shrink-0', layer.id === bg ? '' : 'opacity-0')}
                  aria-hidden
                />
                <span className="whitespace-normal">
                  {layer.name}
                  {layer.best ? ' ⭐' : null}
                </span>
              </ListboxOption>
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

function stopMenuEvent(event: { preventDefault: () => void; stopPropagation: () => void }) {
  event.preventDefault()
  event.stopPropagation()
}

function PrivateRasterRow({
  editing,
  selected,
  url,
  draftUrl,
  onDraftUrl,
  onBeginEdit,
  onSave,
}: {
  editing: boolean
  selected: boolean
  url: string
  draftUrl: string
  onDraftUrl: (value: string) => void
  onBeginEdit: () => void
  onSave: () => void
}) {
  if (editing) {
    return (
      <div
        className="flex items-center gap-2 px-2 py-1.5"
        onMouseDown={stopMenuEvent}
        onClick={stopMenuEvent}
      >
        <Input
          autoFocus
          value={draftUrl}
          placeholder="https://…/{z}/{x}/{y}.png?key=…"
          aria-label="Private Raster-Kachel-URL"
          className="min-w-0 flex-1"
          {...ignorePasswordManagerProps}
          onChange={(event) => onDraftUrl(event.currentTarget.value)}
          onKeyDown={(event) => event.stopPropagation()}
        />
        <Button
          type="button"
          color="sky"
          className="shrink-0"
          onMouseDown={stopMenuEvent}
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
            stopMenuEvent(event)
            onSave()
          }}
        >
          Speichern
        </Button>
      </div>
    )
  }

  if (!url) {
    return (
      <button
        type="button"
        className="w-full rounded-md px-2 py-1.5 text-left hover:bg-white/10"
        onMouseDown={stopMenuEvent}
        onClick={(event) => {
          stopMenuEvent(event)
          onBeginEdit()
        }}
      >
        URL angeben und auswählen
      </button>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 pr-2">
      <ListboxOption
        value={PRIVATE_BG}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 data-focus:bg-white/10"
      >
        <CheckIcon className={cn('size-4 shrink-0', selected ? '' : 'opacity-0')} aria-hidden />
        <span className="truncate">{privateRasterDisplayName(url)}</span>
      </ListboxOption>
      <button
        type="button"
        className="shrink-0 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-white/20 hover:bg-white/10"
        onMouseDown={stopMenuEvent}
        onClick={(event) => {
          stopMenuEvent(event)
          onBeginEdit()
        }}
      >
        Bearbeiten
      </button>
    </div>
  )
}
