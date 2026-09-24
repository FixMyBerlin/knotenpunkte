import { expect, test, type Page } from '@playwright/test'

async function createProjectAndStageFile(page: Page, name: string, fixturePath: string) {
  await page.getByTestId('create-project-toggle').click()
  await page.getByTestId('dataset-name-input').fill(name)
  await page.getByTestId('create-project').click()
  await expect(page.getByTestId('dataset-row-' + name)).toBeVisible()
  await page.getByTestId('nodes-file-input').setInputFiles(fixturePath)
  await expect(page.getByTestId('import-dataset')).toBeEnabled()
}

const kvOrigin = 'https://key-value-store.fixmycity.workers.dev'

type KvUser = { osm_uid: number; display_name: string }
type KvEntry = {
  id: string
  data: unknown
  tags: string[]
  version: number
  created_at: string
  updated_at: string
  created_by: KvUser
  updated_by: KvUser
}

const dummyUser: KvUser = { osm_uid: 1, display_name: 'e2e' }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Api-Key',
}

function parseKvUrl(raw: string) {
  const withoutQuery = raw.split('?')[0] ?? raw
  if (withoutQuery.endsWith('/v1/health')) return { type: 'health' as const }
  if (withoutQuery.endsWith('/me')) return { type: 'me' as const }
  if (withoutQuery.endsWith('/tags')) return { type: 'tags' as const }
  const marker = '/entries'
  const idx = withoutQuery.lastIndexOf(marker)
  if (idx === -1) return { type: 'unknown' as const }
  const after = withoutQuery.slice(idx + marker.length)
  if (after === '' || after === '/') return { type: 'collection' as const }
  return { type: 'entry' as const, id: decodeURIComponent(after.replace(/^\//, '')) }
}

test.describe('rating flow', () => {
  test.beforeEach(async ({ page }) => {
    const saved = new Map<string, KvEntry>()

    await page.addInitScript(() => {
      localStorage.setItem('__osmAuth', JSON.stringify({ accessToken: 'e2e-osm-token' }))
    })

    await page.route(`${kvOrigin}/**`, async (route) => {
      const request = route.request()
      const method = request.method()
      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders, body: '' })
        return
      }

      const parsed = parseKvUrl(request.url())
      if (parsed.type === 'health' && method === 'GET') {
        await route.fulfill({ headers: corsHeaders, json: { ok: true } })
        return
      }
      if (parsed.type === 'me' && method === 'GET') {
        await route.fulfill({
          headers: corsHeaders,
          json: { user: dummyUser, can_write: true },
        })
        return
      }
      if (parsed.type === 'me' && method === 'DELETE') {
        await route.fulfill({ status: 204, headers: corsHeaders, body: '' })
        return
      }
      if (parsed.type === 'tags' && method === 'GET') {
        const counts = new Map<string, number>()
        for (const entry of saved.values()) {
          for (const tag of entry.tags) {
            counts.set(tag, (counts.get(tag) ?? 0) + 1)
          }
        }
        const tags = [...counts.entries()].map(([tag, count]) => ({ tag, count }))
        await route.fulfill({ headers: corsHeaders, json: { tags } })
        return
      }
      if (parsed.type === 'collection' && method === 'GET') {
        const tag = new URL(request.url()).searchParams.get('tag')
        const items = [...saved.values()].filter((entry) => (tag ? entry.tags.includes(tag) : true))
        await route.fulfill({ headers: corsHeaders, json: { items, next_cursor: null } })
        return
      }
      if (parsed.type === 'entry' && method === 'PUT') {
        const body = request.postDataJSON() as { data: unknown; tags?: string[] }
        const now = '2026-01-01T00:00:00.000Z'
        const entry: KvEntry = {
          id: parsed.id,
          data: body.data,
          tags: body.tags ?? [],
          version: 1,
          created_at: now,
          updated_at: now,
          created_by: dummyUser,
          updated_by: dummyUser,
        }
        saved.set(parsed.id, entry)
        await route.fulfill({ headers: corsHeaders, json: entry })
        return
      }
      if (parsed.type === 'entry' && method === 'DELETE') {
        saved.delete(parsed.id)
        await route.fulfill({ status: 204, headers: corsHeaders, body: '' })
        return
      }
      if (parsed.type === 'entry' && method === 'GET') {
        const entry = saved.get(parsed.id)
        if (!entry) {
          await route.fulfill({
            status: 404,
            headers: corsHeaders,
            json: { error: { code: 'not_found', message: 'not found' } },
          })
          return
        }
        await route.fulfill({ headers: corsHeaders, json: entry })
        return
      }

      await route.fulfill({
        status: 404,
        headers: corsHeaders,
        json: { error: { code: 'not_found', message: 'unhandled mock route' } },
      })
    })
  })

  test('imports the sample nodes, rates the first node, and advances progress', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Knotenpunkte' })).toBeVisible()

    await createProjectAndStageFile(
      page,
      'berlin-sample',
      'public/fixtures/berlin-nodes-sample.geojson',
    )
    await page.getByTestId('import-dataset').click()
    await expect(page.getByTestId('progress-summary')).toContainText('0/4 Knoten')
    await expect(page.getByTestId('selected-node-id')).toHaveText('Knoten 32580001')

    await page.getByTestId('attr-KP_HVS-1').click()
    await page.getByTestId('attr-LSA_KP-0').click()
    await page.getByTestId('attr-Mar_RVF_KP-keine').click()
    await page.getByTestId('attr-Furt_rot-teilweise').click()
    await page.getByTestId('attr-RFS_Mitte-gänzlich').click()
    await page.getByTestId('attr-Fl_Linksab-keine').click()
    await page.getByTestId('attr-vorgez_Fl-teilweise').click()
    await page.getByTestId('save-next').click()

    await expect(page.getByTestId('progress-summary')).toContainText('1/4 Knoten')
    await expect(page.getByTestId('selected-node-id')).toHaveText('Knoten 32580002')
  })

  test('imports suggestions and prefills a value', async ({ page }) => {
    await page.goto('/')
    await createProjectAndStageFile(
      page,
      'berlin-sample',
      'public/fixtures/berlin-nodes-sample.geojson',
    )
    await page
      .getByTestId('suggestions-file-input')
      .setInputFiles('public/fixtures/berlin-suggestions-sample.json')
    await expect(page.getByTestId('import-suggestions')).toBeEnabled()
    await page.getByTestId('import-suggestions').click()
    await page.getByTestId('import-dataset').click()

    await expect(page.getByTestId('selected-node-id')).toHaveText('Knoten 32580001')
    await expect(page.getByTestId('attr-Furt_rot-teilweise')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByTestId('suggestion-Furt_rot')).toBeVisible()
  })
})
