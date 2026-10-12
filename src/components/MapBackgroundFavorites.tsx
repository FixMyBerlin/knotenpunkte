import { useHotkeys } from '@tanstack/react-hotkeys'
import { useBackgroundFavorites } from '@/components/shared/background-favorites-store'
import { Tooltip } from '@/components/shared/Tooltip/Tooltip'
import { useChooseBackground } from '@/components/shared/use-choose-background'
import { cn } from '@/shared/cn'
import { useTextEntryFocused } from '@/shared/dom/text-entry-focus'
import { backgroundShortName } from '@/shared/map/background-short-name'
import { backgroundFavoriteHotkeys } from '@/shared/ratings/hotkeys'

/** The starred backgrounds as buttons on the map, each with a key by its position. */
export function MapBackgroundFavorites({ activeId }: { activeId: string }) {
  const favorites = useBackgroundFavorites()
  const chooseBackground = useChooseBackground()
  const textEntryFocused = useTextEntryFocused()
  const withHotkey = favorites.slice(0, backgroundFavoriteHotkeys.length)

  useHotkeys(
    withHotkey.map((favorite, index) => ({
      hotkey: backgroundFavoriteHotkeys[index]!,
      callback: () => chooseBackground(favorite.id),
      options: { meta: { name: `Hintergrund ${favorite.name}` } },
    })),
    { enabled: !textEntryFocused, ignoreInputs: false },
  )

  if (favorites.length === 0) return null

  return (
    <div
      className="flex max-w-64 flex-wrap justify-end gap-1 rounded-lg bg-zinc-900/90 p-1.5 text-xs text-white shadow-lg ring-1 ring-white/10"
      data-testid="background-favorites"
    >
      {favorites.map((favorite, index) => {
        const hotkey = backgroundFavoriteHotkeys[index]
        return (
          <Tooltip key={favorite.id} text={favorite.name}>
            <button
              type="button"
              aria-pressed={favorite.id === activeId}
              data-testid={`background-favorite-${favorite.id}`}
              className={cn(
                'flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ring-1 ring-white/20 hover:bg-white/10',
                favorite.id === activeId && 'bg-sky-500/40 ring-sky-400 hover:bg-sky-500/40',
              )}
              onClick={() => chooseBackground(favorite.id)}
            >
              {backgroundShortName(favorite.id, favorite.name)}
              {hotkey ? (
                <kbd className="rounded bg-black/30 px-1 font-sans text-xs font-medium text-zinc-200">
                  {hotkey}
                </kbd>
              ) : null}
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
