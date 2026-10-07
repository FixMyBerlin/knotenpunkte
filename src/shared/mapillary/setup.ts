import {
  createStreetImageryConfig,
  registerProviderAdapters,
  setStreetImageryConfig,
} from '@osm-editor-kit/street-imagery'
import { mapillaryAdapter } from '@osm-editor-kit/street-imagery/providers/mapillary'
import { mapillaryMapFeaturesAdapter } from '@osm-editor-kit/street-imagery/providers/mapillary-map-features'
import { mapillaryToken } from '@/config/app.const'

setStreetImageryConfig(createStreetImageryConfig({ mapillaryToken }))
// Keep in sync with `mapillaryProviders` in `junction.ts`.
registerProviderAdapters([mapillaryAdapter, mapillaryMapFeaturesAdapter])
