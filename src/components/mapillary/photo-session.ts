import {
  parseIsoDateStartMs,
  type NormalizedPhoto,
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

export function showSuggestion(suggestion: ViewSuggestion) {
  const best = suggestion.candidates[0]
  if (!best) return
  getViewpointSession().actions.showPhoto({
    photo: best.photo,
    directionKey: suggestion.direction.key,
  })
}

export function showPhoto(photo: NormalizedPhoto) {
  getViewpointSession().actions.showPhoto({ photo, directionKey: null })
}

/** Capture time from which a selected feature's first photo is picked, if it has one that recent. */
export const featurePhotosFromMs = parseIsoDateStartMs(mapillaryFromDate())
