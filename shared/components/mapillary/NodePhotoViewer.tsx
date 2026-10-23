import { EyeDropperIcon, XMarkIcon } from '@heroicons/react/16/solid'
import {
  PLACE_TARGET,
  providerExternalLink,
  type LngLat,
  type NormalizedPhoto,
} from '@osm-editor-kit/street-imagery'
import {
  FloatingPhotoViewer,
  getViewpointSession,
  PhotoDate,
  StreetLevelImageryViewer,
  useActiveDirectionKey,
  useCanGoBack,
  useCanGoForward,
  useCurrentHistoryEntry,
  useViewpoints,
} from '@osm-editor-kit/street-imagery-react'
import { cn } from '@shared/cn'
import { useViewpointsNodeId } from '@shared/components/map/map-ui-store'
import {
  showPhoto,
  showSuggestion,
  useNodeViewSuggestions,
} from '@shared/components/mapillary/photo-session'
import { Tooltip } from '@shared/components/Tooltip/Tooltip'
import { useEffect, useRef, useState } from 'react'

const separator = (
  <span aria-hidden className="px-1.5 text-slate-300">
    ·
  </span>
)

/** Photos assigned to the node, with the pipette to add the shown one. */
type PhotoAssignment = {
  photoIds: string[]
  onAssign: (photoId: string) => void
  onRemove: (photoId: string) => void
}

type Props = {
  node: { id: string; lngLat: LngLat }
  /** Without it the viewer only shows photos. */
  assignment?: PhotoAssignment
}

/**
 * Photo viewer floating over the map. It opens the best recent photo that looks into the node and
 * offers one view per approaching street. With an `assignment` the shown photo can be assigned
 * to the node; assigned photos are listed above the photo.
 */
export function NodePhotoViewer({ node, assignment }: Props) {
  const viewpoints = useViewpoints()
  const viewpointsNodeId = useViewpointsNodeId()
  const { suggestions, isLoading, isError } = useNodeViewSuggestions()
  const activeDirectionKey = useActiveDirectionKey()
  const entry = useCurrentHistoryEntry()
  const canGoBack = useCanGoBack()
  const canGoForward = useCanGoForward()
  const [viewerPhoto, setViewerPhoto] = useState<NormalizedPhoto | null>(null)
  const [closedNodeId, setClosedNodeId] = useState<string | null>(null)

  const photo = entry?.photo ?? null
  const assignedIds = assignment?.photoIds ?? []
  const viewsReady = viewpointsNodeId === node.id && viewpoints.length > 0 && !isLoading

  const autoOpenedRef = useRef<string | null>(null)
  useEffect(
    function openBestViewIntoNode() {
      if (!viewsReady || autoOpenedRef.current === node.id) return
      autoOpenedRef.current = node.id
      // The rater was faster and already opened a photo.
      if (getViewpointSession().current) return
      const best = suggestions.find((suggestion) => suggestion.candidates.length > 0)
      if (best) showSuggestion(best)
    },
    [node.id, suggestions, viewsReady],
  )

  if (closedNodeId === node.id && !photo) return null

  // A suggested view turns to the node.
  const lookAt = entry?.directionKey ? { lngLat: node.lngLat, shape: PLACE_TARGET } : null
  const lookAtBearing =
    suggestions.find((suggestion) => suggestion.direction.key === entry?.directionKey)?.direction
      .bearing ?? null

  const found = suggestions.some((suggestion) => suggestion.candidates.length > 0)
  const status = (() => {
    if (photo) return null
    if (isError) return 'Die Fotos konnten nicht geladen werden.'
    if (!viewsReady) return 'Suche Fotos …'
    return found ? null : 'Keine Fotos im gewählten Zeitraum an diesem Knoten.'
  })()

  const shown = photo && viewerPhoto?.photoId === photo.photoId ? viewerPhoto : photo
  const { actions } = getViewpointSession()
  const shownAssigned = photo ? assignedIds.includes(photo.photoId) : false

  return (
    <FloatingPhotoViewer
      storageKey="knotenpunkte-photo-viewer"
      title="Fotos am Knoten"
      suggestions={suggestions}
      activeDirectionKey={activeDirectionKey}
      shownPhotoId={photo?.photoId}
      onSelectSuggestion={showSuggestion}
      canGoBack={canGoBack}
      canGoForward={canGoForward}
      onBack={actions.back}
      onForward={actions.forward}
      onClose={() => {
        // Keep the suggested views on the map; only the history (the shown photo) goes.
        actions.reset()
        actions.open({ viewpoints })
        setClosedNodeId(node.id)
      }}
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
      {photo || assignedIds.length > 0 ? (
        <div className="px-2">
          {assignment ? (
            <div
              className="flex flex-wrap items-center gap-1 pb-1.5 text-[11px] text-slate-700"
              data-testid="assigned-photos"
            >
              <Tooltip
                text={
                  shownAssigned
                    ? 'Dieses Foto ist dem Knoten zugeordnet'
                    : 'Dieses Foto dem Knoten zuordnen'
                }
              >
                <button
                  type="button"
                  data-testid="assign-photo"
                  aria-label="Dieses Foto dem Knoten zuordnen"
                  disabled={!photo || shownAssigned}
                  className="rounded p-1 text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent"
                  onClick={() => {
                    if (photo) assignment.onAssign(photo.photoId)
                  }}
                >
                  <EyeDropperIcon className="size-3.5" aria-hidden />
                </button>
              </Tooltip>
              {assignedIds.length === 0 ? (
                <span className="text-slate-400">Noch kein Foto zugeordnet</span>
              ) : null}
              {assignedIds.map((photoId, index) => {
                const active = photo?.photoId === photoId
                return (
                  <span
                    key={photoId}
                    className={cn(
                      'flex items-center rounded ring-1 ring-slate-300',
                      active && 'bg-slate-800 text-white ring-slate-800',
                    )}
                  >
                    <Tooltip text={`Zugeordnetes Foto ${photoId} anzeigen`}>
                      <button
                        type="button"
                        aria-pressed={active}
                        data-testid={`assigned-photo-${photoId}`}
                        className={cn(
                          'rounded-l py-0.5 pr-1 pl-1.5 font-medium',
                          active ? 'hover:bg-slate-700' : 'hover:bg-slate-100',
                        )}
                        onClick={() =>
                          // The viewer loads date, type, creator and the real position.
                          showPhoto({
                            providerId: 'mapillary',
                            photoId,
                            sequenceId: null,
                            capturedAt: null,
                            isPano: null,
                            heading: null,
                            lngLat: node.lngLat,
                          })
                        }
                      >
                        Foto {index + 1}
                      </button>
                    </Tooltip>
                    <Tooltip text="Zuordnung entfernen">
                      <button
                        type="button"
                        aria-label={`Zuordnung von Foto ${index + 1} entfernen`}
                        data-testid={`unassign-photo-${photoId}`}
                        className={cn(
                          'rounded-r p-0.5',
                          active ? 'hover:bg-slate-700' : 'hover:bg-slate-100',
                        )}
                        onClick={() => assignment.onRemove(photoId)}
                      >
                        <XMarkIcon className="size-3.5" aria-hidden />
                      </button>
                    </Tooltip>
                  </span>
                )
              })}
            </div>
          ) : null}
          {photo ? (
            <StreetLevelImageryViewer
              photo={photo}
              groupPhotos={[photo]}
              hideAttribution
              lookAt={lookAt}
              lookAtBearing={lookAtBearing}
              onEaseMapToPoint={() => {}}
              onPhotoSelected={() => {}}
              onViewerPhoto={(loaded) => {
                setViewerPhoto(loaded)
                showPhoto(loaded)
              }}
            />
          ) : null}
        </div>
      ) : null}
    </FloatingPhotoViewer>
  )
}
