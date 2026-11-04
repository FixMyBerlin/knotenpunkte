import type { BrowserContext } from '@playwright/test'

/** Smallest valid MapLibre style: a plain background, no tiles, no sprite, no fonts. */
const emptyStyle = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#eceff1' } }],
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
}

const localHosts = new Set(['127.0.0.1', 'localhost'])

/**
 * Keeps the e2e run offline: every request that does not go to the dev server is answered here and
 * never leaves the machine. The OpenFreeMap style is replaced by an empty style (fonts and Mapillary
 * tiles answer with empty protobuf), everything else is aborted.
 *
 * Call it first in `beforeEach`; routes registered later (on the page) take precedence, so tests
 * can still stub their own APIs.
 */
export async function blockExternalRequests(context: BrowserContext) {
  await context.route(
    (url) => !localHosts.has(url.hostname),
    async (route) => {
      const url = new URL(route.request().url())
      if (url.hostname === 'tiles.openfreemap.org') {
        if (url.pathname.startsWith('/styles/')) {
          await route.fulfill({
            headers: { 'Access-Control-Allow-Origin': '*' },
            json: emptyStyle,
          })
          return
        }
        if (url.pathname.startsWith('/fonts/')) {
          await route.fulfill({
            headers: { 'Access-Control-Allow-Origin': '*' },
            contentType: 'application/x-protobuf',
            body: '',
          })
          return
        }
      }
      if (url.hostname === 'tiles.mapillary.com' && url.pathname.startsWith('/maps/vtp/')) {
        await route.fulfill({
          headers: { 'Access-Control-Allow-Origin': '*' },
          contentType: 'application/x-protobuf',
          body: '',
        })
        return
      }
      await route.abort('blockedbyclient')
    },
  )
}
