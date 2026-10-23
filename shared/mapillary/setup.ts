import {
  createStreetImageryConfig,
  registerProviderAdapters,
  setStreetImageryConfig,
} from '@osm-editor-kit/street-imagery'
import { mapillaryAdapter } from '@osm-editor-kit/street-imagery/providers/mapillary'
import { infra3dProjects, mapillaryToken } from '@shared/config/shared.const'

setStreetImageryConfig(
  createStreetImageryConfig({ mapillaryToken, infra3d: { projects: infra3dProjects } }),
)
// Keep in sync with `mapillaryProviders` in `photo-style.ts`.
registerProviderAdapters([mapillaryAdapter])
