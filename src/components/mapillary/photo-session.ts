import {
  parseIsoDateStartMs,
  type NormalizedPhoto,
  type PhotoCandidate,
  type ViewSuggestion,
} from '@osm-editor-kit/street-imagery'
import {
  getViewpointSession,
  useViewpoints,
  useViewSuggestions,
} from '@osm-editor-kit/street-imagery-react'
import { mapillaryMaxAgeYears } from '@/config/app.const'
import { mapillaryFromDate } from '@/shared/mapillary/junction'

/** Photos for the views into the current node, ranked per approaching street. */
export function useNodeViewSuggestions() {
  const viewpoints = useViewpoints()
  return useViewSuggestions(viewpoints, { maxAgeYears: mapillaryMaxAgeYears })
}

/** Shows a photo of the view: the given one (stepping through the view's photos), else the best. */
export function showSuggestion(suggestion: ViewSuggestion, candidate?: PhotoCandidate) {
  const pick = candidate ?? suggestion.candidates[0]
  if (!pick) return
  getViewpointSession().actions.showPhoto({
    photo: pick.photo,
    directionKey: suggestion.direction.key,
  })
}

export function showPhoto(photo: NormalizedPhoto) {
  getViewpointSession().actions.showPhoto({ photo, directionKey: null })
}

/** Capture time from which a selected feature's first photo is picked, if it has one that recent. */
export const featurePhotosFromMs = parseIsoDateStartMs(mapillaryFromDate())
