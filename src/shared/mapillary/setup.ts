import { createStreetImageryConfig, setStreetImageryConfig } from '@osm-editor-kit/street-imagery'
import { mapillaryToken } from '@/config/app.const'

setStreetImageryConfig(createStreetImageryConfig({ mapillaryToken }))
