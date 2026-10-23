import { streetsAttribution } from '@shared/config/shared.const'
import { STREETS_LAYER_ID, STREETS_SOURCE_ID } from '@shared/map/map-ids'
import { STREETS_SOURCE_LAYER, streetsLineColor, streetsSourceUrl } from '@shared/map/streets'
import type { ReactNode } from 'react'
import { Layer, Source } from 'react-map-gl/maplibre'

/** The Berlin street network; `children` are more layers on the same source. */
export function StreetsLayer({ children }: { children?: ReactNode }) {
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
      {children}
    </Source>
  )
}
