import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** A background the user starred. `id` is the background choice: `positron`, `private` or an ELI id. */
type BackgroundFavorite = { id: string; name: string }

interface BackgroundFavoritesStore {
  favorites: BackgroundFavorite[]
  toggleFavorite: (favorite: BackgroundFavorite) => void
  removeFavorite: (id: string) => void
}

const useBackgroundFavoritesStore = create<BackgroundFavoritesStore>()(
  persist(
    (set) => ({
      favorites: [],
      toggleFavorite: (favorite) =>
        set((state) => ({
          favorites: state.favorites.some((item) => item.id === favorite.id)
            ? state.favorites.filter((item) => item.id !== favorite.id)
            : [...state.favorites, favorite],
        })),
      removeFavorite: (id) =>
        set((state) => ({ favorites: state.favorites.filter((item) => item.id !== id) })),
    }),
    { name: 'knotenpunkte-background-favorites' },
  ),
)

export const useBackgroundFavorites = () => useBackgroundFavoritesStore((state) => state.favorites)
export const useRemoveBackgroundFavorite = () =>
  useBackgroundFavoritesStore((state) => state.removeFavorite)
export const useToggleBackgroundFavorite = () =>
  useBackgroundFavoritesStore((state) => state.toggleFavorite)
