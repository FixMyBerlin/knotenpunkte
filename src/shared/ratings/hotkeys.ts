import type { RapidAttributeKey, RapidValue } from '@/shared/ratings/schema'

export const binaryHotkeys = {
  KP_HVS: { 0: 'Q', 1: 'W' },
  LSA_KP: { 0: 'A', 1: 'S' },
} as const

export const ternaryHotkeys = {
  Mar_RVF_KP: { keine: '1', teilweise: '2', gänzlich: '3' },
  Furt_rot: { keine: '4', teilweise: '5', gänzlich: '6' },
  RFS_Mitte: { keine: '7', teilweise: '8', gänzlich: '9' },
  Fl_Linksab: { keine: 'E', teilweise: 'R', gänzlich: 'T' },
  vorgez_Fl: { keine: 'D', teilweise: 'F', gänzlich: 'G' },
} as const

export const skipHotkey = 'X' as const
export const previousHotkey = 'J' as const
export const nextHotkey = 'K' as const

export const rapidHotkeyBindings = [
  { hotkey: 'Q', attribute: 'KP_HVS', value: 0 },
  { hotkey: 'W', attribute: 'KP_HVS', value: 1 },
  { hotkey: 'A', attribute: 'LSA_KP', value: 0 },
  { hotkey: 'S', attribute: 'LSA_KP', value: 1 },
  { hotkey: '1', attribute: 'Mar_RVF_KP', value: 'keine' },
  { hotkey: '2', attribute: 'Mar_RVF_KP', value: 'teilweise' },
  { hotkey: '3', attribute: 'Mar_RVF_KP', value: 'gänzlich' },
  { hotkey: '4', attribute: 'Furt_rot', value: 'keine' },
  { hotkey: '5', attribute: 'Furt_rot', value: 'teilweise' },
  { hotkey: '6', attribute: 'Furt_rot', value: 'gänzlich' },
  { hotkey: '7', attribute: 'RFS_Mitte', value: 'keine' },
  { hotkey: '8', attribute: 'RFS_Mitte', value: 'teilweise' },
  { hotkey: '9', attribute: 'RFS_Mitte', value: 'gänzlich' },
  { hotkey: 'E', attribute: 'Fl_Linksab', value: 'keine' },
  { hotkey: 'R', attribute: 'Fl_Linksab', value: 'teilweise' },
  { hotkey: 'T', attribute: 'Fl_Linksab', value: 'gänzlich' },
  { hotkey: 'D', attribute: 'vorgez_Fl', value: 'keine' },
  { hotkey: 'F', attribute: 'vorgez_Fl', value: 'teilweise' },
  { hotkey: 'G', attribute: 'vorgez_Fl', value: 'gänzlich' },
] as const

export function hotkeyFor(attribute: RapidAttributeKey, value: RapidValue) {
  if (attribute === 'KP_HVS' || attribute === 'LSA_KP') {
    return binaryHotkeys[attribute][value as 0 | 1]
  }
  return ternaryHotkeys[attribute][value as 'keine' | 'teilweise' | 'gänzlich']
}
