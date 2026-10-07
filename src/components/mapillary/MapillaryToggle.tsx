import { cn } from '@/shared/cn'
import { photoColorModes, type PhotoColorMode } from '@/shared/mapillary/junction'

const modes = Object.keys(photoColorModes) as PhotoColorMode[]

export function MapillaryToggle({
  photosOn,
  onPhotosChange,
  photoColor,
  onPhotoColorChange,
}: {
  photosOn: boolean
  onPhotosChange: (on: boolean) => void
  photoColor: PhotoColorMode
  onPhotoColorChange: (mode: PhotoColorMode) => void
}) {
  return (
    <div className="max-w-64 rounded-lg bg-zinc-900/90 px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/10">
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
      </div>
      {photosOn ? (
        <>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-zinc-400">Farbe nach</span>
            {modes.map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={photoColor === mode}
                data-testid={`photo-color-${mode}`}
                className={cn(
                  'rounded px-1.5 py-0.5 ring-1 ring-white/20 hover:bg-white/10',
                  photoColor === mode && 'bg-white/15 font-medium',
                )}
                onClick={() => onPhotoColorChange(mode)}
              >
                {photoColorModes[mode].label}
              </button>
            ))}
          </div>
          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-zinc-300">
            {photoColorModes[photoColor].legend.map((item) => (
              <li key={item.label} className="flex items-center gap-1">
                <span
                  className="inline-block size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                {item.label}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
