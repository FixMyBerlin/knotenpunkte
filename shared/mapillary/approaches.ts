import {
  bearingDeg,
  distanceMeters,
  lineLengthMeters,
  pointAlongLine,
  type LngLat,
} from '@osm-editor-kit/street-imagery'

const MIN_LENGTH_METERS = 5
const BEARING_BUCKET_DEG = 20

/**
 * The street lines that leave a junction node, each starting at the node. Lines that pass
 * through the node are split there. Map tiles deliver a street once per tile, so lines leaving
 * in the same direction count once (the longest wins).
 */
export function approachLinesAt(node: LngLat, lines: LngLat[][], toleranceMeters = 15) {
  const fromNode: LngLat[][] = []
  for (const line of lines) {
    let nearest = -1
    let nearestDistance = toleranceMeters
    for (const [index, point] of line.entries()) {
      const distance = distanceMeters(point, node)
      if (distance <= nearestDistance) {
        nearest = index
        nearestDistance = distance
      }
    }
    if (nearest === -1) continue
    fromNode.push(line.slice(nearest), line.slice(0, nearest + 1).reverse())
  }

  const byDirection = new Map<number, { line: LngLat[]; length: number }>()
  for (const line of fromNode) {
    const length = lineLengthMeters(line)
    if (line.length < 2 || length < MIN_LENGTH_METERS) continue
    const onStreet = pointAlongLine(line, Math.min(20, length))
    if (!onStreet) continue
    const bucket =
      Math.round(bearingDeg(node, onStreet.point) / BEARING_BUCKET_DEG) %
      Math.round(360 / BEARING_BUCKET_DEG)
    const known = byDirection.get(bucket)
    if (!known || length > known.length) byDirection.set(bucket, { line, length })
  }
  return [...byDirection.entries()].sort(([a], [b]) => a - b).map(([, entry]) => entry.line)
}
