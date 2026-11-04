import { describe, expect, it } from 'vitest'
import { getOsmOAuthRedirectUrl } from './osm-auth'

describe('getOsmOAuthRedirectUrl', () => {
  it('builds the land page under the Vite base', () => {
    expect(getOsmOAuthRedirectUrl('http://127.0.0.1:33479', '/')).toBe(
      'http://127.0.0.1:33479/osm-oauth-land.html',
    )
    expect(getOsmOAuthRedirectUrl('https://radnetz-apps.netlify.app', '/knotenpunkte/')).toBe(
      'https://radnetz-apps.netlify.app/knotenpunkte/osm-oauth-land.html',
    )
  })
})
