import {
  useBackgroundChoice,
  useMapUiActions,
  usePrivateRasters,
} from '@shared/components/map/map-ui-store'
import { MapBackgroundFavorites } from '@shared/components/map/MapBackgroundFavorites'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@shared/map/maplibre-worker'
import { MapBackgroundLayerControl } from '@shared/components/map/MapBackgroundLayerControl'
import { MapBackgroundLayerSource } from '@shared/components/map/MapBackgroundLayerSource'
import { MapResetNorthPitchButton } from '@shared/components/map/MapResetNorthPitchButton'
import { StreetsLayer } from '@shared/components/map/StreetsLayer'
import { StreetsLegend } from '@shared/components/map/StreetsLegend'
import { exposeMainMapForDebugging } from '@shared/map/expose-main-map'
import { MAIN_MAP_ID } from '@shared/map/map-ids'
import type { MapParam } from '@shared/map/map-param'
import { OPENFREEMAP_POSITRON, privateRasterStyle } from '@shared/map/map-style'
import {
  backgroundChoiceId,
  readBackgroundChoice,
  readPrivateRasters,
  resolveBackgroundChoice,
} from '@shared/map/private-raster'
import { usePmtilesProtocol } from '@shared/map/use-pmtiles-protocol'
import type { MapLayerMouseEvent, MapLibreEvent } from 'maplibre-gl'
import { useEffect, type ReactNode } from 'react'
import { AttributionControl, Map, type ViewStateChangeEvent } from 'react-map-gl/maplibre'

type Props = {
  /** Camera from the URL; only the first value is used, later moves report `onViewChange`. */
  view: MapParam
  /** `?bg=` of the URL; without it the background stored in this browser. */
  bg: string | undefined
  onViewChange: (view: MapParam) => void
  streetsOn: boolean
  onStreetsChange: (on: boolean) => void
  /** More layers on the street network source (e.g. labels), only while it is on. */
  streetsLayers?: ReactNode
  interactiveLayerIds?: string[]
  onClick?: (event: MapLayerMouseEvent) => void
  onMouseMove?: (event: MapLayerMouseEvent) => void
  onMouseOut?: (event: MapLayerMouseEvent) => void
  onMouseDown?: (event: MapLayerMouseEvent) => void
  onMouseUp?: (event: MapLayerMouseEvent) => void
  cursor?: string
  doubleClickZoom?: boolean
  /** Layers of the app, above the background and the street network. */
  children?: ReactNode
  /** Controls of the app, below the shared ones in the top-right column. */
  controls?: ReactNode
  /** Floats over the map, outside of it (e.g. the photo viewer). */
  overlay?: ReactNode
}

/**
 * The map of both apps: Positron, Editor Layer Index and private backgrounds with favourites,
 * the street network with its legend, compass reset, and the camera in the URL.
 */
export function BaseMap({
  view,
  bg,
  onViewChange,
  streetsOn,
  onStreetsChange,
  streetsLayers,
  interactiveLayerIds,
  onClick,
  onMouseMove,
  onMouseOut,
  onMouseDown,
  onMouseUp,
  cursor,
  doubleClickZoom,
  children,
  controls,
  overlay,
}: Props) {
  usePmtilesProtocol()
  const { setBackgroundChoice, setMapBearing, setMapPitch, setPrivateRasters } = useMapUiActions()
  const privateRasters = usePrivateRasters()
  const storedBackground = useBackgroundChoice()

  useEffect(
    function hydrateBackgroundFromStorage() {
      setPrivateRasters(readPrivateRasters())
      setBackgroundChoice(readBackgroundChoice())
    },
    [setPrivateRasters, setBackgroundChoice],
  )

  const effectiveBg = bg ?? (storedBackground || undefined)
  const background = resolveBackgroundChoice(effectiveBg, privateRasters)
  const mapStyle =
    background.kind === 'private' ? privateRasterStyle(background.url) : OPENFREEMAP_POSITRON
  const eliId = background.kind === 'eli' ? background.id : null

  return (
    <div className="relative h-full w-full">
      <Map
        id={MAIN_MAP_ID}
        mapStyle={mapStyle}
        initialViewState={{
          longitude: view.lng,
          latitude: view.lat,
          zoom: view.zoom,
        }}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        interactiveLayerIds={interactiveLayerIds}
        cursor={cursor}
        doubleClickZoom={doubleClickZoom}
        onLoad={(event: MapLibreEvent) => {
          exposeMainMapForDebugging(event.target)
          setMapBearing(event.target.getBearing())
          setMapPitch(event.target.getPitch())
        }}
        onRotate={(event: ViewStateChangeEvent) => {
          setMapBearing(event.viewState.bearing)
        }}
        onRotateEnd={(event: ViewStateChangeEvent) => {
          setMapBearing(event.viewState.bearing)
        }}
        onPitch={(event: ViewStateChangeEvent) => {
          setMapPitch(event.viewState.pitch)
        }}
        onPitchEnd={(event: ViewStateChangeEvent) => {
          setMapPitch(event.viewState.pitch)
        }}
        onMoveEnd={(event: ViewStateChangeEvent) => {
          const { latitude, longitude, zoom } = event.viewState
          onViewChange({ zoom, lat: latitude, lng: longitude })
        }}
        onClick={onClick}
        onMouseMove={onMouseMove}
        onMouseOut={onMouseOut}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      >
        <AttributionControl compact position="bottom-right" />
        <MapBackgroundLayerSource backgroundLayerId={eliId} />
        {streetsOn ? <StreetsLayer>{streetsLayers}</StreetsLayer> : null}
        {children}
      </Map>
      {overlay}
      <div className="pointer-events-none absolute top-3 right-3 z-10 flex flex-col items-end gap-2 *:pointer-events-auto">
        <MapResetNorthPitchButton />
        <MapBackgroundLayerControl background={background} lat={view.lat} lng={view.lng} />
        <MapBackgroundFavorites activeId={backgroundChoiceId(background)} />
        <StreetsLegend streetsOn={streetsOn} onStreetsChange={onStreetsChange} />
        {controls}
      </div>
    </div>
  )
}
