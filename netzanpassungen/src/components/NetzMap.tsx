import {
  streetImageryInteractiveLayerIds,
  VIEWPOINT_DIRECTION_LAYER_ID,
} from '@osm-editor-kit/street-imagery-react'
import { BaseMap } from '@shared/components/map/BaseMap'
import { Infra3dLink } from '@shared/components/mapillary/Infra3dLink'
import { MapillaryLayers, useMapillaryMapClick } from '@shared/components/mapillary/MapillaryLayers'
import { MapillaryToggle } from '@shared/components/mapillary/MapillaryToggle'
import { NodePhotoViewer } from '@shared/components/mapillary/NodePhotoViewer'
import { useTextEntryFocused } from '@shared/dom/text-entry-focus'
import { MAIN_MAP_ID } from '@shared/map/map-ids'
import { serializeMapParam } from '@shared/map/map-param'
import { STREETS_SOURCE_LAYER } from '@shared/map/streets'
import { mapillaryProviders } from '@shared/mapillary/photo-style'
import { useHotkeys } from '@tanstack/react-hotkeys'
import { useNavigate } from '@tanstack/react-router'
import type { FeatureCollection } from 'geojson'
import type { Map as MaplibreMap, MapLayerMouseEvent } from 'maplibre-gl'
import { useEffect } from 'react'
import { Layer, Source, useMap } from 'react-map-gl/maplibre'
import {
  useDrawActions,
  useDrawActive,
  useDrawDrag,
  useDrawHover,
  useDrawPoints,
  useDrawStart,
  useFlyTarget,
  useVertexIndex,
} from '@/components/draw-store'
import { NetzLegend } from '@/components/NetzLegend'
import { useDeleteSelection } from '@/components/use-delete-selection'
import { useNetwork, useSaveEntries } from '@/components/use-netz'
import { planEditEdgeCoords, planMoveVirtualNode, planNewEdge } from '@/network/edit'
import { distanceM, metersPerPixel, nearestOnLine, type LngLat } from '@/network/geo'
import { hostKey, type NetNode } from '@/network/model'
import type { VirtualNodeEntry } from '@/network/schema'
import { snap, snapToRoute, type SnapTarget } from '@/network/snap'
import { Route } from '@/routes/index'
import { resolveStep, searchMapParam } from '@/routing/search-schema'

const photoLayerIds = [
  VIEWPOINT_DIRECTION_LAYER_ID,
  ...streetImageryInteractiveLayerIds(mapillaryProviders),
]

/** Pixel tolerances; nodes win over edges. */
const NODE_TOLERANCE_PX = 12
const EDGE_TOLERANCE_PX = 10
const HANDLE_TOLERANCE_PX = 9

const NEW_COLOR = '#a855f7'
const SELECTED_COLOR = '#facc15'

const emptyCollection: FeatureCollection = { type: 'FeatureCollection', features: [] }

function tolerances(map: MaplibreMap, lngLat: LngLat) {
  const metres = metersPerPixel(map.getZoom(), lngLat[1])
  return {
    node: NODE_TOLERANCE_PX * metres,
    edge: EDGE_TOLERANCE_PX * metres,
    handle: HANDLE_TOLERANCE_PX * metres,
  }
}

function eventLngLat(event: MapLayerMouseEvent): LngLat {
  return [event.lngLat.lng, event.lngLat.lat]
}

function isNodeKey(key: string) {
  return key.startsWith('k:') || key.startsWith('v:')
}

/** Points of the selected edge as handles: its points (not the ends) and the middles between. */
function edgeHandles(coords: LngLat[]) {
  const handles: { kind: 'vertex' | 'mid'; index: number; lngLat: LngLat }[] = []
  coords.forEach((lngLat, index) => {
    if (index > 0 && index < coords.length - 1) handles.push({ kind: 'vertex', index, lngLat })
    const next = coords[index + 1]
    if (next) {
      handles.push({
        kind: 'mid',
        index: index + 1,
        lngLat: [(lngLat[0] + next[0]) / 2, (lngLat[1] + next[1]) / 2],
      })
    }
  })
  return handles
}

export function NetzMap() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const view = searchMapParam(search)
  const { gebiet, sel, bg } = search
  const step = resolveStep(search)
  const streetsOn = search.streets !== false
  const photoColor = search.photoColor ?? 'age'

  const { network, input, elementNrs, ready } = useNetwork(gebiet)
  const save = useSaveEntries(gebiet)
  const active = useDrawActive()
  const start = useDrawStart()
  const points = useDrawPoints()
  const hover = useDrawHover()
  const drag = useDrawDrag()
  const vertexIndex = useVertexIndex()
  const actions = useDrawActions()
  const deleteSelection = useDeleteSelection()
  const textEntryFocused = useTextEntryFocused()
  const handleMapillaryClick = useMapillaryMapClick()

  const drawing = step === 'zeichnen' && active
  const selectedNode = sel && network && isNodeKey(sel) ? network.nodeByKey(sel) : undefined
  const selectedEdge = sel && network && !isNodeKey(sel) ? network.edgeByKey(sel) : undefined
  const photosOn = search.photos !== false && step === 'zeichnen' && !drawing
  const photoNode = selectedNode ? { id: selectedNode.key, lngLat: selectedNode.lngLat } : null

  useEffect(
    function stopDrawingOutsideTheStep() {
      if (step !== 'zeichnen') actions.stop()
    },
    [step, actions],
  )

  function select(key: string | undefined) {
    actions.setVertexIndex(null)
    void navigate({ search: (previous) => ({ ...previous, sel: key }), replace: true })
  }

  /** Coordinates of the selected new edge, with the point being dragged. */
  function selectedEdgeCoords() {
    if (!selectedEdge) return null
    if (drag?.kind !== 'vertex') return selectedEdge.coords
    const coords = [...selectedEdge.coords]
    if (drag.insert) coords.splice(drag.index, 0, drag.lngLat)
    else coords[drag.index] = drag.lngLat
    return coords
  }

  /** Where the selected virtual node would be with the drag: on its host edge. */
  function draggedNodePoint() {
    if (drag?.kind !== 'node' || !network || !selectedNode?.stored) return null
    const host = network.edgeByKey(hostKey(selectedNode.stored.data.traeger))
    return host ? nearestOnLine(host.coords, drag.lngLat).point : null
  }

  function handleDrawClick(event: MapLayerMouseEvent) {
    if (!network || save.isPending) return
    if (!ready) {
      actions.setMessage({ tone: 'error', text: 'Die gespeicherten Einträge werden noch geladen.' })
      return
    }
    const lngLat = eventLngLat(event)
    const free = event.originalEvent.altKey
    const tolerance = tolerances(event.target, lngLat)
    const target = free ? null : snap(network, lngLat, tolerance.node, tolerance.edge)

    if (!start) {
      if (target) actions.setStart(target)
      else {
        actions.setMessage({
          tone: 'error',
          text: 'Eine neue Kante beginnt an einem Knoten oder auf einer Kante.',
        })
      }
      return
    }
    if (!target) {
      const route = free ? null : snapToRoute(network, lngLat, tolerance.edge)
      actions.addPoint(route?.lngLat ?? lngLat)
      return
    }
    if (
      target.type === 'node' &&
      start.type === 'node' &&
      target.node.key === start.node.key &&
      points.length === 0
    ) {
      return
    }
    const plan = planNewEdge(network, start, points, target)
    save.mutate(plan.writes, {
      onSuccess: () => {
        const endNode: NetNode =
          target.type === 'node'
            ? target.node
            : {
                key: plan.endKey,
                name:
                  (
                    plan.writes.find((write) => `v:${write.id}` === plan.endKey)?.data as
                      | VirtualNodeEntry
                      | undefined
                  )?.name ?? '',
                lngLat: target.lngLat,
                kind: 'neu',
              }
        const next: SnapTarget = { type: 'node', node: endNode, lngLat: endNode.lngLat }
        actions.finished(next, plan.newNodeKeys)
      },
    })
  }

  function handleSelectClick(event: MapLayerMouseEvent) {
    if (!network) return
    if (photosOn && handleMapillaryClick(event)) return
    const lngLat = eventLngLat(event)
    const tolerance = tolerances(event.target, lngLat)
    if (selectedEdge?.kind === 'neu') {
      const hit = edgeHandles(selectedEdge.coords).find(
        (handle) =>
          handle.kind === 'vertex' && distanceM(handle.lngLat, lngLat) <= tolerance.handle,
      )
      if (hit) {
        actions.setVertexIndex(hit.index)
        return
      }
    }
    const target = snap(network, lngLat, tolerance.node, tolerance.edge)
    select(target ? (target.type === 'node' ? target.node.key : target.edge.key) : undefined)
  }

  function handleMouseDown(event: MapLayerMouseEvent) {
    if (drawing || !network) return
    const lngLat = eventLngLat(event)
    const tolerance = tolerances(event.target, lngLat)
    if (
      selectedNode?.kind === 'neu' &&
      distanceM(selectedNode.lngLat, lngLat) <= tolerance.handle
    ) {
      event.preventDefault()
      actions.setDrag({ kind: 'node', lngLat })
      return
    }
    if (selectedEdge?.kind !== 'neu') return
    const handle = edgeHandles(selectedEdge.coords)
      .map((item) => ({ ...item, distance: distanceM(item.lngLat, lngLat) }))
      .filter((item) => item.distance <= tolerance.handle)
      .sort((a, b) => a.distance - b.distance)[0]
    if (!handle) return
    event.preventDefault()
    actions.setDrag({ kind: 'vertex', index: handle.index, insert: handle.kind === 'mid', lngLat })
  }

  function handleMouseUp() {
    if (!drag || !network) return
    if (drag.kind === 'node' && selectedNode) {
      save.mutate(planMoveVirtualNode(network, selectedNode, drag.lngLat))
    }
    if (drag.kind === 'vertex' && selectedEdge?.stored) {
      const coords = selectedEdgeCoords()
      if (coords) save.mutate(planEditEdgeCoords(network, selectedEdge.stored, coords))
    }
    actions.setDrag(null)
  }

  function handleMouseMove(event: MapLayerMouseEvent) {
    const lngLat = eventLngLat(event)
    if (drag) {
      actions.setDrag({ ...drag, lngLat })
      return
    }
    if (!drawing || !network) return
    const free = event.originalEvent.altKey
    const tolerance = tolerances(event.target, lngLat)
    const target = free ? null : snap(network, lngLat, tolerance.node, tolerance.edge)
    const routePoint =
      !free && !target && start
        ? (snapToRoute(network, lngLat, tolerance.edge)?.lngLat ?? null)
        : null
    actions.setHover({ lngLat, target, routePoint, free })
  }

  useHotkeys(
    [
      {
        hotkey: 'N',
        callback: () => {
          if (step === 'zeichnen') actions.toggle()
        },
        options: { meta: { name: 'Neue Kante' } },
      },
      {
        hotkey: 'Escape',
        callback: () => {
          if (drawing && start) actions.setStart(null)
          else if (drawing) actions.stop()
          else select(undefined)
        },
        options: { meta: { name: 'Abbrechen' } },
      },
      {
        hotkey: 'Backspace',
        callback: () => {
          if (drawing) {
            actions.removeLastPoint()
            return
          }
          if (
            selectedEdge?.stored &&
            vertexIndex !== null &&
            selectedEdge.coords.length > 2 &&
            network
          ) {
            const coords = selectedEdge.coords.filter((_, index) => index !== vertexIndex)
            save.mutate(planEditEdgeCoords(network, selectedEdge.stored, coords))
            actions.setVertexIndex(null)
          }
        },
        options: { meta: { name: 'Letzten Punkt zurücknehmen' } },
      },
      {
        hotkey: 'Delete',
        callback: () => {
          if (
            selectedEdge?.stored &&
            vertexIndex !== null &&
            selectedEdge.coords.length > 2 &&
            network
          ) {
            const coords = selectedEdge.coords.filter((_, index) => index !== vertexIndex)
            save.mutate(planEditEdgeCoords(network, selectedEdge.stored, coords))
            actions.setVertexIndex(null)
            return
          }
          deleteSelection()
        },
        options: { meta: { name: 'Löschen' } },
      },
    ],
    { enabled: !textEntryFocused, ignoreInputs: false },
  )

  // Sources of the map.
  const virtualNodes: FeatureCollection = {
    type: 'FeatureCollection',
    features: (network?.virtualNodes ?? []).map((node) => {
      const dragged = node.key === selectedNode?.key ? draggedNodePoint() : null
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: dragged ?? node.lngLat },
        properties: { key: node.key, name: node.name, selected: node.key === sel ? 1 : 0 },
      }
    }),
  }
  const newEdges: FeatureCollection = {
    type: 'FeatureCollection',
    features: (network?.newEdges ?? []).map((edge) => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates:
          edge.key === selectedEdge?.key ? (selectedEdgeCoords() ?? edge.coords) : edge.coords,
      },
      properties: {
        key: edge.key,
        element_nr: elementNrs.get(edge.key) ?? '',
        selected: edge.key === sel ? 1 : 0,
      },
    })),
  }
  const selection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      ...(selectedEdge && selectedEdge.kind !== 'neu'
        ? [
            {
              type: 'Feature' as const,
              geometry: { type: 'LineString' as const, coordinates: selectedEdge.coords },
              properties: {},
            },
          ]
        : []),
      ...(selectedNode && selectedNode.kind !== 'neu'
        ? [
            {
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: selectedNode.lngLat },
              properties: {},
            },
          ]
        : []),
    ],
  }
  const handles: FeatureCollection = {
    type: 'FeatureCollection',
    features:
      selectedEdge?.kind === 'neu' && !drawing
        ? edgeHandles(selectedEdgeCoords() ?? selectedEdge.coords).map((handle) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: handle.lngLat },
            properties: {
              kind: handle.kind,
              selected: handle.kind === 'vertex' && handle.index === vertexIndex ? 1 : 0,
            },
          }))
        : [],
  }
  const hoverPoint = hover?.target?.lngLat ?? hover?.routePoint ?? hover?.lngLat
  const draft: FeatureCollection = {
    type: 'FeatureCollection',
    features:
      drawing && start
        ? [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [start.lngLat, ...points, ...(hoverPoint ? [hoverPoint] : [])],
              },
              properties: {},
            },
            ...points.map((point) => ({
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: point },
              properties: {},
            })),
          ]
        : [],
  }
  const snapIndicator: FeatureCollection = {
    type: 'FeatureCollection',
    features:
      drawing && hover?.target
        ? [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: hover.target.lngLat },
              properties: { kind: hover.target.type },
            },
          ]
        : [],
  }

  const cursor = drag ? 'grabbing' : drawing ? 'crosshair' : undefined

  return (
    <BaseMap
      view={view}
      bg={bg}
      onViewChange={(next) => {
        void navigate({
          search: (previous) => ({ ...previous, map: serializeMapParam(next) }),
          replace: true,
        })
      }}
      streetsOn={streetsOn}
      onStreetsChange={(on) => {
        void navigate({
          search: (previous) => ({ ...previous, streets: on ? undefined : false }),
          replace: true,
        })
      }}
      streetsLayers={
        <Layer
          id="na-detailnetz-labels"
          type="symbol"
          source-layer={STREETS_SOURCE_LAYER}
          minzoom={16}
          layout={{
            'text-field': ['get', 'element_nr'],
            'text-size': 10,
            'text-font': ['Noto Sans Regular'],
            'symbol-placement': 'line',
            'text-offset': [0, 0.9],
          }}
          paint={{ 'text-color': '#1f2937', 'text-halo-color': '#fff', 'text-halo-width': 1.2 }}
        />
      }
      interactiveLayerIds={photosOn ? photoLayerIds : []}
      onClick={(event) => (drawing ? handleDrawClick(event) : handleSelectClick(event))}
      onMouseMove={handleMouseMove}
      onMouseOut={() => actions.setHover(null)}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      cursor={cursor}
      doubleClickZoom={!drawing}
      overlay={photosOn && photoNode ? <NodePhotoViewer node={photoNode} /> : null}
      controls={
        <>
          <NetzLegend />
          {step === 'zeichnen' ? (
            <MapillaryToggle
              photosOn={photosOn}
              onPhotosChange={(on) => {
                void navigate({
                  search: (previous) => ({ ...previous, photos: on ? undefined : false }),
                  replace: true,
                })
              }}
              zoom={view.zoom}
              viewportKey={search.map}
              photoColor={photoColor}
              onPhotoColorChange={(mode) => {
                void navigate({
                  search: (previous) => ({
                    ...previous,
                    photoColor: mode === 'type' ? ('type' as const) : undefined,
                  }),
                  replace: true,
                })
              }}
            />
          ) : null}
          {photoNode ? <Infra3dLink node={photoNode} /> : null}
        </>
      }
    >
      <FlyToTarget />
      {photosOn ? (
        <MapillaryLayers
          node={photoNode}
          zoom={view.zoom}
          viewportKey={search.map}
          streetsOn={streetsOn}
          photoColor={photoColor}
        />
      ) : null}
      <Source id="na-radfernwege" type="geojson" data={input?.file.radfernwege ?? emptyCollection}>
        <Layer
          id="na-radfernwege-line"
          type="line"
          paint={{ 'line-color': '#16a34a', 'line-width': 12, 'line-opacity': 0.25 }}
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        />
      </Source>
      <Source id="na-ren" type="geojson" data={input?.file.ren_netz ?? emptyCollection}>
        <Layer
          id="na-ren-line"
          type="line"
          paint={{
            'line-color': [
              'match',
              ['get', 'radverkehrsnetz'],
              'Radvorrangnetz',
              '#A21CAF',
              'Radergänzungsnetz',
              '#F49E00',
              '#1d4ed8',
            ],
            'line-width': 7,
            'line-opacity': 0.4,
          }}
          layout={{ 'line-cap': 'round' }}
        />
        <Layer
          id="na-ren-labels"
          type="symbol"
          minzoom={16}
          layout={{
            'text-field': ['coalesce', ['get', 'element_nr'], ''],
            'text-size': 10,
            'text-font': ['Noto Sans Regular'],
            'symbol-placement': 'line',
            'text-offset': [0, -0.9],
          }}
          paint={{ 'text-color': '#86198f', 'text-halo-color': '#fff', 'text-halo-width': 1.2 }}
        />
      </Source>
      <Source id="na-luecken" type="geojson" data={input?.file.luecken ?? emptyCollection}>
        <Layer
          id="na-luecken-line"
          type="line"
          paint={{ 'line-color': '#dc2626', 'line-width': 4, 'line-dasharray': [2, 1.5] }}
        />
      </Source>
      <Source id="na-selection" type="geojson" data={selection}>
        <Layer
          id="na-selection-line"
          type="line"
          filter={['==', ['geometry-type'], 'LineString']}
          paint={{ 'line-color': SELECTED_COLOR, 'line-width': 9, 'line-opacity': 0.7 }}
        />
        <Layer
          id="na-selection-point"
          type="circle"
          filter={['==', ['geometry-type'], 'Point']}
          paint={{
            'circle-radius': 9,
            'circle-color': 'transparent',
            'circle-stroke-color': SELECTED_COLOR,
            'circle-stroke-width': 3,
          }}
        />
      </Source>
      <Source id="na-knoten" type="geojson" data={input?.file.knoten ?? emptyCollection}>
        <Layer
          id="na-knoten-circle"
          type="circle"
          minzoom={14}
          paint={{
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 1.5, 18, 4.5],
            'circle-color': ['case', ['==', ['get', 'ist_virtuell'], 1], '#d8b4fe', '#ffffff'],
            'circle-stroke-color': [
              'case',
              ['==', ['get', 'ist_virtuell'], 1],
              '#7e22ce',
              '#111827',
            ],
            'circle-stroke-width': 1,
          }}
        />
        <Layer
          id="na-knoten-labels"
          type="symbol"
          minzoom={16}
          layout={{
            'text-field': ['get', 'id'],
            'text-size': 10,
            'text-font': ['Noto Sans Regular'],
            'text-offset': [0, 1],
            'text-anchor': 'top',
          }}
          paint={{ 'text-color': '#111827', 'text-halo-color': '#fff', 'text-halo-width': 1.2 }}
        />
      </Source>
      <Source id="na-neue-kanten" type="geojson" data={newEdges}>
        <Layer
          id="na-neue-kanten-line"
          type="line"
          paint={{
            'line-color': NEW_COLOR,
            'line-width': ['case', ['==', ['get', 'selected'], 1], 7, 4],
          }}
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        />
        <Layer
          id="na-neue-kanten-labels"
          type="symbol"
          minzoom={15}
          layout={{
            'text-field': ['get', 'element_nr'],
            'text-size': 11,
            'text-font': ['Noto Sans Regular'],
            'symbol-placement': 'line',
            'text-offset': [0, 1],
          }}
          paint={{ 'text-color': '#6b21a8', 'text-halo-color': '#fff', 'text-halo-width': 1.5 }}
        />
      </Source>
      <Source id="na-handles" type="geojson" data={handles}>
        <Layer
          id="na-handles-circle"
          type="circle"
          paint={{
            'circle-radius': ['case', ['==', ['get', 'kind'], 'mid'], 3.5, 5],
            'circle-color': [
              'case',
              ['==', ['get', 'selected'], 1],
              SELECTED_COLOR,
              ['==', ['get', 'kind'], 'mid'],
              '#e9d5ff',
              '#ffffff',
            ],
            'circle-stroke-color': NEW_COLOR,
            'circle-stroke-width': 2,
          }}
        />
      </Source>
      <Source id="na-virtuelle-knoten" type="geojson" data={virtualNodes}>
        <Layer
          id="na-virtuelle-knoten-circle"
          type="circle"
          paint={{
            'circle-radius': 6,
            'circle-color': NEW_COLOR,
            'circle-stroke-color': [
              'case',
              ['==', ['get', 'selected'], 1],
              SELECTED_COLOR,
              '#ffffff',
            ],
            'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 3, 2],
          }}
        />
        <Layer
          id="na-virtuelle-knoten-labels"
          type="symbol"
          minzoom={14}
          layout={{
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-font': ['Noto Sans Regular'],
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
          }}
          paint={{ 'text-color': '#581c87', 'text-halo-color': '#fff', 'text-halo-width': 1.5 }}
        />
      </Source>
      <Source id="na-draft" type="geojson" data={draft}>
        <Layer
          id="na-draft-line"
          type="line"
          filter={['==', ['geometry-type'], 'LineString']}
          paint={{ 'line-color': NEW_COLOR, 'line-width': 3, 'line-dasharray': [1.5, 1] }}
        />
        <Layer
          id="na-draft-points"
          type="circle"
          filter={['==', ['geometry-type'], 'Point']}
          paint={{
            'circle-radius': 4,
            'circle-color': '#ffffff',
            'circle-stroke-color': NEW_COLOR,
            'circle-stroke-width': 2,
          }}
        />
      </Source>
      <Source id="na-snap" type="geojson" data={snapIndicator}>
        <Layer
          id="na-snap-circle"
          type="circle"
          paint={{
            'circle-radius': 9,
            'circle-color': 'transparent',
            'circle-stroke-color': ['case', ['==', ['get', 'kind'], 'node'], '#22c55e', '#f97316'],
            'circle-stroke-width': 3,
          }}
        />
      </Source>
    </BaseMap>
  )
}

function FlyToTarget() {
  const { [MAIN_MAP_ID]: map } = useMap()
  const target = useFlyTarget()
  useEffect(
    function flyToRequestedPlace() {
      if (!map || !target) return
      map.easeTo({ center: target.lngLat, zoom: Math.max(map.getZoom(), 17), duration: 500 })
    },
    [map, target],
  )
  return null
}
