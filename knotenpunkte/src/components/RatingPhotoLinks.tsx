import type { LngLat } from '@osm-editor-kit/street-imagery'
import { Infra3dLink } from '@shared/components/mapillary/Infra3dLink'
import { NodePhotoViewer } from '@shared/components/mapillary/NodePhotoViewer'
import { addToList, removeFromList, splitList } from '@shared/list-field'
import { useRatingDraft } from '@/components/shared/use-rating-draft'
import type { RatingSource } from '@/shared/ratings/schema'

const mapillarySource: RatingSource = 'Mapillary'
const infra3dSource: RatingSource = 'infra3D'

type Node = { id: string; lngLat: LngLat }

/** The photo viewer at the rated node: assigned photos go to `Mapillary-ID` and the source. */
export function RatingPhotoViewer({ node }: { node: Node }) {
  const { draft, setDraft } = useRatingDraft(node.id)
  return (
    <NodePhotoViewer
      node={node}
      assignment={{
        photoIds: splitList(draft['Mapillary-ID']),
        onAssign: (photoId) =>
          setDraft({
            ...draft,
            'Mapillary-ID': addToList(draft['Mapillary-ID'], photoId),
            Quelle: addToList(draft.Quelle, mapillarySource),
          }),
        onRemove: (photoId) =>
          setDraft({ ...draft, 'Mapillary-ID': removeFromList(draft['Mapillary-ID'], photoId) }),
      }}
    />
  )
}

/** infra3D at the rated node; opening it marks infra3D as a source of the rating. */
export function RatingInfra3dLink({ node }: { node: Node }) {
  const { draft, setDraft } = useRatingDraft(node.id)
  return (
    <Infra3dLink
      node={node}
      tooltip="Straßenfotos am Knotenpunkt öffnen (Zugang nur mit Account) und infra3D als Quelle setzen"
      onOpen={() => setDraft({ ...draft, Quelle: addToList(draft.Quelle, infra3dSource) })}
    />
  )
}
