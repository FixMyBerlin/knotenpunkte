import {
  bestTargetImage,
  mapillaryValueName,
  parseIsoDateStartMs,
  PLACE_TARGET,
  providerExternalLink,
  type LngLat,
  type NormalizedPhoto,
} from '@osm-editor-kit/street-imagery'
import {
  FloatingPhotoViewer,
  getViewpointSession,
  MapillaryFeatureBar,
  PhotoDate,
  StreetLevelImageryViewer,
  useActiveDirectionKey,
  useCanGoBack,
  useCanGoForward,
  useCurrentHistoryEntry,
  useMapillaryImageDetections,
  useMapillaryMapFeatureImages,
  useViewpoints,
} from '@osm-editor-kit/street-imagery-react'
import { useEffect, useRef, useState } from 'react'
import {
  showPhoto,
  showSuggestion,
  targetImageToPhoto,
  useNodeViewSuggestions,
} from '@/components/mapillary/photo-session'
import {
  useMapUiActions,
  useSelectedMapFeatureId,
  useViewpointsNodeId,
} from '@/components/shared/map-ui-store'
import { mapillaryMaxAgeYears } from '@/config/app.const'
import { isJunctionDetection, mapillaryFromDate } from '@/shared/mapillary/junction'

const BIKE_LANE_COLOR = 0x22d3ee

const separator = (
  <span aria-hidden className="px-1.5 text-slate-300">
    ·
  </span>
)

type Props = {
  node: { id: string; lngLat: LngLat }
}

/**
 * Photo viewer floating over the map. It opens the best recent photo that looks into the node,
 * offers one view per approaching street, and shows a selected detected feature in its photos.
 */
export function NodePhotoViewer({ node }: Props) {
  const viewpoints = useViewpoints()
  const viewpointsNodeId = useViewpointsNodeId()
  const { suggestions, isLoading, isError } = useNodeViewSuggestions()
  const activeDirectionKey = useActiveDirectionKey()
  const entry = useCurrentHistoryEntry()
  const canGoBack = useCanGoBack()
  const canGoForward = useCanGoForward()
  const featureId = useSelectedMapFeatureId()
  const { setSelectedMapFeatureId } = useMapUiActions()
  const feature = useMapillaryMapFeatureImages(featureId)
  const featureData = feature.data ?? null
  const [viewerPhoto, setViewerPhoto] = useState<NormalizedPhoto | null>(null)
  const [closedNodeId, setClosedNodeId] = useState<string | null>(null)
  const [showOutlines, setShowOutlines] = useState(false)

  const photo = entry?.photo ?? null
  const viewsReady = viewpointsNodeId === node.id && viewpoints.length > 0 && !isLoading

  const autoOpenedRef = useRef<string | null>(null)
  useEffect(
    function openBestViewIntoNode() {
      if (!viewsReady || autoOpenedRef.current === node.id) return
      autoOpenedRef.current = node.id
      const best = suggestions.find((suggestion) => suggestion.candidates.length > 0)
      if (best) showSuggestion(best)
    },
    [node.id, suggestions, viewsReady],
  )

  const shownImage = featureData?.images.find((image) => image.id === photo?.photoId) ?? null
  const featureOpenedRef = useRef<string | null>(null)
  useEffect(
    function openBestPhotoOfFeature() {
      if (!featureId) {
        featureOpenedRef.current = null
        return
      }
      if (!featureData || featureOpenedRef.current === featureId) return
      featureOpenedRef.current = featureId
      const first = bestTargetImage(featureData.images, featureData.feature.lngLat, {
        minCapturedAt: parseIsoDateStartMs(mapillaryFromDate()) ?? undefined,
      })
      if (first) showPhoto(targetImageToPhoto(first))
    },
    [featureData, featureId],
  )

  const detections = useMapillaryImageDetections(showOutlines ? photo?.photoId : null, {
    filter: isJunctionDetection,
    filterKey: 'junction',
  })

  if (closedNodeId === node.id && !photo && !featureId) return null

  // A photo of the selected feature turns to the feature; a suggested view turns to the node.
  const lookAt =
    featureData && shownImage
      ? {
          lngLat: featureData.feature.lngLat,
          outline: shownImage.outline,
          value: featureData.feature.value,
          label: mapillaryValueName(featureData.feature.value, 'de'),
        }
      : entry?.directionKey
        ? { lngLat: node.lngLat, shape: PLACE_TARGET }
        : null
  const lookAtBearing =
    suggestions.find((suggestion) => suggestion.direction.key === entry?.directionKey)?.direction
      .bearing ?? null
  const outlines = showOutlines
    ? (detections.data ?? []).map((detection) => ({
        id: detection.id,
        outline: detection.outline,
        ...(detection.value.startsWith('construction--flat--bike-lane')
          ? { color: BIKE_LANE_COLOR }
          : {}),
      }))
    : undefined

  const found = suggestions.some((suggestion) => suggestion.candidates.length > 0)
  const status = (() => {
    if (featureId) {
      if (feature.isLoading) return 'Lade Fotos des Objekts …'
      return feature.isError ? 'Das Objekt konnte nicht geladen werden.' : null
    }
    if (photo) return null
    if (isError) return 'Die Fotos konnten nicht geladen werden.'
    if (!viewsReady) return 'Suche Fotos …'
    return found ? null : `Keine Fotos der letzten ${mapillaryMaxAgeYears} Jahre an diesem Knoten.`
  })()

  const shown = photo && viewerPhoto?.photoId === photo.photoId ? viewerPhoto : photo
  const { actions } = getViewpointSession()
  // Stepping to a photo that does not show the selected feature ends the feature view.
  const step = (stepInHistory: typeof actions.back) => () => {
    const next = stepInHistory()
    if (next && !featureData?.images.some((image) => image.id === next.photo.photoId)) {
      setSelectedMapFeatureId(null)
    }
  }

  return (
    <FloatingPhotoViewer
      storageKey="knotenpunkte-photo-viewer"
      title={featureData ? 'Erkanntes Objekt' : 'Fotos am Knoten'}
      suggestions={suggestions}
      activeDirectionKey={activeDirectionKey}
      onSelectSuggestion={(suggestion) => {
        setSelectedMapFeatureId(null)
        showSuggestion(suggestion)
      }}
      canGoBack={canGoBack}
      canGoForward={canGoForward}
      onBack={step(actions.back)}
      onForward={step(actions.forward)}
      onClose={() => {
        // Keep the suggested views on the map; only the history (the shown photo) goes.
        actions.reset()
        actions.open({ viewpoints })
        setSelectedMapFeatureId(null)
        setClosedNodeId(node.id)
      }}
      toolbar={
        featureData ? (
          <MapillaryFeatureBar
            data={featureData}
            shownImage={shownImage}
            onShow={(image) => showPhoto(targetImageToPhoto(image))}
          />
        ) : undefined
      }
      status={status}
      footer={
        shown ? (
          <div className="flex items-center gap-3 text-[11px]">
            <p className="min-w-0 flex-1 truncate">
              <PhotoDate timestamp={shown.capturedAt} />
              {shown.isPano !== null ? (
                <>
                  {separator}
                  {shown.isPano ? '360°' : 'Foto'}
                </>
              ) : null}
              {shown.creatorName ? (
                <>
                  {separator}
                  {shown.creatorName}
                </>
              ) : null}
              {separator}
              CC BY-SA 4.0
            </p>
            <label className="flex shrink-0 items-center gap-1">
              <input
                type="checkbox"
                checked={showOutlines}
                data-testid="photo-outlines-toggle"
                onChange={(event) => setShowOutlines(event.currentTarget.checked)}
              />
              Markierungen
              {showOutlines && detections.data ? ` (${detections.data.length})` : null}
            </label>
            <a
              className="shrink-0 text-slate-800 underline-offset-2 hover:underline"
              href={providerExternalLink(shown)}
              rel="noreferrer"
              target="_blank"
            >
              Mapillary
            </a>
          </div>
        ) : undefined
      }
    >
      {photo ? (
        <div className="px-2">
          <StreetLevelImageryViewer
            photo={photo}
            groupPhotos={[photo]}
            hideAttribution
            lookAt={lookAt}
            lookAtBearing={lookAtBearing}
            outlines={outlines}
            onEaseMapToPoint={() => {}}
            onPhotoSelected={() => {}}
            onViewerPhoto={(loaded) => {
              setViewerPhoto(loaded)
              showPhoto(loaded)
            }}
          />
        </div>
      ) : null}
    </FloatingPhotoViewer>
  )
}
