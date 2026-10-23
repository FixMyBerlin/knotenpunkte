export type LngLat = [number, number]

const EARTH_RADIUS_M = 6_371_008.8
const RAD = Math.PI / 180

/** Distance in metres. Equirectangular at the mean latitude: exact enough within a city. */
export function distanceM(a: LngLat, b: LngLat) {
  const dx = (b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * RAD) * RAD * EARTH_RADIUS_M
  const dy = (b[1] - a[1]) * RAD * EARTH_RADIUS_M
  return Math.hypot(dx, dy)
}

export function lineLengthM(coords: LngLat[]) {
  let length = 0
  for (let index = 1; index < coords.length; index++) {
    length += distanceM(coords[index - 1]!, coords[index]!)
  }
  return length
}

export type NearestOnLine = {
  point: LngLat
  distanceM: number
  /** Metres from the first point of the line. */
  stationM: number
  /** Index of the segment's first point. */
  segmentIndex: number
}

/** Nearest point on a line, projected in a plane around `target`. */
export function nearestOnLine(coords: LngLat[], target: LngLat): NearestOnLine {
  const kx = Math.cos(target[1] * RAD) * RAD * EARTH_RADIUS_M
  const ky = RAD * EARTH_RADIUS_M
  let best: NearestOnLine = {
    point: coords[0]!,
    distanceM: Infinity,
    stationM: 0,
    segmentIndex: 0,
  }
  let stationAtStart = 0
  for (let index = 1; index < coords.length; index++) {
    const a = coords[index - 1]!
    const b = coords[index]!
    const ax = (a[0] - target[0]) * kx
    const ay = (a[1] - target[1]) * ky
    const bx = (b[0] - target[0]) * kx
    const by = (b[1] - target[1]) * ky
    const dx = bx - ax
    const dy = by - ay
    const lengthSquared = dx * dx + dy * dy
    const t =
      lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared))
    const px = ax + t * dx
    const py = ay + t * dy
    const distance = Math.hypot(px, py)
    const segmentLength = distanceM(a, b)
    if (distance < best.distanceM) {
      best = {
        point: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])],
        distanceM: distance,
        stationM: stationAtStart + t * segmentLength,
        segmentIndex: index - 1,
      }
    }
    stationAtStart += segmentLength
  }
  return best
}

/** The point `stationM` metres along the line (clamped to its ends). */
export function pointAtStation(coords: LngLat[], stationM: number): LngLat {
  if (stationM <= 0) return coords[0]!
  let walked = 0
  for (let index = 1; index < coords.length; index++) {
    const a = coords[index - 1]!
    const b = coords[index]!
    const segmentLength = distanceM(a, b)
    if (walked + segmentLength >= stationM && segmentLength > 0) {
      const t = (stationM - walked) / segmentLength
      return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]
    }
    walked += segmentLength
  }
  return coords[coords.length - 1]!
}

/** The part of the line between two stations, `fromM < toM`, with the cut points as ends. */
export function sliceLine(coords: LngLat[], fromM: number, toM: number): LngLat[] {
  const result: LngLat[] = [pointAtStation(coords, fromM)]
  let walked = 0
  for (let index = 1; index < coords.length; index++) {
    walked += distanceM(coords[index - 1]!, coords[index]!)
    if (walked > fromM && walked < toM) result.push(coords[index]!)
  }
  result.push(pointAtStation(coords, toM))
  return result
}

/** Ground metres of one screen pixel (512 px tiles, as in MapLibre). */
export function metersPerPixel(zoom: number, lat: number) {
  return (40_075_016.686 * Math.cos(lat * RAD)) / 2 ** (zoom + 9)
}
