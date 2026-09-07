import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import yaml from 'js-yaml'
import { Context } from '@deepseek-ai/cordis'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import LocalCredentialProvider from '@deepseek-ai/dsh-credentials-local'
import AuthorizationService from '@deepseek-ai/dsh-authorization'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import { apply as applyLlmPiAi, inject as injectLlmPiAi, name as nameLlmPiAi } from '@deepseek-ai/dsh-llm-pi-ai'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { apply, inject, name } from '../src/index.ts'

const CODEX_KEY = credentialKey('llm-pi-ai', 'openai-codex')
const root = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(root, '..')
const homes: string[] = []
const contexts: Context[] = []

type RecordValue = Record<string, unknown>

function record(value: unknown): RecordValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('expected a YAML mapping')
  }
  return value as RecordValue
}

async function bundleLlmConfig(): Promise<Parameters<typeof applyLlmPiAi>[1]> {
  const source = await readFile(join(packageRoot, 'cordis.patch.yml'), 'utf8')
  const rows = yaml.load(source) as unknown[]
  const llmRow = rows.map(record).find(row => row.id === 'llm-pi-ai')
  if (llmRow === undefined) throw new Error('missing llm-pi-ai bundle row')
  return record(llmRow.config) as Parameters<typeof applyLlmPiAi>[1]
}

function owner(ctx: Context): Agent {
  const session = ctx.sessions.create(SessionId('real-codex-auth'))
  return { id: session.id, session } as Agent
}

afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  await Promise.all(homes.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function harness(options: {
  credential?: unknown
} = {}): Promise<{ ctx: Context; agent: Agent }> {
  const home = await mkdtemp(join(tmpdir(), 'codex-subscription-oauth-'))
  homes.push(home)
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(SessionStore)
  await ctx.plugin(CommandRuntime)
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(LocalCredentialProvider, { path: join(home, '.credentials.yaml'), watch: false })
  if (options.credential !== undefined) {
    await ctx.credentials.modifyRecord(CODEX_KEY, async () => ({
      kind: 'grant',
      payload: options.credential,
    }))
  }
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(AuthorizationService)
  await ctx.plugin({ name: nameLlmPiAi, inject: injectLlmPiAi, apply: applyLlmPiAi }, await bundleLlmConfig())
  await ctx.plugin({ name, inject, apply })
  return { ctx, agent: owner(ctx) }
}

describe('real Cordis authorization composition', () => {
  it('offers GPT-6 Astra from the bundled executable fallback catalog', async () => {
    const { ctx } = await harness()

    await expect(ctx.llm.listModels('openai-codex')).resolves.toMatchObject([
      { id: 'gpt-5.3-codex-spark' },
      { id: 'gpt-5.4' },
      { id: 'gpt-5.4-mini' },
      { id: 'gpt-5.5' },
      { id: 'gpt-5.6-luna' },
      { id: 'gpt-5.6-sol' },
      { id: 'gpt-5.6-terra' },
      { id: 'gpt-6-astra', name: 'GPT-6 Astra', inputModalities: ['text', 'image'] },
    ])
    await expect(ctx.llm.resolveModelInfo('openai-codex', 'gpt-6-astra')).resolves.toEqual({
      provider: 'openai-codex',
      id: 'gpt-6-astra',
      name: 'GPT-6 Astra',
      inputModalities: ['text', 'image'],
      context: { contextWindow: 272000 },
      reasoning: {
        efforts: [
          { id: 'minimal', name: 'Minimal' },
          { id: 'low', name: 'Low' },
          { id: 'medium', name: 'Medium' },
          { id: 'high', name: 'High' },
          { id: 'xhigh', name: 'Xhigh' },
          { id: 'max', name: 'Max' },
        ],
      },
    })
  })

  it('replaces the fallback with the authenticated account-visible intersection', async () => {
    const accountPayload = Buffer.from(JSON.stringify({
      'https://api.openai.com/auth': { chatgpt_account_id: 'account-123' },
    })).toString('base64url')
    const access = `header.${accountPayload}.signature`
    const fetchMock = vi.fn(async (..._args: Parameters<typeof globalThis.fetch>) => new Response(JSON.stringify({
      models: [
        { slug: 'gpt-6-astra', visibility: 'list', supported_in_api: true },
        { slug: 'future-without-transport-metadata', visibility: 'list', supported_in_api: true },
        { slug: 'gpt-5.6-luna', visibility: 'list', supported_in_api: true },
      ],
    }), { status: 200, headers: { etag: '"account-v1"' } }))
    vi.stubGlobal('fetch', fetchMock)
    const { ctx } = await harness({
      credential: {
        type: 'oauth',
        access,
        refresh: 'synthetic-refresh',
        expires: Date.now() + 60 * 60 * 1000,
        accountId: 'account-123',
      },
    })

    await expect(ctx.llm.listModels('openai-codex')).resolves.toMatchObject([
      { id: 'gpt-6-astra' },
      { id: 'gpt-5.6-luna' },
    ])
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: {
        authorization: `Bearer ${access}`,
        'chatgpt-account-id': 'account-123',
      },
    })
  })

  it('registers the real llm-pi-ai Codex flow without entering OAuth', async () => {
    const fetchMock = vi.fn(async () => { throw new Error('NETWORK_FORBIDDEN') })
    vi.stubGlobal('fetch', fetchMock)
    const { ctx } = await harness()

    expect(ctx.authorization.describe(CODEX_KEY)).toMatchObject({
      key: CODEX_KEY,
      methods: [{ id: 'oauth' }],
    })
    expect(fetchMock).not.toHaveBeenCalled()
    await expect(ctx.credentials.readRecord(CODEX_KEY)).resolves.toBeUndefined()
  })
})
