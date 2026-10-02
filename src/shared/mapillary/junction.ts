import {
  JUNCTION_DETECTION_GROUPS,
  JUNCTION_FEATURE_GROUPS,
  matchesAnyGroup,
  type ProviderId,
} from '@osm-editor-kit/street-imagery'
import { mapillaryMaxAgeYears } from '@/config/app.const'

export const mapillaryProviders: ProviderId[] = ['mapillary', 'mapillary-map-features']

/** Traffic lights, bicycle symbols, stop lines, arrows, crosswalks (map points). */
export const isJunctionFeature = matchesAnyGroup(JUNCTION_FEATURE_GROUPS)

/** Bike-lane surface, line markings, hatching, islands (outlines per photo). */
export const isJunctionDetection = matchesAnyGroup(JUNCTION_DETECTION_GROUPS)

export const junctionFeatureObjectValues = [
  'object--traffic-light--*',
  'marking--discrete--*',
  'construction--flat--crosswalk-plain',
]

export const JUNCTION_FEATURE_RADIUS_METERS = 40

/** German labels and the attribute each group gives a hint for. */
export const junctionGroupLabels: Record<string, { one: string; many: string; hint: string }> = {
  'traffic-light': { one: 'Ampel', many: 'Ampeln', hint: 'Hinweis für LSA-Knotenpunkt' },
  'bicycle-symbol': {
    one: 'Fahrrad-Symbol',
    many: 'Fahrrad-Symbole',
    hint: 'Hinweis für Furten, Mittellage und Aufstellflächen',
  },
  'stop-line': {
    one: 'Haltlinie',
    many: 'Haltlinien',
    hint: 'Hinweis für vorgezogene Aufstellflächen',
  },
  arrow: { one: 'Pfeil', many: 'Pfeile', hint: 'Hinweis für Mittellage und Linksabbiegen' },
  crosswalk: { one: 'Überweg', many: 'Überwege', hint: 'Fußgängerüberwege und -furten' },
}

export function mapillaryFromDate(now = new Date()) {
  const from = new Date(now)
  from.setFullYear(from.getFullYear() - mapillaryMaxAgeYears)
  return from.toISOString().slice(0, 10)
}
