import { describe, expect, it } from 'vitest'
import { privateRasterDisplayName } from './private-raster'

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
