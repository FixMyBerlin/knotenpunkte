import {
  MAP_FEATURE_COLOR,
  photoTypeColorExpression,
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
  useMapillaryMapFeatureImages,
  useMapViewportBbox,
  useViewerBearing,
  useViewerHfov,
  useViewerLngLat,
  useViewpoints,
  viewDirectionKeyFromFeatures,
  ViewpointLayer,
} from '@osm-editor-kit/street-imagery-react'
import type { Geometry } from 'geojson'
import type { MapLayerMouseEvent } from 'maplibre-gl'
import { useEffect } from 'react'
import { Layer, Source, useMap } from 'react-map-gl/maplibre'
import {
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

type Props = {
  node: { id: string; lngLat: LngLat } | null
  zoom: number
  /** Changes when the camera moves, so the photo bbox follows. */
  viewportKey: string
  streetsOn: boolean
}

/** Mapillary photos, detected junction features and the views into the current node. */
export function MapillaryLayers({ node, zoom, viewportKey, streetsOn }: Props) {
  const { [MAIN_MAP_ID]: mapRef } = useMap()
  const bbox = useMapViewportBbox(MAIN_MAP_ID, viewportKey)
  const viewpoints = useViewpoints()
  const { suggestions } = useNodeViewSuggestions()
  const activeDirectionKey = useActiveDirectionKey()
  const selectedPhoto = useCurrentHistoryEntry()?.photo ?? null
  const bearing = useViewerBearing()
  const hfov = useViewerHfov()
  const lngLat = useViewerLngLat()
  const selectedFeatureId = useSelectedMapFeatureId()
  const selectedFeature = useMapillaryMapFeatureImages(selectedFeatureId).data?.feature
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
        providers={zoom >= MAP_FEATURES_MIN_ZOOM ? mapillaryProviders : photoProviders}
        bbox={bbox}
        zoom={zoom}
        filter={photoFilter}
        options={{
          photoCircleColor: photoTypeColorExpression,
          mapFeatureCircleColor: MAP_FEATURE_COLOR,
          selectedPhoto,
          selectedSequenceId: selectedPhoto?.sequenceId ?? null,
          viewerPov: { bearing, hfov, lngLat },
          showSequences: true,
          showSelectionHighlight: true,
          showViewCone: true,
        }}
      />
      <ViewpointLayer
        viewpoints={viewpoints}
        suggestions={suggestions}
        activeDirectionKey={activeDirectionKey}
        zoom={zoom}
      />
      {selectedFeature ? (
        <Source
          id="mapillary-selected-feature"
          type="geojson"
          data={{ type: 'Point', coordinates: selectedFeature.lngLat }}
        >
          <Layer
            id="mapillary-selected-feature-ring"
            type="circle"
            paint={{
              'circle-radius': 11,
              'circle-color': 'transparent',
              'circle-stroke-color': '#facc15',
              'circle-stroke-width': 3,
            }}
          />
        </Source>
      ) : null}
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
