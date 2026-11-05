import { expect, test, type Page } from '@playwright/test'
import { blockExternalRequests } from '../../shared/e2e/block-external-requests'
import { fixtureEdges, fixtureMarks, fixtureNow } from '../src/stats/fixtures.test-data'

const edgesGeojson = {
  type: 'FeatureCollection',
  features: fixtureEdges.map((edge) => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [13.4, 52.5],
        [13.41, 52.5],
      ],
    },
    properties: {
      lfd_nr: edge.id,
      laenge_m: edge.lengthM,
      bezirk: edge.bezirk,
      account: edge.account,
      strassenname: 'Teststraße',
    },
  })),
}

function kvEntries() {
  return {
    items: fixtureMarks.map((mark) => ({
      id: mark.id,
      data: { done: true },
      tags: [],
      version: 1,
      created_at: mark.createdAt,
      updated_at: mark.createdAt,
      created_by: { osm_uid: 1, display_name: mark.createdBy },
      updated_by: { osm_uid: 1, display_name: mark.createdBy },
    })),
    next_cursor: null,
  }
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'X-Api-Key, Authorization, Content-Type',
}

/** Only the TILDA file and the KV db are stubbed here; every other external request is blocked. */
async function stubNetwork(page: Page, kvStatus = 200) {
  await blockExternalRequests(page.context())
  await page.route(
    (url) =>
      url.hostname === 'key-value-store.fixmycity.workers.dev' || url.hostname === 'tilda-geo.de',
    async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.hostname === 'key-value-store.fixmycity.workers.dev') {
        if (request.method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers: cors })
          return
        }
        if (kvStatus !== 200) {
          await route.fulfill({
            status: kvStatus,
            headers: cors,
            json: { error: { code: 'origin_not_allowed', message: 'Origin not allowed' } },
          })
          return
        }
        await route.fulfill({ headers: cors, json: kvEntries() })
        return
      }
      if (url.pathname.endsWith('infravelo-ren-netz-zuteilung-netz.geojson')) {
        await route.fulfill({
          headers: { ...cors, 'Last-Modified': 'Wed, 04 Nov 2026 09:29:54 GMT' },
          contentType: 'application/geo+json',
          body: request.method() === 'HEAD' ? '' : JSON.stringify(edgesGeojson),
        })
        return
      }
      // PMTiles of the map: not needed for the smoke test.
      await route.abort('blockedbyclient')
    },
  )
}

test.describe('Fortschritt', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(fixtureNow))
  })

  test('Überblick shows the running delivery, the burn-up and the Bezirke', async ({ page }) => {
    await stubNetwork(page)
    await page.goto('/')
    await expect(page.getByTestId('tile-running')).toContainText('50,0 %')
    await expect(page.getByTestId('tile-running')).toContainText('3,0 km von 6,0 km')
    await expect(page.getByTestId('tile-plan')).toContainText('voraus')
    await expect(page.getByTestId('tile-gesamt')).toContainText('70,0 %')
    await expect(page.getByTestId('burnup')).toBeVisible()
    await expect(page.getByTestId('bezirke-table')).toContainText('Neukölln')
    await expect(page.getByTestId('orphan-marks')).toContainText('1 Markierungen ohne Kante')
    await expect(page.getByTestId('stand')).toContainText('04.11.2026, 23:00')

    await page.getByRole('radio', { name: 'Gesamt' }).click()
    await expect(page).toHaveURL(/umfang=gesamt/)
    await expect(page.getByRole('heading', { name: 'Burn-up Gesamt' })).toBeVisible()
  })

  test('Personen shows every account with its Ampel and copies a summary', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await stubNetwork(page)
    await page.goto('/?view=personen')
    await expect(page.getByTestId('account-fmc_7')).toContainText('im Plan')
    await expect(page.getByTestId('account-fmc_7')).toContainText('2,0 km')
    await expect(page.getByTestId('account-fmc_8')).toContainText('fertig')
    await page.getByTestId('copy-summary').click()
    await expect(page.getByText('Kopiert')).toBeVisible()
    const text = await page.evaluate(() => navigator.clipboard.readText())
    expect(text).toContain('fmc_7: 1,0 km von 4,0 km erledigt')
  })

  test('after the deadline of Lieferung 2 the rest stays visible', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2027-03-02T11:00:00Z'))
    await stubNetwork(page)
    await page.goto('/')
    await expect(page.getByTestId('overdue-2')).toContainText('Rückstand Lieferung 2')
    await expect(page.getByTestId('overdue-2')).toContainText('Noch 3,0 km offen von 6,0 km')

    await page.goto('/?view=personen')
    await expect(page.getByTestId('overdue-header')).toContainText('Rückstand L2')
    await expect(page.getByTestId('account-fmc_7').getByTestId('overdue-cell')).toContainText(
      '3,0 km',
    )
    // No edges assigned in Lieferung 3: not "fertig".
    await expect(page.getByTestId('account-fmc_8')).toContainText('nichts zugeteilt')
    await expect(page.getByTestId('account-fmc_8')).not.toContainText('fertig')
  })

  test('Karte keeps its filters in the URL', async ({ page }) => {
    await stubNetwork(page)
    await page.goto('/?view=karte')
    await page.getByRole('radio', { name: 'Lieferung 3' }).click()
    await expect(page).toHaveURL(/umfang=3/)
    await page.getByRole('radio', { name: 'Mapper' }).click()
    await expect(page).toHaveURL(/farbe=mapper/)
    await page.getByTestId('filter-account').selectOption('fmc_7')
    await expect(page).toHaveURL(/account=fmc_7/)
    await expect(page.getByTestId('filter-bezirk')).toContainText('Mitte')
    await expect(page.locator('.maplibregl-canvas')).toBeVisible()
  })

  test('a refused KV request shows a German error', async ({ page }) => {
    await stubNetwork(page, 403)
    await page.goto('/')
    await expect(page.getByTestId('data-error')).toContainText('403')
    await expect(page.getByTestId('data-error')).toContainText('infravelo-tracker')
  })
})
