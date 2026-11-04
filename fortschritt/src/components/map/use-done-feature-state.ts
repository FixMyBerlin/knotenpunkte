import { MAIN_MAP_ID } from '@shared/map/map-ids'
import { useEffect } from 'react'
import { useMap } from 'react-map-gl/maplibre'
import { EDGES_SOURCE_ID } from '@/components/map/map-layers'
import { pmtilesSourceLayer } from '@/config/app.const'

/**
 * Colours done edges via `feature-state` (`done: true`, ids from `promoteId: 'lfd_nr'`). The
 * state is set again whenever the source is (re)added, e.g. after a background change.
 */
export function useDoneFeatureState(doneIds: number[]) {
  const maps = useMap()
  const mainMap = maps[MAIN_MAP_ID]

  useEffect(
    function synchronizeDoneEdgesToMap() {
      const map = mainMap?.getMap()
      if (!map) return
      const target = { source: EDGES_SOURCE_ID, sourceLayer: pmtilesSourceLayer }
      function apply() {
        if (!map?.getSource(EDGES_SOURCE_ID)) return
        map.removeFeatureState(target)
        for (const id of doneIds) map.setFeatureState({ ...target, id }, { done: true })
      }
      function onSourceData(event: { sourceId?: string; sourceDataType?: string }) {
        if (event.sourceId === EDGES_SOURCE_ID && event.sourceDataType === 'metadata') apply()
      }
      apply()
      map.on('sourcedata', onSourceData)
      return function stopSynchronizingDoneEdges() {
        map.off('sourcedata', onSourceData)
      }
    },
    [mainMap, doneIds],
  )
}
