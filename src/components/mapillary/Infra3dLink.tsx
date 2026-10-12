import { LockClosedIcon } from '@heroicons/react/16/solid'
import { getLocationOpenersAt, type LngLat } from '@osm-editor-kit/street-imagery'
import { Tooltip } from '@/components/shared/Tooltip/Tooltip'
import { useRatingDraft } from '@/components/shared/use-rating-draft'
import { addToList } from '@/shared/ratings/list-field'
import type { RatingSource } from '@/shared/ratings/schema'

const infra3dSource: RatingSource = 'infra3D'

/**
 * Opens infra3D at the node, turned to look at it. Only inside a project's area. Opening it
 * marks infra3D as a source of the node's rating.
 */
export function Infra3dLink({ node }: { node: { id: string; lngLat: LngLat } }) {
  const { draft, setDraft } = useRatingDraft(node.id)
  const { lngLat } = node
  const openers = getLocationOpenersAt(lngLat).filter((opener) => opener.id.startsWith('infra3d:'))
  if (openers.length === 0) return null

  return (
    <div
      className="flex max-w-64 flex-wrap gap-1 rounded-lg bg-zinc-900/90 px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/10"
      data-testid="infra3d-links"
    >
      {openers.map((opener) => (
        <Tooltip
          key={opener.id}
          text="Straßenfotos am Knotenpunkt öffnen (Zugang nur mit Account) und infra3D als Quelle setzen"
        >
          <a
            href={opener.locationUrl({ lngLat })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-zinc-200 ring-1 ring-white/20 hover:bg-white/10"
            onClick={() => setDraft({ ...draft, Quelle: addToList(draft.Quelle, infra3dSource) })}
          >
            {opener.label}
            <LockClosedIcon className="size-3 text-zinc-400" aria-hidden="true" />
          </a>
        </Tooltip>
      ))}
    </div>
  )
}
