import type { NormalizedPhoto, TargetImage, ViewSuggestion } from '@osm-editor-kit/street-imagery'
import {
  getViewpointSession,
  useViewpoints,
  useViewSuggestions,
} from '@osm-editor-kit/street-imagery-react'
import { mapillaryMaxAgeYears } from '@/config/app.const'

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

export function targetImageToPhoto(image: TargetImage): NormalizedPhoto {
  return {
    providerId: 'mapillary',
    photoId: image.id,
    sequenceId: null,
    capturedAt: image.capturedAt,
    isPano: image.isPano,
    heading: null,
    lngLat: image.lngLat,
    ...(image.originalLngLat ? { originalLngLat: image.originalLngLat } : {}),
  }
}
