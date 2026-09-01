import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AuthorizationService from '@deepseek-ai/dsh-authorization'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import LocalCredentialProvider from '@deepseek-ai/dsh-credentials-local'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { apply, inject, name } from '../src/index.ts'

const CODEX_KEY = credentialKey('llm-pi-ai', 'openai-codex')
const contexts: Context[] = []
const homes: string[] = []

let ownerSequence = 0

function owner(ctx: Context): Agent {
  const session = ctx.sessions.create(SessionId(`lifecycle-${ownerSequence++}`))
  return { id: session.id, session } as Agent
}

async function base(userQuestions: { ask: (request: unknown) => Promise<unknown> } = {
  ask: async () => { throw new Error('unused user question') },
}): Promise<Context> {
  const home = await mkdtemp(join(tmpdir(), 'codex-subscription-lifecycle-'))
  homes.push(home)
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(SessionStore)
  await ctx.plugin(CommandRuntime)
  await ctx.plugin(LocalCredentialProvider, { path: join(home, '.credentials.yaml'), watch: false })
  ctx.provide('userQuestions', userQuestions as never)
  return ctx
}

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  await Promise.all(homes.splice(0).map(home => rm(home, { recursive: true, force: true })))
})

describe('authorization service ownership and lifecycle', () => {
  it('mounts and disposes only the fallback AuthorizationService', async () => {
    const ctx = await base()
    const pluginFiber = await ctx.plugin({ name, inject, apply })
    const owned = ctx.get('authorization')

    expect(owned).toBeDefined()
    await pluginFiber.dispose()
    expect(ctx.get('authorization')).toBeUndefined()
  })

  it('reuses an existing AuthorizationService and never disposes it', async () => {
    const ctx = await base()
    const existingFiber = await ctx.plugin(AuthorizationService)
    const existing = ctx.get('authorization')
    expect(existing).toBeDefined()
    const flowDispose = ctx.authorization.registerFlow({
      key: CODEX_KEY,
      label: 'existing flow',
      methods: [{ id: 'oauth', label: 'Existing OAuth' }],
      run: async () => {},
    })
    const pluginFiber = await ctx.plugin({ name, inject, apply })

    expect(ctx.get('authorization')).toBeDefined()
    expect(ctx.authorization.describe(CODEX_KEY)).toBeDefined()
    await pluginFiber.dispose()
    expect(ctx.get('authorization')).toBeDefined()
    expect(ctx.authorization.describe(CODEX_KEY)).toBeDefined()

    flowDispose()
    await existingFiber.dispose()
    expect(ctx.get('authorization')).toBeUndefined()
  })

  it('maps a real human decline to the fixed cancelled outcome', async () => {
    const ask = vi.fn(async (_request: unknown) => {
      throw Object.assign(new Error('transport contains secret'), { code: 'ASK_CANCELLED' })
    })
    const ctx = await base({ ask })
    await ctx.plugin(AuthorizationService)
    const flowDispose = ctx.authorization.registerFlow({
      key: CODEX_KEY,
      label: 'test flow',
      methods: [{ id: 'oauth', label: 'Test OAuth' }],
      async run(session) {
        await session.prompt({ kind: 'text', message: 'manual code' })
      },
    })
    await ctx.plugin({ name, inject, apply })
    const execution = await ctx.commands.execute(owner(ctx), '/codex-auth', [], new AbortController().signal)

    expect(execution?.result).toEqual({ kind: 'success', text: 'Codex authentication cancelled.' })
    expect(ask).toHaveBeenCalledOnce()
    expect(JSON.stringify(execution)).not.toContain('transport contains secret')
    flowDispose()
  })

  it('maps an empty real free-text answer to the fixed cancelled outcome', async () => {
    const ask = vi.fn(async (_request: unknown) => ({
      answers: [{ id: 'codex-auth', selected: [], custom: ' \t ' }],
    }))
    const ctx = await base({ ask })
    await ctx.plugin(AuthorizationService)
    const flowDispose = ctx.authorization.registerFlow({
      key: CODEX_KEY,
      label: 'test flow',
      methods: [{ id: 'oauth', label: 'Test OAuth' }],
      async run(session) {
        await session.prompt({ kind: 'text', message: 'manual code' })
      },
    })
    await ctx.plugin({ name, inject, apply })

    await expect(ctx.commands.execute(owner(ctx), '/codex-auth', [], new AbortController().signal))
      .resolves.toMatchObject({ result: { kind: 'success', text: 'Codex authentication cancelled.' } })
    flowDispose()
  })

  it('does not log or retain upstream failure details', async () => {
    const ctx = await base()
    const begin = vi.fn(async () => {
      throw new Error('https://auth.example/code=token')
    })
    ctx.provide('authorization', { begin } as never)
    const warn = vi.spyOn(ctx.logger, 'warn')
    const error = vi.spyOn(ctx.logger, 'error')
    await ctx.plugin({ name, inject, apply })
    const actor = owner(ctx)
    const execution = await ctx.commands.execute(actor, '/codex-auth', [], new AbortController().signal)

    expect(execution?.result).toEqual({ kind: 'error', text: 'Codex authentication failed.' })
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    expect(JSON.stringify(execution)).not.toContain('auth.example')
    expect(JSON.stringify(actor.session.events)).not.toContain('auth.example')
    expect(begin).toHaveBeenCalledOnce()
  })
})
