import {
  MAP_FEATURE_COLOR,
  viewpointFromPoint,
  viewpointsIntoNode,
  type Bbox,
  type LngLat,
} from '@osm-editor-kit/street-imagery'
import {
  getViewpointSession,
  queryStreetImageryFeatures,
  SelectedMapFeatureLayer,
  StreetLevelImagerySourcesAndLayers,
  useActiveDirectionKey,
  useCurrentHistoryEntry,
  useSelectedMapillaryFeature,
  useViewerBearing,
  useViewerHfov,
  useViewerLngLat,
  useViewpoints,
  viewDirectionKeyFromFeatures,
  ViewpointLayer,
} from '@osm-editor-kit/street-imagery-react'
import type { Geometry } from 'geojson'
import type { MapLayerMouseEvent } from 'maplibre-gl'
import { useEffect, useState } from 'react'
import { useMap } from 'react-map-gl/maplibre'
import { InactiveViewpointsLayer } from '@/components/mapillary/InactiveViewpointsLayer'
import {
  featurePhotosFromMs,
  showPhoto,
  showSuggestion,
  useNodeViewSuggestions,
} from '@/components/mapillary/photo-session'
import { useMapUiActions, useSelectedMapFeatureId } from '@/components/shared/map-ui-store'
import { MAIN_MAP_ID, STREETS_SOURCE_ID } from '@/shared/map/map-ids'
import { STREETS_SOURCE_LAYER } from '@/shared/map/streets'
import { approachLinesAt } from '@/shared/mapillary/approaches'
import {
  isJunctionFeature,
  mapillaryFromDate,
  mapillaryProviders,
  photoColorModes,
  type PhotoColorMode,
} from '@/shared/mapillary/junction'

const photoFilter = { date: { from: mapillaryFromDate() }, mapFeatureValue: isJunctionFeature }

/** Below this zoom the detected features of a whole district would cover the map. */
const MAP_FEATURES_MIN_ZOOM = 16
const photoProviders = mapillaryProviders.filter((id) => id === 'mapillary')

/** Viewpoints stand this far up each street, looking into the junction. */
const VIEWPOINT_DISTANCE_METERS = 20

function geometryLines(geometry: Geometry): LngLat[][] {
  if (geometry.type === 'LineString') return [geometry.coordinates as LngLat[]]
  if (geometry.type === 'MultiLineString') return geometry.coordinates as LngLat[][]
  return []
}

/**
 * The map's bounds, read again whenever the camera moved (`viewportKey`). The package's
 * `useMapViewportBbox` waits for the map's `load` event; when these layers mount later while
 * the map is busy loading tiles, that event never comes and no photos would load.
 */
function useViewportBbox(viewportKey: string): Bbox | null {
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

type Props = {
  node: { id: string; lngLat: LngLat } | null
  zoom: number
  /** Changes when the camera moves, so the photo bbox follows. */
  viewportKey: string
  streetsOn: boolean
  photoColor: PhotoColorMode
}

/** Mapillary photos, detected junction features and the views into the current node. */
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
  const selectedFeatureId = useSelectedMapFeatureId()
  const selectedFeature = useSelectedMapillaryFeature({
    featureId: selectedFeatureId,
    shownPhotoId: selectedPhoto?.photoId,
    minCapturedAt: featurePhotosFromMs,
  })
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
  const providers = zoom >= MAP_FEATURES_MIN_ZOOM ? mapillaryProviders : photoProviders
  const { setSelectedMapFeatureId, setViewpointsNodeId } = useMapUiActions()

  const nodeId = node?.id
  const nodeLng = node?.lngLat[0]
  const nodeLat = node?.lngLat[1]
  useEffect(
    function openViewpointsForNode() {
      const map = mapRef?.getMap()
      const { actions } = getViewpointSession()
      actions.reset()
      setSelectedMapFeatureId(null)
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

      // The streets around a node that is not in view yet load after the map moved there.
      if (map.loaded() && !map.isMoving() && map.getBounds().contains(target)) {
        open()
        return
      }
      void map.once('idle', open)
      return () => {
        map.off('idle', open)
      }
    },
    [mapRef, nodeId, nodeLng, nodeLat, streetsOn, setSelectedMapFeatureId, setViewpointsNodeId],
  )

  return (
    <>
      <StreetLevelImagerySourcesAndLayers
        providers={providers}
        bbox={bbox}
        zoom={zoom}
        filter={photoFilter}
        options={{
          photoCircleColor: photoColorModes[photoColor].expression,
          mapFeatureCircleColor: MAP_FEATURE_COLOR,
          selectedPhoto,
          selectedSequenceId: selectedPhoto?.sequenceId ?? null,
          viewerPov: { bearing, hfov, lngLat },
          showSequences: true,
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
      <SelectedMapFeatureLayer
        data={selectedFeature.data}
        shownImage={selectedFeature.shownImage}
        providers={providers}
        bbox={bbox}
        zoom={zoom}
      />
    </>
  )
}

/**
 * Handles a map click on a suggested view, a detected feature or a photo. Returns whether the
 * click hit one of them.
 */
export function useMapillaryMapClick() {
  const { suggestions } = useNodeViewSuggestions()
  const { setSelectedMapFeatureId } = useMapUiActions()

  return (event: MapLayerMouseEvent) => {
    const directionKey = viewDirectionKeyFromFeatures(event.features)
    const suggestion = suggestions.find((item) => item.direction.key === directionKey)
    if (suggestion) {
      setSelectedMapFeatureId(null)
      showSuggestion(suggestion)
      return true
    }

    const hits = queryStreetImageryFeatures(event)
    const mapFeature = hits.find((hit) => hit.kind === 'mapFeature')
    if (mapFeature?.featureId) {
      setSelectedMapFeatureId(mapFeature.featureId)
      return true
    }

    const photo = hits.find((hit) => hit.kind === 'photo')
    if (photo?.photoId) {
      setSelectedMapFeatureId(null)
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
