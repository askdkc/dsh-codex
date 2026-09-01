import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import CommandRuntime, { type CommandInvocation } from '@deepseek-ai/dsh-commands'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import type { AuthorizationRequest, AuthorizationInteraction, AuthorizationPrompt } from '@deepseek-ai/dsh-authorization'
import { apply, inject, name } from '../src/index.ts'

const contexts: Context[] = []

function agent(ctx: Context): Agent {
  const session = ctx.sessions.create(SessionId(`codex-auth-${contexts.length}`))
  return { id: session.id, session } as Agent
}

async function mount(options: {
  authorization?: { begin: AuthorizationBegin }
  userQuestions?: { ask: (request: unknown) => Promise<unknown> }
} = {}): Promise<{ ctx: Context; owner: Agent; fiber: Awaited<ReturnType<Context['plugin']>> }> {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(SessionStore)
  await ctx.plugin(CommandRuntime)
  ctx.provide('credentials', {} as never)
  ctx.provide('userQuestions', (options.userQuestions ?? {
    ask: async () => { throw new Error('unused user question') },
  }) as never)
  if (options.authorization !== undefined) ctx.provide('authorization', options.authorization as never)
  const fiber = await ctx.plugin({ name, inject, apply })
  return { ctx, owner: agent(ctx), fiber }
}

function invocation(owner: Agent, signal = new AbortController().signal, rawInput = ''): CommandInvocation {
  return { commandId: 'test-command' as never, agent: owner, rawInput, attachments: [], signal }
}

type AuthorizationBegin = (request: AuthorizationRequest) => Promise<{ status: 'authorized' | 'cancelled' }>

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
})

describe('codex subscription OAuth command', () => {
  it('declares every required activation service', () => {
    expect(inject).toEqual(['commands', 'credentials', 'userQuestions'])
  })

  it('registers the exact command and starts the fixed OAuth request', async () => {
    const begin = vi.fn<AuthorizationBegin>(async () => ({ status: 'authorized' as const }))
    const { ctx, owner, fiber } = await mount({ authorization: { begin } })

    expect(ctx.commands.list(owner)).toEqual([{
      name: 'codex-auth',
      description: 'Sign in to ChatGPT for Codex',
    }])

    const signal = new AbortController().signal
    const execution = await ctx.commands.execute(owner, '/codex-auth', [], signal)

    expect(execution?.result).toEqual({
      kind: 'success',
      text: 'Codex authentication succeeded.',
    })
    expect(begin).toHaveBeenCalledOnce()
    expect(begin.mock.calls[0]?.[0]).toMatchObject({
      key: credentialKey('llm-pi-ai', 'openai-codex'),
      method: 'oauth',
      signal,
      interaction: expect.any(Object),
    })
    expect((begin.mock.calls[0]?.[0] as { interaction: unknown }).interaction).not.toHaveProperty('rawInput')

    await fiber.dispose()
    expect(ctx.commands.find(owner, 'codex-auth')).toBeUndefined()
  })

  it('auto-selects the existing pi-ai browser option', async () => {
    let selected: string | undefined
    const begin = vi.fn(async (request: AuthorizationRequest) => {
      selected = await request.interaction.prompt({
        kind: 'select',
        message: 'How should Codex sign in?',
        options: [{ id: 'browser', label: 'Open browser' }, { id: 'manual', label: 'Manual' }],
      })
      return { status: 'authorized' as const }
    })
    const { ctx, owner } = await mount({ authorization: { begin } })

    const execution = await ctx.commands.execute(owner, '/codex-auth', [], new AbortController().signal)

    expect(execution?.result).toEqual({ kind: 'success', text: 'Codex authentication succeeded.' })
    expect(selected).toBe('browser')
  })

  it('drains a bounded notice queue into the next free-text question', async () => {
    const prompts: unknown[] = []
    const userQuestions = {
      ask: vi.fn(async (request: unknown) => {
        prompts.push(request)
        return { answers: [{ id: 'codex-auth', selected: [], custom: 'manual-code' }] }
      }),
    }
    const begin = vi.fn(async (request: AuthorizationRequest) => {
      for (let index = 0; index < 12; index += 1) {
        request.interaction.notify({
          message: `instruction-${index}`,
          url: `https://auth.example/${index}`,
        })
      }
      await request.interaction.prompt({ kind: 'text', message: 'pi-ai manual code' })
      return { status: 'authorized' as const }
    })
    const { ctx, owner } = await mount({ authorization: { begin }, userQuestions })

    await ctx.commands.execute(owner, '/codex-auth', [], new AbortController().signal)

    const request = prompts[0] as { questions: [{ detail?: string; question: string; options?: unknown[] }] }
    expect(request.questions).toEqual([{
      id: 'codex-auth',
      question: 'Paste the redirect URL or authorization code.',
      detail: [
        'instruction-4\nOpen: https://auth.example/4',
        'instruction-5\nOpen: https://auth.example/5',
        'instruction-6\nOpen: https://auth.example/6',
        'instruction-7\nOpen: https://auth.example/7',
        'instruction-8\nOpen: https://auth.example/8',
        'instruction-9\nOpen: https://auth.example/9',
        'instruction-10\nOpen: https://auth.example/10',
        'instruction-11\nOpen: https://auth.example/11',
      ].join('\n\n'),
    }])
    expect(request.questions[0]?.options).toBeUndefined()
    expect(userQuestions.ask).toHaveBeenCalledOnce()
  })

  it('drops oversized notices while preserving a bounded OAuth URL and aggregate detail', async () => {
    const prompts: Array<{ detail?: string }> = []
    const userQuestions = {
      ask: vi.fn(async (request: unknown) => {
        prompts.push((request as { questions: [{ detail?: string }] }).questions[0] ?? {})
        return { answers: [{ id: 'codex-auth', selected: [], custom: 'manual-code' }] }
      }),
    }
    const oauthUrl = 'https://auth.example/authorize?redirect_uri=http%3A%2F%2Flocalhost%3A1455%2Fcallback&state=keep-me'
    const oversizedChars = 'x'.repeat(4097)
    const oversizedBytes = 'あ'.repeat(3000)
    const begin = vi.fn(async (request: AuthorizationRequest) => {
      request.interaction.notify({ message: oversizedChars, url: 'https://auth.example/dropped-chars' })
      request.interaction.notify({ message: oversizedBytes, url: 'https://auth.example/dropped-bytes' })
      request.interaction.notify({ message: 'OAuth is ready.', url: oauthUrl })
      await request.interaction.prompt({ kind: 'text', message: 'manual code' })
      for (let index = 0; index < 8; index += 1) {
        request.interaction.notify({ message: `aggregate-${index}-${'あ'.repeat(2000)}` })
      }
      await request.interaction.prompt({ kind: 'text', message: 'manual code' })
      return { status: 'authorized' as const }
    })
    const { ctx, owner } = await mount({ authorization: { begin }, userQuestions })

    await ctx.commands.execute(owner, '/codex-auth', [], new AbortController().signal)

    expect(prompts).toHaveLength(2)
    expect(prompts[0]?.detail).toBe(`OAuth is ready.\nOpen: ${oauthUrl}`)
    expect(prompts[0]?.detail).not.toContain(oversizedChars)
    expect(prompts[0]?.detail).not.toContain(oversizedBytes)
    expect(prompts[1]?.detail).toBeDefined()
    expect(prompts[1]?.detail?.length).toBeLessThanOrEqual(16384)
    expect(Buffer.byteLength(prompts[1]?.detail ?? '', 'utf8')).toBeLessThanOrEqual(32768)
    expect(prompts[1]?.detail).toContain('aggregate-7-')
    expect(prompts[1]?.detail).not.toContain('aggregate-0-')
  })

  it('returns manual code verbatim without putting it in command state', async () => {
    const rawCode = '  http://localhost:1455/callback?code=one-time  '
    const userQuestions = {
      ask: vi.fn(async () => ({ answers: [{ id: 'codex-auth', selected: [], custom: rawCode }] })),
    }
    let received: string | undefined
    const begin = vi.fn(async (request: AuthorizationRequest) => {
      received = await request.interaction.prompt({ kind: 'text', message: 'manual code' })
      return { status: 'authorized' as const }
    })
    const { ctx, owner } = await mount({ authorization: { begin }, userQuestions })

    const execution = await ctx.commands.execute(owner, '/codex-auth', [], new AbortController().signal)

    expect(received).toBe(rawCode)
    expect(execution?.result).toEqual({ kind: 'success', text: 'Codex authentication succeeded.' })
    expect(JSON.stringify(owner.session.events)).not.toContain(rawCode)
    expect(JSON.stringify(execution)).not.toContain(rawCode)
    expect(owner.session.deriveMessages()).toEqual([])
    expect(JSON.stringify(userQuestions)).not.toContain(rawCode)
  })

  it('does not turn a browser callback abort of the manual prompt into a decline', async () => {
    const promptController = new AbortController()
    const userQuestions = {
      ask: vi.fn(async (request: unknown) => {
        const signal = (request as { signal: AbortSignal }).signal
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(Object.assign(
            new Error('question withdrawn'), { code: 'ASK_ABORTED' },
          )), { once: true })
        })
      }),
    }
    let promptFailure: unknown
    const begin = vi.fn(async (request: AuthorizationRequest) => {
      await request.interaction.prompt({ kind: 'text', message: 'manual code', signal: promptController.signal })
        .catch(error => { promptFailure = error })
      return { status: 'authorized' as const }
    })
    const { ctx, owner } = await mount({ authorization: { begin }, userQuestions })
    const execution = ctx.commands.execute(owner, '/codex-auth', [], new AbortController().signal)
    promptController.abort()

    await expect(execution).resolves.toMatchObject({ result: { kind: 'success' } })
    expect(promptFailure).toMatchObject({ code: 'ASK_ABORTED' })
  })

  it('maps ASK_CANCELLED and an empty answer to AuthorizationDeclinedError', async () => {
    const cases = [
      { ask: vi.fn(async () => { throw Object.assign(new Error('contains a code'), { code: 'ASK_CANCELLED' }) }) },
      { ask: vi.fn(async () => ({ answers: [{ id: 'codex-auth', selected: [], custom: '   ' }] })) },
    ]
    for (const userQuestions of cases) {
      let observed: unknown
      const begin = vi.fn(async (request: AuthorizationRequest) => {
        try {
          await request.interaction.prompt({ kind: 'text', message: 'manual code' })
        } catch (error) {
          observed = error
          throw error
        }
        return { status: 'authorized' as const }
      })
      const { ctx, owner } = await mount({ authorization: { begin }, userQuestions })
      const execution = await ctx.commands.execute(owner, '/codex-auth', [], new AbortController().signal)

      expect(execution?.result).toEqual({ kind: 'error', text: 'Codex authentication failed.' })
      expect(observed).toMatchObject({ name: 'AuthorizationDeclinedError', code: 'DECLINED' })
    }
  })

  it('fails closed for unsupported secret and select prompt shapes', async () => {
    for (const prompt of [
      { kind: 'secret', message: 'secret' } as const,
      { kind: 'select', message: 'choice', options: [{ id: 'manual', label: 'Manual' }] } as const,
    ]) {
      let observed: unknown
      const begin = vi.fn(async (request: AuthorizationRequest) => {
        try {
          await request.interaction.prompt(prompt)
        } catch (error) {
          observed = error
          throw error
        }
        return { status: 'authorized' as const }
      })
      const { ctx, owner } = await mount({ authorization: { begin } })
      const execution = await ctx.commands.execute(owner, '/codex-auth', [], new AbortController().signal)

      expect(execution?.result).toEqual({ kind: 'error', text: 'Codex authentication failed.' })
      expect(observed).toBeInstanceOf(Error)
      expect((observed as Error).message).toMatch(/^Codex authentication cannot handle/)
    }
  })

  it('returns fixed usage, cancellation, and generic failure outcomes', async () => {
    const begin = vi.fn<AuthorizationBegin>(async () => ({ status: 'cancelled' as const }))
    const { ctx, owner } = await mount({ authorization: { begin } })

    await expect(ctx.commands.execute(owner, '/codex-auth unexpected', [], new AbortController().signal))
      .resolves.toMatchObject({ result: { kind: 'error', text: 'Usage: /codex-auth' } })
    const abortedSignal = AbortSignal.abort(new Error('secret abort reason'))
    const abortedDefinition = ctx.commands.find(owner, 'codex-auth')
    if (abortedDefinition === undefined) throw new Error('missing codex-auth definition')
    await expect(abortedDefinition.handler(invocation(owner, abortedSignal)))
      .resolves.toEqual({ kind: 'success', text: 'Codex authentication cancelled.' })
    await expect(ctx.commands.execute(owner, '/codex-auth', [], new AbortController().signal))
      .resolves.toMatchObject({ result: { kind: 'success', text: 'Codex authentication cancelled.' } })

    begin.mockRejectedValueOnce(new Error('upstream token=secret'))
    const failed = await ctx.commands.execute(owner, '/codex-auth', [], new AbortController().signal)
    expect(failed?.result).toEqual({ kind: 'error', text: 'Codex authentication failed.' })
    expect(JSON.stringify(owner.session.events)).not.toContain('upstream token=secret')
    expect(JSON.stringify(failed)).not.toContain('upstream token=secret')
  })

  it('keeps notice queues isolated between concurrent plugin contexts', async () => {
    const seen: unknown[] = []
    const make = (message: string) => ({
      begin: vi.fn(async (request: AuthorizationRequest) => {
        request.interaction.notify({ message })
        await request.interaction.prompt({ kind: 'text', message: 'manual' })
        return { status: 'authorized' as const }
      }),
    })
    const firstQuestions = { ask: vi.fn(async (request: unknown) => {
      seen.push(request)
      return { answers: [{ id: 'codex-auth', selected: [], custom: 'first' }] }
    }) }
    const secondQuestions = { ask: vi.fn(async (request: unknown) => {
      seen.push(request)
      return { answers: [{ id: 'codex-auth', selected: [], custom: 'second' }] }
    }) }
    const first = await mount({ authorization: make('first notice'), userQuestions: firstQuestions })
    const second = await mount({ authorization: make('second notice'), userQuestions: secondQuestions })

    await Promise.all([
      first.ctx.commands.execute(first.owner, '/codex-auth', [], new AbortController().signal),
      second.ctx.commands.execute(second.owner, '/codex-auth', [], new AbortController().signal),
    ])

    expect((seen[0] as { questions: [{ detail: string }] }).questions[0]?.detail).toBe('first notice')
    expect((seen[1] as { questions: [{ detail: string }] }).questions[0]?.detail).toBe('second notice')
  })
})
