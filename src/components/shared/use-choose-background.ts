import { useNavigate } from '@tanstack/react-router'
import { useMapUiActions } from '@/components/shared/map-ui-store'
import { Route } from '@/routes/index'
import { isPrivateBackgroundId, writeBackgroundChoice } from '@/shared/map/private-raster'

/** Switches the map background: remembers the choice and puts it in the URL. */
export function useChooseBackground() {
  const navigate = useNavigate({ from: Route.fullPath })
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
