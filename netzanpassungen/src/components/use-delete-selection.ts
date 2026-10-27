import { useNavigate } from '@tanstack/react-router'
import { useDrawActions } from '@/components/draw-store'
import { useNetwork, useSaveEntries } from '@/components/use-netz'
import { deadEndNodes, deleteBlocker, nodesLeftAlone, planDelete } from '@/network/edit'
import { Route } from '@/routes/index'

/** Deletes the selected edge or virtual node drawn here (marked as deleted, history stays). */
export function useDeleteSelection() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { gebiet, sel } = Route.useSearch()
  const { network } = useNetwork(gebiet)
  const save = useSaveEntries(gebiet)
  const { setMessage } = useDrawActions()

  return () => {
    if (!network || !sel) return
    const blocker = deleteBlocker(network, sel)
    if (blocker) {
      setMessage({ tone: 'error', text: blocker })
      return
    }
    const edge = sel.startsWith('neu:') ? network.edgeByKey(sel) : undefined
    const node = sel.startsWith('v:') ? network.nodeByKey(sel) : undefined
    const stored = edge?.stored ?? node?.stored
    if (!stored) return
    const freeEnds = edge ? deadEndNodes(network, sel) : []
    const alone = edge
      ? nodesLeftAlone(network, sel).filter((item) => !freeEnds.includes(item))
      : []
    const label = edge ? 'diese Kante' : `den virtuellen Knoten ${node?.name}`
    if (!window.confirm(`Wirklich ${label} löschen?`)) return
    const writes = [
      planDelete(stored),
      ...freeEnds.flatMap((item) => (item.stored ? [planDelete(item.stored)] : [])),
    ]
    if (
      alone.length > 0 &&
      window.confirm(
        `Danach hängt nichts mehr an ${alone.map((item) => item.name).join(', ')}. Auch löschen?`,
      )
    ) {
      writes.push(...alone.flatMap((item) => (item.stored ? [planDelete(item.stored)] : [])))
    }
    save.mutate(writes, {
      onSuccess: () => {
        void navigate({ search: (previous) => ({ ...previous, sel: undefined }), replace: true })
      },
    })
  }
}
