import { STREETS_LAYER_ID } from './map-ids'

export const nodeStatusColors = {
  unrated: '#f59e0b',
  complete: '#22c55e',
  skipped: '#6b7280',
  virtual: '#a855f7',
  confirmedStroke: '#15803d',
  corrected: '#38bdf8',
} as const

export const OPENFREEMAP_POSITRON = 'https://tiles.openfreemap.org/styles/positron'

export const privateRasterStyle = (tilesTemplate: string) => ({
  version: 8 as const,
  sources: {
    'private-basemap': {
      type: 'raster' as const,
      tiles: [tilesTemplate],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: 'private-basemap',
      type: 'raster' as const,
      source: 'private-basemap',
    },
  ],
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
})

export const streetsBeforeId = STREETS_LAYER_ID
