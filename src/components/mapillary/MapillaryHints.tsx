import {
  countByGroup,
  formatDate,
  JUNCTION_FEATURE_GROUPS,
  parseIsoDateStartMs,
  type LngLat,
} from '@osm-editor-kit/street-imagery'
import { useMapillaryMapFeaturesNear } from '@osm-editor-kit/street-imagery-react'
import { useMapUiActions, useSelectedMapFeatureId } from '@/components/shared/map-ui-store'
import { Tooltip } from '@/components/shared/Tooltip/Tooltip'
import { mapillaryFeaturesSeenFrom } from '@/config/app.const'
import {
  isJunctionFeature,
  JUNCTION_FEATURE_RADIUS_METERS,
  junctionFeatureObjectValues,
  junctionGroupLabels,
} from '@/shared/mapillary/junction'

const seenFromMs = parseIsoDateStartMs(mapillaryFeaturesSeenFrom) ?? 0
const seenFromLabel = formatDate(seenFromMs, 'de')

/**
 * What Mapillary detected around the node: traffic lights and markings, as counts. A count opens
 * the nearest of these objects in its best photo; clicking again steps to the next one.
 */
export function MapillaryHints({ lngLat }: { lngLat: LngLat }) {
  const selectedId = useSelectedMapFeatureId()
  const { setSelectedMapFeatureId } = useMapUiActions()
  const query = useMapillaryMapFeaturesNear(lngLat, {
    radiusMeters: JUNCTION_FEATURE_RADIUS_METERS,
    objectValues: junctionFeatureObjectValues,
  })
  const detected = (query.data ?? []).filter((feature) => isJunctionFeature(feature.value))
  // Objects without a recent sighting may be gone; they are left out and only mentioned.
  const features = detected.filter((feature) => (feature.lastSeenAt ?? 0) >= seenFromMs)
  const olderCount = detected.length - features.length
  const counts = countByGroup(features, JUNCTION_FEATURE_GROUPS)
  const groups = JUNCTION_FEATURE_GROUPS.filter((group) => (counts[group.id] ?? 0) > 0)

  return (
    <div className="text-xs text-zinc-400" data-testid="mapillary-hints">
      <p>Von Mapillary im Umkreis von {JUNCTION_FEATURE_RADIUS_METERS} m erkannt:</p>
      {query.isLoading ? (
        <p className="pt-1">Lade …</p>
      ) : query.isError ? (
        <p className="pt-1">Konnte nicht geladen werden.</p>
      ) : groups.length === 0 ? (
        <p className="pt-1">Keine Ampeln oder Markierungen seit {seenFromLabel}.</p>
      ) : (
        <ul className="flex flex-wrap gap-1 pt-1">
          {groups.map((group) => {
            const inGroup = features.filter((feature) => group.pattern.test(feature.value))
            const label = junctionGroupLabels[group.id]
            const selectedIndex = inGroup.findIndex((feature) => feature.id === selectedId)
            const count = counts[group.id] ?? 0
            return (
              <li key={group.id}>
                <Tooltip text={`${label?.hint ?? group.label}. Klick zeigt das Foto.`}>
                  <button
                    type="button"
                    data-testid={`mapillary-hint-${group.id}`}
                    aria-pressed={selectedIndex !== -1}
                    className="rounded px-1.5 py-0.5 text-zinc-200 ring-1 ring-white/20 hover:bg-white/10 aria-pressed:bg-yellow-400/20 aria-pressed:ring-yellow-400/60"
                    onClick={() => {
                      const next = inGroup[(selectedIndex + 1) % inGroup.length]
                      if (next) setSelectedMapFeatureId(next.id)
                    }}
                  >
                    {count}{' '}
                    {count === 1 ? (label?.one ?? group.label) : (label?.many ?? group.label)}
                  </button>
                </Tooltip>
              </li>
            )
          })}
        </ul>
      )}
      {olderCount > 0 ? (
        <p className="pt-1 text-zinc-500" data-testid="mapillary-hints-older">
          {olderCount} ältere {olderCount === 1 ? 'Erkennung' : 'Erkennungen'} (zuletzt vor{' '}
          {seenFromLabel} gesehen) nicht gezählt.
        </p>
      ) : null}
    </div>
  )
}
