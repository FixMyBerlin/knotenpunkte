import { ArrowUpIcon } from '@heroicons/react/20/solid'
import { useMapBearing, useMapPitch } from '@shared/components/map/map-ui-store'
import { Tooltip } from '@shared/components/Tooltip/Tooltip'
import { Button } from '@shared/components/ui/button'
import { MAIN_MAP_ID } from '@shared/map/map-ids'
import { useMap } from 'react-map-gl/maplibre'

const epsilon = 0.5

/**
 * Compass reset button, visible only while the map is rotated or pitched
 * (mirrors street-space-editor's rotate-only visibility, plus TILDA Geo's pitch
 * reset via `resetNorthPitch`). Never mounts when the map is already north-up
 * and flat, so it doesn't take up space in the top-right control stack.
 */
export function MapResetNorthPitchButton() {
  const bearing = useMapBearing()
  const pitch = useMapPitch()
  const maps = useMap()

  const visible = Math.abs(bearing) > epsilon || pitch > epsilon
  if (!visible) return null

  return (
    <Tooltip text="Nach Norden / flach">
      <Button
        plain
        type="button"
        aria-label="Nach Norden / flach"
        className="bg-zinc-900/90! text-white! shadow-lg ring-1 ring-white/10 hover:bg-zinc-800! data-active:bg-zinc-800! data-hover:bg-zinc-800!"
        onClick={() => {
          maps[MAIN_MAP_ID]?.getMap().resetNorthPitch({ duration: 500 })
        }}
      >
        <ArrowUpIcon data-slot="icon" style={{ transform: `rotate(${-bearing}deg)` }} aria-hidden />
      </Button>
    </Tooltip>
  )
}
