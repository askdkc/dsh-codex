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
import {
  apply as applyLlmPiAi,
  Config as LlmPiAiConfig,
  inject as injectLlmPiAi,
  name as nameLlmPiAi,
  type Options as LlmPiAiOptions,
} from '@deepseek-ai/dsh-llm-pi-ai'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import { openaiCodexProvider } from '@earendil-works/pi-ai/providers/openai-codex'
import { withSupplementalCodexModels } from '../src/models.ts'
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
  return LlmPiAiConfig(record(llmRow.config) as unknown as LlmPiAiOptions)
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
  it('publishes and resolves the installed fallback catalog without credentials', async () => {
    const { ctx } = await harness()
    const fallback = withSupplementalCodexModels(openaiCodexProvider().getModels())
    const listed = await ctx.llm.listModels('openai-codex')
    expect(listed.map(model => model.id)).toEqual(fallback.map(model => model.id))
    for (const model of fallback) {
      await expect(ctx.llm.resolveModelInfo('openai-codex', model.id)).resolves.toMatchObject({
        provider: 'openai-codex', id: model.id, name: model.name,
        inputModalities: model.input, context: { contextWindow: model.contextWindow },
      })
    }
  })

  it('replaces the fallback with the authenticated account-visible list', async () => {
    const accountPayload = Buffer.from(JSON.stringify({
      'https://api.openai.com/auth': { chatgpt_account_id: 'account-123' },
    })).toString('base64url')
    const access = `header.${accountPayload}.signature`
    const slugs = ['preview-model', 'newly-released-model']
    const fetchMock = vi.fn(async (..._args: Parameters<typeof globalThis.fetch>) => new Response(JSON.stringify({
      models: slugs.map(slug => ({ slug, visibility: 'list' })),
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

    const listed = await ctx.llm.listModels('openai-codex')
    expect(listed.map(model => model.id)).toEqual(slugs)
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
