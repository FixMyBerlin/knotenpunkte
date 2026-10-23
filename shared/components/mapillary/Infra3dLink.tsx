import { LockClosedIcon } from '@heroicons/react/16/solid'
import { getLocationOpenersAt, type LngLat } from '@osm-editor-kit/street-imagery'
import { Tooltip } from '@shared/components/Tooltip/Tooltip'

type Props = {
  node: { id: string; lngLat: LngLat }
  /** Called when the link is opened, e.g. to mark infra3D as a source. */
  onOpen?: () => void
  tooltip?: string
}

/** Opens infra3D at the node, turned to look at it. Only inside a project's area. */
export function Infra3dLink({
  node,
  onOpen,
  tooltip = 'Straßenfotos an dieser Stelle öffnen (Zugang nur mit Account)',
}: Props) {
  const { lngLat } = node
  const openers = getLocationOpenersAt(lngLat).filter((opener) => opener.id.startsWith('infra3d:'))
  if (openers.length === 0) return null

  return (
    <div
      className="flex max-w-64 flex-wrap gap-1 rounded-lg bg-zinc-900/90 px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/10"
      data-testid="infra3d-links"
    >
      {openers.map((opener) => (
        <Tooltip key={opener.id} text={tooltip}>
          <a
            href={opener.locationUrl({ lngLat })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-zinc-200 ring-1 ring-white/20 hover:bg-white/10"
            onClick={onOpen}
          >
            {opener.label}
            <LockClosedIcon className="size-3 text-zinc-400" aria-hidden="true" />
          </a>
        </Tooltip>
      ))}
    </div>
  )
}
