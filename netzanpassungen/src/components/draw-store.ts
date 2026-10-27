import { create } from 'zustand'
import type { LngLat } from '@/network/geo'
import type { SnapTarget } from '@/network/snap'

/** What the pointer would hit with a click, while the tool is on. */
type Hover = {
  lngLat: LngLat
  /** Node or edge for the start or end. */
  target: SnapTarget | null
  /** Point on a Radfernweg for a point in between. */
  routePoint: LngLat | null
  free: boolean
}

/** A point of a selected edge, or a virtual node, being dragged. */
type Drag =
  | { kind: 'vertex'; index: number; insert: boolean; lngLat: LngLat }
  | { kind: 'node'; lngLat: LngLat }

interface DrawStore {
  /** The tool “Neue Kante” is on. */
  active: boolean
  start: SnapTarget | null
  points: LngLat[]
  hover: Hover | null
  drag: Drag | null
  /** Selected point of the selected edge, for deleting it. */
  vertexIndex: number | null
  /**
   * Set when the line would be dropped while it has points: the sidebar asks to save it as a dead
   * end, drop it or go on. `stopTool`: the tool goes off after that.
   */
  leavePrompt: { stopTool: boolean } | null
  /** Shown in the sidebar until the next action. */
  message: { tone: 'info' | 'error'; text: string } | null
  /** Virtual nodes created with the last edge, to name them. */
  lastNewNodes: string[]
  /** Where the map should move to; `id` changes with every request. */
  flyTarget: { lngLat: LngLat; id: number } | null
  actions: {
    toggle: () => void
    stop: () => void
    /** Drops the line, or asks first when it has points (see `leavePrompt`). */
    cancelLine: (stopTool: boolean) => void
    /** Drops the line after `leavePrompt`. */
    discardLine: () => void
    keepDrawing: () => void
    setStart: (start: SnapTarget | null) => void
    addPoint: (point: LngLat) => void
    removeLastPoint: () => void
    setHover: (hover: Hover | null) => void
    setDrag: (drag: Drag | null) => void
    setVertexIndex: (index: number | null) => void
    setMessage: (message: DrawStore['message']) => void
    finished: (endTarget: SnapTarget, newNodes: string[]) => void
    finishedDeadEnd: (newNodes: string[]) => void
    flyTo: (lngLat: LngLat) => void
    setLastNewNodes: (keys: string[]) => void
  }
}

const stopped = { active: false, start: null, points: [], hover: null, leavePrompt: null }
const dropped = { start: null, points: [], leavePrompt: null }

const useDrawStore = create<DrawStore>()((set) => ({
  active: false,
  start: null,
  points: [],
  hover: null,
  drag: null,
  vertexIndex: null,
  leavePrompt: null,
  message: null,
  lastNewNodes: [],
  flyTarget: null,
  actions: {
    toggle: () =>
      set((state) =>
        !state.active
          ? { active: true, message: null }
          : state.points.length > 0
            ? { leavePrompt: { stopTool: true } }
            : stopped,
      ),
    stop: () => set(stopped),
    cancelLine: (stopTool) =>
      set((state) =>
        state.points.length > 0 ? { leavePrompt: { stopTool } } : stopTool ? stopped : dropped,
      ),
    discardLine: () => set((state) => (state.leavePrompt?.stopTool ? stopped : dropped)),
    keepDrawing: () => set({ leavePrompt: null }),
    setStart: (start) => set({ start, points: [], message: null, leavePrompt: null }),
    addPoint: (point) =>
      set((state) => ({ points: [...state.points, point], message: null, leavePrompt: null })),
    removeLastPoint: () =>
      set((state) =>
        state.points.length > 0
          ? { points: state.points.slice(0, -1), leavePrompt: null }
          : { start: null },
      ),
    setHover: (hover) => set({ hover }),
    setDrag: (drag) => set({ drag }),
    setVertexIndex: (vertexIndex) => set({ vertexIndex }),
    setMessage: (message) => set({ message }),
    // The end of an edge is the start of the next one, so a route is drawn in one go.
    finished: (endTarget, newNodes) =>
      set({
        start: endTarget,
        points: [],
        lastNewNodes: newNodes,
        message: null,
        leavePrompt: null,
      }),
    // A dead end has no node to go on from; the next line starts with a click again.
    finishedDeadEnd: (newNodes) =>
      set((state) => ({
        ...(state.leavePrompt?.stopTool ? stopped : dropped),
        lastNewNodes: newNodes,
        message: null,
      })),
    setLastNewNodes: (lastNewNodes) => set({ lastNewNodes, message: null }),
    flyTo: (lngLat) =>
      set((state) => ({ flyTarget: { lngLat, id: (state.flyTarget?.id ?? 0) + 1 } })),
  },
}))

export const useDrawActive = () => useDrawStore((state) => state.active)
export const useDrawStart = () => useDrawStore((state) => state.start)
export const useDrawPoints = () => useDrawStore((state) => state.points)
export const useDrawHover = () => useDrawStore((state) => state.hover)
export const useDrawDrag = () => useDrawStore((state) => state.drag)
export const useVertexIndex = () => useDrawStore((state) => state.vertexIndex)
export const useLeavePrompt = () => useDrawStore((state) => state.leavePrompt)
export const useDrawMessage = () => useDrawStore((state) => state.message)
export const useLastNewNodes = () => useDrawStore((state) => state.lastNewNodes)
export const useFlyTarget = () => useDrawStore((state) => state.flyTarget)
export const useDrawActions = () => useDrawStore((state) => state.actions)
