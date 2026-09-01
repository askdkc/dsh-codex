import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
const homes: string[] = []
const contexts: Context[] = []

function owner(ctx: Context): Agent {
  const session = ctx.sessions.create(SessionId('real-codex-auth'))
  return { id: session.id, session } as Agent
}

afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  await Promise.all(homes.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function harness(): Promise<{ ctx: Context; agent: Agent }> {
  const home = await mkdtemp(join(tmpdir(), 'codex-subscription-oauth-'))
  homes.push(home)
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(SessionStore)
  await ctx.plugin(CommandRuntime)
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(LocalCredentialProvider, { path: join(home, '.credentials.yaml'), watch: false })
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(AuthorizationService)
  await ctx.plugin({ name: nameLlmPiAi, inject: injectLlmPiAi, apply: applyLlmPiAi }, { providers: { 'openai-codex': {} } })
  await ctx.plugin({ name, inject, apply })
  return { ctx, agent: owner(ctx) }
}

describe('real Cordis authorization composition', () => {
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
