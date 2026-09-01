import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import AuthorizationService from '@deepseek-ai/dsh-authorization'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import LocalCredentialProvider from '@deepseek-ai/dsh-credentials-local'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import type { Agent } from '@deepseek-ai/dsh-agent'

const packageRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const builtModule = pathToFileURL(join(packageRoot, 'lib/index.js')).href
const roots: string[] = []
const contexts: Context[] = []

function owner(ctx: Context): Agent {
  const session = ctx.sessions.create(SessionId('loader-codex-auth'))
  return { id: session.id, session } as Agent
}

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('built artifact Loader activation', () => {
  it('loads the built named-export plugin through a real Include and Loader', async () => {
    const root = await mkdtemp(join(tmpdir(), 'codex-subscription-loader-'))
    roots.push(root)
    const config = join(root, 'cordis.yml')
    await writeFile(config, [
      '- id: session',
      "  name: '@deepseek-ai/dsh-session'",
      '- id: agent',
      "  name: '@deepseek-ai/dsh-agent'",
      '- id: credentials',
      "  name: '@deepseek-ai/dsh-credentials-local'",
      '  config:',
      `    path: ${JSON.stringify(join(root, '.credentials.yaml'))}`,
      '    watch: false',
      '- id: authorization',
      "  name: '@deepseek-ai/dsh-authorization'",
      '- id: commands',
      "  name: '@deepseek-ai/dsh-commands'",
      '- id: user-questions',
      "  name: '@deepseek-ai/dsh-user-questions'",
      `- id: codex-subscription-oauth\n  name: ${JSON.stringify(builtModule)}`,
      '',
    ].join('\n'))

    const ctx = new Context()
    contexts.push(ctx)
    ctx.baseUrl = pathToFileURL(root).href + '/'
    await ctx.plugin(Loader)
    ctx.loader.builtins.include = Include
    const modules = new Map<string, unknown>([
      ['@deepseek-ai/dsh-session', SessionStore],
      ['@deepseek-ai/dsh-agent', AgentRegistry],
      ['@deepseek-ai/dsh-credentials-local', LocalCredentialProvider],
      ['@deepseek-ai/dsh-authorization', AuthorizationService],
      ['@deepseek-ai/dsh-commands', CommandRuntime],
      ['@deepseek-ai/dsh-user-questions', UserQuestionService],
    ])
    ctx.loader.internal = {
      version: 'v2',
      async import(specifier: string) {
        if (specifier === builtModule) return import(builtModule)
        const plugin = modules.get(specifier)
        if (plugin === undefined) throw new Error('unexpected Loader import')
        return plugin
      },
    } as unknown as NonNullable<typeof ctx.loader.internal>

    await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(config).href } })
    await ctx.loader.await()

    const loaded = await import(builtModule)
    expect('default' in loaded).toBe(false)
    expect(ctx.commands.find(owner(ctx), 'codex-auth')).toMatchObject({
      name: 'codex-auth',
      description: 'Sign in to ChatGPT for Codex',
      recordInput: false,
    })
  })
})
