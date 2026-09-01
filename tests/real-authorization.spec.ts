import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import AuthorizationService, { type AuthorizationSession } from '@deepseek-ai/dsh-authorization'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import LocalCredentialProvider from '@deepseek-ai/dsh-credentials-local'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import { apply, inject, name } from '../src/index.ts'

const CODEX_KEY = credentialKey('llm-pi-ai', 'openai-codex')
const REDIRECT_TEXT = 'http://localhost:1455/callback?code=SYNTHETIC_REDIRECT_CODE&state=SYNTHETIC_STATE'
const ACCESS_TOKEN = 'SYNTHETIC_ACCESS_TOKEN'
const REFRESH_TOKEN = 'SYNTHETIC_REFRESH_TOKEN'
const contexts: Context[] = []
const homes: string[] = []

function owner(ctx: Context): Agent {
  const session = ctx.sessions.create(SessionId('real-codex-auth'))
  return { id: session.id, session } as Agent
}

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  await Promise.all(homes.splice(0).map(home => rm(home, { recursive: true, force: true })))
})

describe('real AuthorizationService codex-auth composition', () => {
  it('runs /codex-auth through a deterministic browser/manual flow and confirms the commit', async () => {
    const home = await mkdtemp(join(tmpdir(), 'codex-subscription-real-auth-'))
    homes.push(home)
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(SessionStore)
    await ctx.plugin(CommandRuntime)
    await ctx.plugin(LocalCredentialProvider, { path: join(home, '.credentials.yaml'), watch: false })
    await ctx.plugin(AuthorizationService)

    let selected: string | undefined
    let redirect: string | undefined
    const questions: unknown[] = []
    const ask = vi.fn(async (request: unknown) => {
      questions.push(request)
      return { answers: [{ id: 'codex-auth', selected: [], custom: REDIRECT_TEXT }] }
    })
    ctx.provide('userQuestions', { ask } as never)

    const flowDispose = ctx.authorization.registerFlow({
      key: CODEX_KEY,
      label: 'Synthetic Codex OAuth',
      methods: [{ id: 'oauth', label: 'Synthetic browser OAuth' }],
      async run(session: AuthorizationSession) {
        selected = await session.prompt({
          kind: 'select',
          message: 'Choose the browser sign-in method.',
          options: [{ id: 'browser', label: 'Open browser' }, { id: 'manual', label: 'Manual' }],
        })
        session.notify({
          message: 'Synthetic authorization page is ready.',
          url: 'https://auth.example/synthetic-start',
        })
        redirect = await session.prompt({ kind: 'text', message: 'Paste the redirect URL.' })
        await ctx.credentials.modifyRecord(CODEX_KEY, async () => ({
          kind: 'grant',
          payload: {
            accessToken: ACCESS_TOKEN,
            refreshToken: REFRESH_TOKEN,
            redirect,
          },
        }))
      },
    })

    const pluginFiber = await ctx.plugin({ name, inject, apply })
    const actor = owner(ctx)
    const execution = await ctx.commands.execute(actor, '/codex-auth', [], new AbortController().signal)

    expect(execution?.result).toEqual({ kind: 'success', text: 'Codex authentication succeeded.' })
    expect(selected).toBe('browser')
    expect(redirect).toBe(REDIRECT_TEXT)
    expect(ask).toHaveBeenCalledOnce()
    expect(questions[0]).toMatchObject({
      questions: [{
        id: 'codex-auth',
        detail: 'Synthetic authorization page is ready.\nOpen: https://auth.example/synthetic-start',
      }],
    })
    await expect(ctx.credentials.readRecord(CODEX_KEY)).resolves.toEqual({
      kind: 'grant',
      payload: {
        accessToken: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
        redirect: REDIRECT_TEXT,
      },
    })
    await expect(ctx.credentials.describeRecord(CODEX_KEY)).resolves.toMatchObject({
      configured: true,
      kind: 'grant',
      writable: true,
    })

    const output = JSON.stringify(execution)
    const sessionOutput = JSON.stringify(actor.session.events)
    for (const sensitive of [ACCESS_TOKEN, REFRESH_TOKEN, REDIRECT_TEXT]) {
      expect(output).not.toContain(sensitive)
      expect(sessionOutput).not.toContain(sensitive)
    }
    expect(actor.session.deriveMessages()).toEqual([])
    expect(ctx.commands.find(actor, 'codex-auth')).toMatchObject({ recordInput: false })

    flowDispose()
    await pluginFiber.dispose()
    expect(ctx.commands.find(actor, 'codex-auth')).toBeUndefined()
    expect(ctx.authorization.describe(CODEX_KEY)).toBeUndefined()
  })
})
