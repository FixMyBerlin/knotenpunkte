import { Layer, Source } from 'react-map-gl/maplibre'
import { streetsAttribution } from '@/config/app.const'
import { STREETS_LAYER_ID, STREETS_SOURCE_ID } from '@/shared/map/map-ids'
import { STREETS_SOURCE_LAYER, streetsLineColor, streetsSourceUrl } from '@/shared/map/streets'

export function StreetsLayer() {
  return (
    <Source
      id={STREETS_SOURCE_ID}
      type="vector"
      url={streetsSourceUrl()}
      attribution={streetsAttribution}
    >
      <Layer
        id={STREETS_LAYER_ID}
        type="line"
        source={STREETS_SOURCE_ID}
        source-layer={STREETS_SOURCE_LAYER}
        paint={{
          'line-color': streetsLineColor,
          'line-width': 3,
        }}
      />
    </Source>
  )
}
