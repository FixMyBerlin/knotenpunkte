import { streetsPmtilesUrl } from '@/config/app.const'

export const STREETS_SOURCE_LAYER = 'default'

export const streetsLineColor: [
  'match',
  ['get', 'strassenklasse1'],
  'I',
  '#194294',
  'II',
  '#4498F8',
  'III',
  '#EA3323',
  'IV',
  '#3D5C17',
  'V',
  '#75FB4C',
  '#000',
] = [
  'match',
  ['get', 'strassenklasse1'],
  'I',
  '#194294',
  'II',
  '#4498F8',
  'III',
  '#EA3323',
  'IV',
  '#3D5C17',
  'V',
  '#75FB4C',
  '#000',
]

export const streetsLegend = [
  { id: 'I', name: 'StEP I: großräumige Straßenverbindung', color: '#194294' },
  { id: 'II', name: 'StEP II: übergeordnete Straßenverbindung', color: '#4498F8' },
  { id: 'III', name: 'StEP III: örtliche Straßenverbindung', color: '#EA3323' },
  { id: 'IV', name: 'StEP IV: Ergänzungstraßen', color: '#3D5C17' },
  { id: 'V', name: 'V: Keine StEP Stufe', color: '#75FB4C' },
] as const

export function streetsSourceUrl() {
  return `pmtiles://${streetsPmtilesUrl}`
}
