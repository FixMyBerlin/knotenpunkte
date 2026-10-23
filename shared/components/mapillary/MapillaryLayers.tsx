import {
  MAP_FEATURE_COLOR,
  viewpointFromPoint,
  viewpointsIntoNode,
  type LngLat,
} from '@osm-editor-kit/street-imagery'
import {
  getViewpointSession,
  queryStreetImageryFeatures,
  StreetLevelImagerySourcesAndLayers,
  useActiveDirectionKey,
  useCurrentHistoryEntry,
  useViewerBearing,
  useViewerHfov,
  useViewerLngLat,
  useViewpoints,
  viewDirectionKeyFromFeatures,
  ViewpointLayer,
} from '@osm-editor-kit/street-imagery-react'
import { useMapUiActions } from '@shared/components/map/map-ui-store'
import { InactiveViewpointsLayer } from '@shared/components/mapillary/InactiveViewpointsLayer'
import {
  usePhotoDateFilter,
  usePhotoTypeFilter,
} from '@shared/components/mapillary/photo-filter-store'
import {
  showPhoto,
  showSuggestion,
  useNodeViewSuggestions,
} from '@shared/components/mapillary/photo-session'
import { useViewportBbox } from '@shared/components/mapillary/use-viewport-bbox'
import { MAIN_MAP_ID, STREETS_SOURCE_ID } from '@shared/map/map-ids'
import { STREETS_SOURCE_LAYER } from '@shared/map/streets'
import { approachLinesAt } from '@shared/mapillary/approaches'
import { mapillaryProviders, photoStyle, type PhotoColorMode } from '@shared/mapillary/photo-style'
import type { Geometry } from 'geojson'
import type { MapLayerMouseEvent } from 'maplibre-gl'
import { useEffect } from 'react'
import { useMap } from 'react-map-gl/maplibre'

/** Viewpoints stand this far up each street, looking into the junction. */
const VIEWPOINT_DISTANCE_METERS = 20

function geometryLines(geometry: Geometry): LngLat[][] {
  if (geometry.type === 'LineString') return [geometry.coordinates as LngLat[]]
  if (geometry.type === 'MultiLineString') return geometry.coordinates as LngLat[][]
  return []
}

type Props = {
  node: { id: string; lngLat: LngLat } | null
  zoom: number
  /** Changes when the camera moves, so the photo bbox follows. */
  viewportKey: string
  streetsOn: boolean
  photoColor: PhotoColorMode
}

/** Mapillary photos and the views into the current node. */
export function MapillaryLayers({ node, zoom, viewportKey, streetsOn, photoColor }: Props) {
  const { [MAIN_MAP_ID]: mapRef } = useMap()
  const bbox = useViewportBbox(viewportKey)
  const viewpoints = useViewpoints()
  const { suggestions, isLoading } = useNodeViewSuggestions()
  const activeDirectionKey = useActiveDirectionKey()
  const selectedPhoto = useCurrentHistoryEntry()?.photo ?? null
  const bearing = useViewerBearing()
  const hfov = useViewerHfov()
  const lngLat = useViewerLngLat()
  const date = usePhotoDateFilter()
  const photoType = usePhotoTypeFilter()
  // Views without a recent photo open nothing; they get their own grey, non-clickable layer.
  const withPhoto = suggestions.filter((suggestion) => suggestion.candidates.length > 0)
  const withoutPhoto = isLoading
    ? []
    : suggestions.filter((suggestion) => suggestion.candidates.length === 0)
  const withoutPhotoIds = new Set(
    withoutPhoto
      .map((suggestion) => suggestion.viewpoint.id)
      .filter((id) => !withPhoto.some((suggestion) => suggestion.viewpoint.id === id)),
  )
  const { setViewpointsNodeId } = useMapUiActions()

  const nodeId = node?.id
  const nodeLng = node?.lngLat[0]
  const nodeLat = node?.lngLat[1]
  useEffect(
    function openViewpointsForNode() {
      const map = mapRef?.getMap()
      const { actions } = getViewpointSession()
      actions.reset()
      setViewpointsNodeId(null)
      if (!map || nodeId === undefined || nodeLng === undefined || nodeLat === undefined) return
      const target: LngLat = [nodeLng, nodeLat]

      const open = () => {
        const lines =
          streetsOn && map.getSource(STREETS_SOURCE_ID)
            ? map
                .querySourceFeatures(STREETS_SOURCE_ID, { sourceLayer: STREETS_SOURCE_LAYER })
                .flatMap((feature) => geometryLines(feature.geometry))
            : []
        const approaches = approachLinesAt(target, lines)
        actions.open({
          viewpoints:
            approaches.length > 0
              ? viewpointsIntoNode(target, approaches, {
                  distanceMeters: VIEWPOINT_DISTANCE_METERS,
                })
              : [viewpointFromPoint(target)],
        })
        setViewpointsNodeId(nodeId)
      }

      // Leaving the node (or switching the photos off) ends its photo session, so the viewer
      // does not take the old photo for one the rater opened at the next node.
      const endSession = () => {
        actions.reset()
        setViewpointsNodeId(null)
      }

      // The streets around a node that is not in view yet load after the map moved there.
      if (map.loaded() && !map.isMoving() && map.getBounds().contains(target)) {
        open()
        return endSession
      }
      void map.once('idle', open)
      return () => {
        map.off('idle', open)
        endSession()
      }
    },
    [mapRef, nodeId, nodeLng, nodeLat, streetsOn, setViewpointsNodeId],
  )

  return (
    <>
      <StreetLevelImagerySourcesAndLayers
        providers={mapillaryProviders}
        bbox={bbox}
        zoom={zoom}
        filter={{ date, photoTypes: photoType ? [photoType] : undefined }}
        options={{
          photoCircleColor: photoStyle(photoColor, date).expression,
          mapFeatureCircleColor: MAP_FEATURE_COLOR,
          // A photo is shown at every node, and the package fades all other sequences while one
          // is active. Without the sequence the lines keep their full strength.
          selectedPhoto: selectedPhoto ? { ...selectedPhoto, sequenceId: null } : null,
          selectedSequenceId: null,
          viewerPov: { bearing, hfov, lngLat },
          showSelectionHighlight: true,
          showViewCone: true,
        }}
      />
      <InactiveViewpointsLayer suggestions={withoutPhoto} zoom={zoom} />
      <ViewpointLayer
        viewpoints={viewpoints.filter((viewpoint) => !withoutPhotoIds.has(viewpoint.id))}
        suggestions={withPhoto}
        activeDirectionKey={activeDirectionKey}
        zoom={zoom}
      />
    </>
  )
}

/**
 * Handles a map click on a suggested view or a photo. Returns whether the click hit one of them.
 */
export function useMapillaryMapClick() {
  const { suggestions } = useNodeViewSuggestions()
  return (event: MapLayerMouseEvent) => {
    const directionKey = viewDirectionKeyFromFeatures(event.features)
    const suggestion = suggestions.find((item) => item.direction.key === directionKey)
    if (suggestion) {
      showSuggestion(suggestion)
      return true
    }

    const photo = queryStreetImageryFeatures(event).find((hit) => hit.kind === 'photo')
    if (photo?.photoId) {
      // The viewer loads date, type and creator of the photo.
      showPhoto({
        providerId: 'mapillary',
        photoId: photo.photoId,
        sequenceId: photo.sequenceId ?? null,
        capturedAt: null,
        isPano: null,
        heading: null,
        lngLat: [event.lngLat.lng, event.lngLat.lat],
      })
      return true
    }
    return false
  }
}
