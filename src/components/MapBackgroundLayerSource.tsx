import type { EliLayer } from '@osm-editor-kit/maplibre-editor-layer-index/react'
import { useEffect, useState } from 'react'
import { Layer, Source, useMap } from 'react-map-gl/maplibre'
import {
  backgroundRasterLayerProps,
  backgroundRasterSourceSpec,
  hydrateBackgroundLayer,
} from '@/shared/map/background-layer'
import {
  BACKGROUND_LAYER_ID,
  BACKGROUND_SOURCE_ID,
  MAIN_MAP_ID,
  STREETS_LAYER_ID,
} from '@/shared/map/map-ids'

export function MapBackgroundLayerSource({
  backgroundLayerId,
}: {
  backgroundLayerId: string | null
}) {
  const [resolved, setResolved] = useState<{ id: string; layer: EliLayer } | null>(null)
  const maps = useMap()
  const map = maps[MAIN_MAP_ID]

  useEffect(
    function hydrateSelectedBackgroundLayer() {
      if (backgroundLayerId == null) return

      let cancelled = false
      void hydrateBackgroundLayer(backgroundLayerId).then((hydrated) => {
        if (cancelled || hydrated == null) return
        setResolved({ id: backgroundLayerId, layer: hydrated })
      })
      return () => {
        cancelled = true
      }
    },
    [backgroundLayerId],
  )

  const layer =
    backgroundLayerId != null && resolved?.id === backgroundLayerId ? resolved.layer : null

  useEffect(
    function keepBackgroundBelowStreets() {
      if (!map || layer == null) return
      const maplibreMap = map.getMap()

      function reorder() {
        const order = maplibreMap.getStyle()?.layers
        if (!order) return
        const backgroundIndex = order.findIndex((l) => l.id === BACKGROUND_LAYER_ID)
        const streetsIndex = order.findIndex((l) => l.id === STREETS_LAYER_ID)
        if (backgroundIndex === -1 || streetsIndex === -1) return
        if (backgroundIndex > streetsIndex) {
          maplibreMap.moveLayer(BACKGROUND_LAYER_ID, STREETS_LAYER_ID)
        }
      }

      reorder()
      maplibreMap.on('styledata', reorder)
      return () => {
        maplibreMap.off('styledata', reorder)
      }
    },
    [map, layer],
  )

  if (layer == null) return null

  return (
    <>
      <Source id={BACKGROUND_SOURCE_ID} {...backgroundRasterSourceSpec(layer)} />
      <Layer {...backgroundRasterLayerProps(layer)} beforeId={STREETS_LAYER_ID} />
    </>
  )
}
