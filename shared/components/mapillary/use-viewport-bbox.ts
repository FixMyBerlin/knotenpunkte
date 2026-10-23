import type { Bbox } from '@osm-editor-kit/street-imagery'
import { MAIN_MAP_ID } from '@shared/map/map-ids'
import { useEffect, useState } from 'react'
import { useMap } from 'react-map-gl/maplibre'

/**
 * The map's bounds, read again whenever the camera moved (`viewportKey`). The package's
 * `useMapViewportBbox` waits for the map's `load` event; when these layers mount later while
 * the map is busy loading tiles, that event never comes and no photos would load.
 */
export function useViewportBbox(viewportKey: string): Bbox | null {
  const { [MAIN_MAP_ID]: mapRef } = useMap()
  const [bbox, setBbox] = useState<Bbox | null>(null)
  useEffect(
    function readBoundsAfterCameraMove() {
      const bounds = mapRef?.getMap().getBounds()
      if (!bounds) return
      setBbox([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()])
    },
    [mapRef, viewportKey],
  )
  return bbox
}
