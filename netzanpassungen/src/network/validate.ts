import { distanceM, nearestOnLine } from './geo'
import { baseNodeNames, edgesAtNode, hostKey, type Network } from './model'
import { virtualNodeNamePattern } from './schema'

export type Issue = {
  level: 'fehler' | 'hinweis'
  message: string
  /** Node or edge key, to select it. */
  target: string
}

/** Ends and virtual nodes count as lying on their node or edge up to this distance. */
const ON_TOLERANCE_M = 0.05

export function validateNetwork(network: Network): Issue[] {
  const issues: Issue[] = []
  const baseNames = baseNodeNames(network.base)
  const seen = new Map<string, string>()

  for (const node of network.virtualNodes) {
    const data = node.stored!.data
    if (!virtualNodeNamePattern.test(node.name)) {
      issues.push({
        level: 'fehler',
        message: `„${node.name}“: Name muss mit V beginnen, nur Buchstaben, Ziffern und Bindestriche`,
        target: node.key,
      })
    }
    if (baseNames.has(node.name) || seen.has(node.name)) {
      issues.push({
        level: 'fehler',
        message: `„${node.name}“ ist doppelt vergeben`,
        target: node.key,
      })
    }
    seen.set(node.name, node.key)

    const host = network.edgeByKey(hostKey(data.traeger))
    if (!host) {
      issues.push({
        level: 'fehler',
        message: `${node.name}: Trägerkante ${data.traeger.ref} fehlt (gelöscht oder nicht in der Datei)`,
        target: node.key,
      })
    } else {
      const nearest = nearestOnLine(host.coords, node.lngLat)
      if (nearest.distanceM > ON_TOLERANCE_M) {
        issues.push({
          level: 'fehler',
          message: `${node.name} liegt ${nearest.distanceM.toFixed(2)} m neben seiner Trägerkante`,
          target: node.key,
        })
      }
    }
    if (edgesAtNode(network, node.key).length === 0) {
      issues.push({
        level: 'hinweis',
        message: `${node.name}: keine neue Kante angeschlossen`,
        target: node.key,
      })
    }
  }

  for (const edge of network.newEdges) {
    const label = edge.stored!.id.slice(0, 8)
    if (edge.from === edge.to) {
      issues.push({
        level: 'fehler',
        message: `Kante ${label}: Anfang und Ende sind derselbe Knoten`,
        target: edge.key,
      })
    }
    if (edge.lengthM < 1) {
      issues.push({
        level: 'fehler',
        message: `Kante ${label} ist kürzer als 1 m`,
        target: edge.key,
      })
    }
    for (const [end, key] of [
      [edge.coords[0]!, edge.from],
      [edge.coords[edge.coords.length - 1]!, edge.to],
    ] as const) {
      const node = key ? network.nodeByKey(key) : undefined
      if (!node) {
        issues.push({
          level: 'fehler',
          message: `Kante ${label}: Endknoten ${key} fehlt`,
          target: edge.key,
        })
      } else if (distanceM(node.lngLat, end) > ON_TOLERANCE_M) {
        issues.push({
          level: 'fehler',
          message: `Kante ${label}: Ende liegt nicht auf ${node.name}`,
          target: edge.key,
        })
      }
    }
  }
  return issues
}
