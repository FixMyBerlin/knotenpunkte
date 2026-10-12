import {
  AGE_BAND_COLORS,
  ageBandColorExpression,
  parseIsoDateStartMs,
  PHOTO_TYPE_COLORS,
  photoTypeColorExpression,
  type DateRange,
  type ProviderId,
} from '@osm-editor-kit/street-imagery'
import { mapillaryCutoffDate } from '@/config/app.const'

export const mapillaryProviders: ProviderId[] = ['mapillary']

export type PhotoColorMode = 'age' | 'type'

export const photoColorModeLabels: Record<PhotoColorMode, string> = {
  age: 'Alter',
  type: 'Fototyp',
}

/** Fixed at load, so the layer paint stays the same between renders. */
const LOADED_AT = Date.now()

type PhotoStyle = {
  expression: typeof photoTypeColorExpression
  legend: { color: string; label: string }[]
}

/** Colour of the photos on the map and its legend (same styles as TILDA). */
export function photoStyle(mode: PhotoColorMode, date: DateRange): PhotoStyle {
  if (mode === 'type') {
    return {
      expression: photoTypeColorExpression,
      legend: [
        { color: PHOTO_TYPE_COLORS.flat, label: 'Klassische Fotos' },
        { color: PHOTO_TYPE_COLORS.panorama, label: '360° Fotos' },
      ],
    }
  }
  // The colours run from the start of the date filter to today, so they fit any filter.
  const cutoff = parseIsoDateStartMs(date.from ?? mapillaryCutoffDate)
  return {
    expression: ageBandColorExpression(cutoff, LOADED_AT) as typeof photoTypeColorExpression,
    legend: [
      { color: AGE_BAND_COLORS.new, label: 'Neueste' },
      { color: AGE_BAND_COLORS.mid, label: 'Mittel' },
      { color: AGE_BAND_COLORS.old, label: 'Ältere' },
      ...(date.from ? [] : [{ color: AGE_BAND_COLORS.outdated, label: 'Vor dem Stichtag' }]),
    ],
  }
}
