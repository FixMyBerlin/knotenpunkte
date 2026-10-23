import { describe, expect, it } from 'vitest'
import { getOsmOAuthRedirectUrl } from './osm-auth'

describe('getOsmOAuthRedirectUrl', () => {
  it('builds the land page under the Vite base', () => {
    expect(getOsmOAuthRedirectUrl('http://127.0.0.1:33479', '/')).toBe(
      'http://127.0.0.1:33479/osm-oauth-land.html',
    )
    expect(getOsmOAuthRedirectUrl('https://fixmyberlin.github.io', '/knotenpunkte/')).toBe(
      'https://fixmyberlin.github.io/knotenpunkte/osm-oauth-land.html',
    )
  })
})
