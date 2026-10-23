import { describe, expect, it } from 'vitest'
import {
  backgroundChoiceId,
  newPrivateRasterId,
  privateRasterDisplayName,
  resolveBackgroundChoice,
} from './private-raster'

describe('privateRasterDisplayName', () => {
  it('drops the scheme and a leading www', () => {
    expect(privateRasterDisplayName('https://www.example.com/tiles/{z}/{x}/{y}.png')).toBe(
      'example.com/tiles/{z}/{x}/{y}.png',
    )
    expect(privateRasterDisplayName('https://tiles.example.com/{z}/{x}/{y}')).toBe(
      'tiles.example.com/{z}/{x}/{y}',
    )
  })
})

describe('resolveBackgroundChoice', () => {
  const rasters = [
    { id: 'private', title: 'Befliegung 2025', url: 'https://a.example/{z}/{x}/{y}' },
    { id: 'private-abc', title: 'Befliegung 2024', url: 'https://b.example/{z}/{x}/{y}' },
  ]

  it('picks the private background by its id', () => {
    expect(resolveBackgroundChoice('private-abc', rasters)).toMatchObject({
      kind: 'private',
      title: 'Befliegung 2024',
    })
    expect(backgroundChoiceId(resolveBackgroundChoice('private-abc', rasters))).toBe('private-abc')
  })

  it('defaults to the first private background, else Positron', () => {
    expect(resolveBackgroundChoice(undefined, rasters)).toMatchObject({ id: 'private' })
    expect(resolveBackgroundChoice(undefined, [])).toEqual({ kind: 'positron' })
  })

  it('falls back to Positron for a private background that was removed', () => {
    expect(resolveBackgroundChoice('private-gone', rasters)).toEqual({ kind: 'positron' })
  })

  it('keeps other ids as Editor Layer Index layers', () => {
    expect(resolveBackgroundChoice('Berlin-2025', rasters)).toEqual({
      kind: 'eli',
      id: 'Berlin-2025',
    })
  })

  it('gives the first private background the old id and later ones their own', () => {
    expect(newPrivateRasterId([])).toBe('private')
    expect(newPrivateRasterId(rasters)).toMatch(/^private-/)
  })
})
