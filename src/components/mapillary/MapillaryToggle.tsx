export function MapillaryToggle({
  photosOn,
  onPhotosChange,
}: {
  photosOn: boolean
  onPhotosChange: (on: boolean) => void
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
    </div>
  )
}
