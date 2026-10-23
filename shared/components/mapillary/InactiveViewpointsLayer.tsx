import {
  coneRadiusMeters,
  destinationPoint,
  type ViewSuggestion,
} from '@osm-editor-kit/street-imagery'
import { Layer, Source } from 'react-map-gl/maplibre'

const COLOR = '#9ca3af'
const HALF_ANGLE_DEG = 22

/**
 * Views into the node that have no recent photo: drawn grey and not clickable, so they do not
 * look like the views that open a photo.
 */
export function InactiveViewpointsLayer({
  suggestions,
  zoom,
}: {
  suggestions: ViewSuggestion[]
  zoom: number
}) {
  const length = Math.max(8, coneRadiusMeters(zoom) * 3)
  const data = {
    type: 'FeatureCollection' as const,
    features: suggestions.flatMap(({ viewpoint, direction }) => {
      const from = viewpoint.lngLat
      const ring = [
        from,
        destinationPoint(from, direction.bearing - HALF_ANGLE_DEG, length),
        destinationPoint(from, direction.bearing, length * 1.05),
        destinationPoint(from, direction.bearing + HALF_ANGLE_DEG, length),
        from,
      ]
      return [
        {
          type: 'Feature' as const,
          geometry: { type: 'Polygon' as const, coordinates: [ring] },
          properties: {},
        },
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: from },
          properties: {},
        },
      ]
    }),
  }

  return (
    <Source id="viewpoints-inactive" type="geojson" data={data}>
      <Layer
        id="viewpoints-inactive-fill"
        type="fill"
        filter={['==', ['geometry-type'], 'Polygon']}
        paint={{ 'fill-color': COLOR, 'fill-opacity': 0.12 }}
      />
      <Layer
        id="viewpoints-inactive-point"
        type="circle"
        filter={['==', ['geometry-type'], 'Point']}
        paint={{
          'circle-radius': 4,
          'circle-color': '#f4f4f5',
          'circle-stroke-color': COLOR,
          'circle-stroke-width': 1.5,
        }}
      />
    </Source>
  )
}
