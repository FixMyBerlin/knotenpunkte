import { useMapUiActions } from '@shared/components/map/map-ui-store'
import { isPrivateBackgroundId, writeBackgroundChoice } from '@shared/map/private-raster'
import { useNavigate } from '@tanstack/react-router'

/** Switches the map background: remembers the choice and puts it in the URL. */
export function useChooseBackground() {
  // Every app using the shared map has its map on `/`, with `bg` in the search.
  const navigate = useNavigate({ from: '/' })
  const { setBackgroundChoice } = useMapUiActions()

  return (choice: string) => {
    writeBackgroundChoice(choice)
    setBackgroundChoice(choice)
    void navigate({
      search: (previous) => ({
        ...previous,
        // The private URL often carries an API key, so only the stored choice refers to it.
        bg: isPrivateBackgroundId(choice) ? undefined : choice,
      }),
      replace: true,
    })
  }
}
