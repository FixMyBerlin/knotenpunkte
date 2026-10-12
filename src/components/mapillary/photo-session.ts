import {
  photoFilter,
  type NormalizedPhoto,
  type PhotoCandidate,
  type ViewSuggestion,
} from '@osm-editor-kit/street-imagery'
import {
  getViewpointSession,
  useViewpoints,
  useViewSuggestions,
} from '@osm-editor-kit/street-imagery-react'
import { usePhotoDateFilter, usePhotoTypeFilter } from '@/components/mapillary/photo-filter-store'

/** Photos for the views into the current node, ranked per approaching street. */
export function useNodeViewSuggestions() {
  const viewpoints = useViewpoints()
  const date = usePhotoDateFilter()
  const photoType = usePhotoTypeFilter()
  return useViewSuggestions(viewpoints, {
    photoTypes: photoType ? [photoType] : undefined,
    filterPhoto: photoFilter(undefined, date),
  })
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
