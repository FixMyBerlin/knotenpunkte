import { describe, expect, it } from 'vitest'
import { backgroundShortName } from './background-short-name'

describe('backgroundShortName', () => {
  it('uses the year in the name', () => {
    expect(backgroundShortName('Berlin-2025', 'Berlin aerial photography 2025')).toBe('2025')
    expect(
      backgroundShortName('x', 'Geoportal Berlin/Digitale farbige Orthophotos 2023 (DOP20RGB)'),
    ).toBe('2023')
  })

  it('shortens a name without a year', () => {
    expect(backgroundShortName('Bing', 'Bing aerial imagery')).toBe('Bing aeri…')
    expect(backgroundShortName('Esri', 'Esri')).toBe('Esri')
  })

  it('names the two built-in backgrounds', () => {
    expect(backgroundShortName('positron', 'OpenFreeMap Positron')).toBe('Karte')
    expect(backgroundShortName('private', 'example.org/{z}/{x}/{y}.png')).toBe('Privat')
  })
})
