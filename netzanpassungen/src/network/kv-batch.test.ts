import { KvError } from '@shared/kv-client'
import { describe, expect, it } from 'vitest'
import { kvBatchPut } from './kv-batch'

const options = {
  baseUrl: 'https://kv.example/',
  project: 'netzanpassungen',
  apiKey: 'test-key',
  getOsmToken: () => 'token',
}

describe('kvBatchPut', () => {
  it('posts the puts to the batch endpoint with key and token', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fetchStub = async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return Response.json({ put: [], deleted: 0 })
    }
    await kvBatchPut(options, [{ id: 'a:keine-aktion:x', data: { a: 1 }, tags: ['a'] }], fetchStub)
    expect(calls[0]!.url).toBe('https://kv.example/v1/projects/netzanpassungen/batch')
    expect(calls[0]!.init.method).toBe('POST')
    const headers = new Headers(calls[0]!.init.headers)
    expect(headers.get('X-Api-Key')).toBe('test-key')
    expect(headers.get('Authorization')).toBe('Bearer token')
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      put: [{ id: 'a:keine-aktion:x', data: { a: 1 }, tags: ['a'] }],
    })
  })

  it('throws a KvError on a failed response', async () => {
    const fetchStub = async () =>
      Response.json({ error: { code: 'unauthenticated', message: 'login' } }, { status: 401 })
    await expect(kvBatchPut(options, [], fetchStub)).rejects.toBeInstanceOf(KvError)
  })
})
