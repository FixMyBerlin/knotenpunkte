import { expect, test } from '@playwright/test'
import { blockExternalRequests } from '../../../shared/e2e/block-external-requests'

/**
 * Knotenpunkte built for the old GitHub Pages origin (`DEPLOY_TARGET=pages`): the move dialog
 * offers the settings of this browser as a download. Not logged in, every external request blocked.
 */
const secretUrl = 'https://tiles.example/{z}/{x}/{y}?key=SECRET-KEY'

test.describe('Umzug dialog on the Pages build', () => {
  test.beforeEach(async ({ page }) => {
    await blockExternalRequests(page.context())
  })

  test('without settings in this browser there is nothing to save', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Knotenpunkte' })).toBeVisible()
    await expect(page.getByTestId('umzug-dialog')).toHaveCount(0)
  })

  test.describe('with settings', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((url) => {
        localStorage.setItem('knotenpunkte-background', '"osm"')
        localStorage.setItem(
          'knotenpunkte-private-rasters',
          JSON.stringify([{ id: 'private', title: 'x', url }]),
        )
        localStorage.setItem('__osmAuth', JSON.stringify({ accessToken: 'e2e-osm-token' }))
        localStorage.setItem('foreign-key', 'x')
      }, secretUrl)
    })

    test('downloads the settings without the OSM login', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByTestId('umzug-backup')).toBeVisible()
      await expect(page.getByTestId('umzug-dialog')).toContainText('private Hintergrund-URLs')

      const downloadPromise = page.waitForEvent('download')
      await page.getByTestId('umzug-download').click()
      const download = await downloadPromise
      expect(download.suggestedFilename()).toBe('knotenpunkte-einstellungen.json')
      const stream = await download.createReadStream()
      let text = ''
      for await (const chunk of stream) text += String(chunk)
      const file = JSON.parse(text) as {
        origin: string
        exported_at: string
        localStorage: Record<string, string>
      }
      expect(file.origin).toBe('http://127.0.0.1:33482')
      expect(Date.parse(file.exported_at)).not.toBeNaN()
      expect(Object.keys(file.localStorage).toSorted()).toEqual([
        'knotenpunkte-background',
        'knotenpunkte-private-rasters',
      ])
      expect(text).not.toContain('e2e-osm-token')
      expect(text).toContain('SECRET-KEY')
    })

    test('"Später erinnern" shows it again after a reload, "Erledigt" does not', async ({
      page,
    }) => {
      await page.goto('/')
      await page.getByTestId('umzug-later').click()
      await expect(page.getByTestId('umzug-dialog')).toHaveCount(0)

      await page.reload()
      await expect(page.getByTestId('umzug-backup')).toBeVisible()

      await page.getByTestId('umzug-done').click()
      await expect(page.getByTestId('umzug-dialog')).toHaveCount(0)
      await page.reload()
      await expect(page.getByRole('heading', { name: 'Knotenpunkte' })).toBeVisible()
      await expect(page.getByTestId('umzug-dialog')).toHaveCount(0)
    })
  })
})
