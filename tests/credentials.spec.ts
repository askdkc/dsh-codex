import type { Context } from '@deepseek-ai/cordis'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import { describe, expect, it, vi } from 'vitest'
import { credentialStoreFrom } from '../src/credentials.ts'

// Recent DSH releases no longer export recordKeyFor from this package.
vi.mock('@deepseek-ai/dsh-llm-pi-ai', () => ({}))

describe('credential bridge without internal pi-ai exports', () => {
  it('reads, modifies and deletes the existing llm-pi-ai record address', async () => {
    const key = credentialKey('llm-pi-ai', 'openai-codex')
    const credential = { type: 'api_key' as const, key: 'test-key' }
    const record = { kind: 'api-key', key: 'test-key' }
    const credentials = {
      readRecord: vi.fn(async () => record),
      modifyRecord: vi.fn(async (_key: unknown, mutate: (value: unknown) => unknown) => mutate(record)),
      deleteRecord: vi.fn(async () => {}),
    }
    const store = credentialStoreFrom({ credentials } as unknown as Context)
    expect(await store.read('openai-codex')).toEqual(credential)
    expect(credentials.readRecord).toHaveBeenCalledWith(key)
    expect(await store.modify('openai-codex', async value => value)).toEqual(credential)
    expect(credentials.modifyRecord).toHaveBeenCalledWith(key, expect.any(Function))
    await store.delete('openai-codex')
    expect(credentials.deleteRecord).toHaveBeenCalledWith(key)
  })

  it('rejects invalid ids before accessing storage', async () => {
    const store = credentialStoreFrom({ credentials: {} } as Context)
    expect(await store.read('')).toBeUndefined()
    await expect(store.modify('', async () => undefined)).rejects.toThrow('invalid credential provider id')
    await expect(store.delete('')).resolves.toBeUndefined()
  })
})
