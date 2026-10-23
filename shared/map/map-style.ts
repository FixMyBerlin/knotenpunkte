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
