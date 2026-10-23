import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import type { PhotoTypeFilter } from '@osm-editor-kit/street-imagery'
import { PhotoDateRangeFilter, useAllProviderPhotos } from '@osm-editor-kit/street-imagery-react'
import { cn } from '@shared/cn'
import {
  usePhotoDateFilter,
  usePhotoFilterActions,
  usePhotoTypeFilter,
} from '@shared/components/mapillary/photo-filter-store'
import { useViewportBbox } from '@shared/components/mapillary/use-viewport-bbox'
import { Tooltip } from '@shared/components/Tooltip/Tooltip'
import { mapillaryCutoffDate } from '@shared/config/shared.const'
import {
  mapillaryProviders,
  photoColorModeLabels,
  photoStyle,
  type PhotoColorMode,
} from '@shared/mapillary/photo-style'
import { useState } from 'react'

const colorModes = Object.keys(photoColorModeLabels) as PhotoColorMode[]

const photoTypes: { id: PhotoTypeFilter | undefined; label: string }[] = [
  { id: undefined, label: 'Alle' },
  { id: 'pano', label: '360°' },
  { id: 'flat', label: 'Klassisch' },
]

const dateMarkers = [{ date: mapillaryCutoffDate, label: 'Stichtag' }]

type Props = {
  photosOn: boolean
  onPhotosChange: (on: boolean) => void
  photoColor: PhotoColorMode
  onPhotoColorChange: (mode: PhotoColorMode) => void
  zoom: number
  /** Changes when the camera moves, so the date marks follow the map. */
  viewportKey: string
}

/** Switches the Mapillary photos on and off; folds out the colour, photo type and date settings. */
export function MapillaryToggle({ photosOn, onPhotosChange, ...settings }: Props) {
  const [open, setOpen] = useState(false)
  const label = open ? 'Einstellungen schließen' : 'Einstellungen öffnen'

  return (
    <div className="w-64 rounded-lg bg-zinc-900/90 px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/10">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-pressed={photosOn}
          data-testid="photos-toggle"
          className="rounded px-1.5 py-0.5 font-medium ring-1 ring-white/20 hover:bg-white/10"
          onClick={() => onPhotosChange(!photosOn)}
        >
          {photosOn ? 'An' : 'Aus'}
        </button>
        <span className="min-w-0 flex-1 truncate font-medium">Mapillary-Fotos</span>
        <Tooltip text={label}>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="photo-settings"
            aria-label={label}
            data-testid="photo-settings-toggle"
            className="rounded p-0.5 hover:bg-white/10"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? (
              <ChevronDownIcon className="size-4" aria-hidden />
            ) : (
              <ChevronRightIcon className="size-4" aria-hidden />
            )}
          </button>
        </Tooltip>
      </div>
      {open ? (
        photosOn ? (
          <PhotoSettings {...settings} />
        ) : (
          <p id="photo-settings" className="mt-2 text-zinc-400">
            Die Einstellungen gelten für eingeschaltete Fotos.
          </p>
        )
      ) : null}
    </div>
  )
}

function SegmentedButtons<T extends string | undefined>({
  items,
  value,
  onChange,
  testIdPrefix,
}: {
  items: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
  testIdPrefix: string
}) {
  return (
    <div className="mt-1 flex -space-x-px">
      {items.map((item) => (
        <button
          key={item.id ?? 'all'}
          type="button"
          aria-pressed={value === item.id}
          data-testid={`${testIdPrefix}-${item.id ?? 'all'}`}
          className={cn(
            'h-6 flex-1 border border-slate-300 bg-white font-medium first:rounded-l-md last:rounded-r-md hover:bg-slate-100',
            value === item.id && 'z-10 border-slate-800 bg-slate-800 text-white hover:bg-slate-800',
          )}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function PhotoSettings({
  photoColor,
  onPhotoColorChange,
  zoom,
  viewportKey,
}: Omit<Props, 'photosOn' | 'onPhotosChange'>) {
  const date = usePhotoDateFilter()
  const photoType = usePhotoTypeFilter()
  const { setDate, setPhotoType } = usePhotoFilterActions()
  const bbox = useViewportBbox(viewportKey)
  // All photos in view, before the date filter: the slider marks where photos exist.
  const { photos } = useAllProviderPhotos(
    mapillaryProviders,
    bbox,
    zoom,
    photoType ? [photoType] : undefined,
  )

  return (
    <div
      id="photo-settings"
      data-testid="photo-settings"
      className="mt-2 space-y-2.5 rounded-md bg-white p-2 text-slate-800"
    >
      <div>
        <p className="text-slate-500">Farbe nach</p>
        <SegmentedButtons
          items={colorModes.map((id) => ({ id, label: photoColorModeLabels[id] }))}
          value={photoColor}
          onChange={onPhotoColorChange}
          testIdPrefix="photo-color"
        />
        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
          {photoStyle(photoColor, date).legend.map((item) => (
            <li key={item.label} className="flex items-center gap-1">
              <span
                className="inline-block size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-slate-500">Fototyp</p>
        <SegmentedButtons
          items={photoTypes}
          value={photoType}
          onChange={setPhotoType}
          testIdPrefix="photo-type"
        />
      </div>
      <div>
        <p className="mb-4 text-slate-500">Aufnahmedatum</p>
        <PhotoDateRangeFilter
          value={date}
          onChange={setDate}
          capturedAt={photos.map((photo) => photo.capturedAt)}
          markers={dateMarkers}
          // The panel is narrow: fewer years give the year lines and their labels room.
          maxYears={5}
          allDatesAction={false}
        />
      </div>
    </div>
  )
}
