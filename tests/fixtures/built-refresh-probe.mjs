import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import AuthorizationService from '@deepseek-ai/dsh-authorization'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import LocalCredentialProvider from '@deepseek-ai/dsh-credentials-local'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import {
  apply as applyPiAi,
  inject as injectPiAi,
  name as namePiAi,
} from '@deepseek-ai/dsh-llm-pi-ai'
import SessionStore from '@deepseek-ai/dsh-session'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import * as builtPlugin from '../../lib/index.js'

const CODEX_KEY = credentialKey('llm-pi-ai', 'openai-codex')
const temporaryRoot = await mkdtemp(join(tmpdir(), 'dsh-codex-built-refresh-'))
const ctx = new Context()

try {
  const accountPayload = Buffer.from(JSON.stringify({
    'https://api.openai.com/auth': { chatgpt_account_id: 'account-refreshed' },
  })).toString('base64url')
  const refreshedAccess = `header.${accountPayload}.signature`
  const calls = []
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    calls.push(url)
    if (url === 'https://auth.openai.com/oauth/token') {
      const body = init?.body
      if (!(body instanceof URLSearchParams)
        || body.get('grant_type') !== 'refresh_token'
        || body.get('refresh_token') !== 'expired-refresh') {
        throw new Error('unexpected OAuth refresh request')
      }
      return new Response(JSON.stringify({
        access_token: refreshedAccess,
        refresh_token: 'replacement-refresh',
        expires_in: 3600,
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (url === 'https://chatgpt.com/backend-api/codex/models?client_version=99.99.99') {
      if (init?.headers?.authorization !== `Bearer ${refreshedAccess}`
        || init.headers['chatgpt-account-id'] !== 'account-refreshed') {
        throw new Error('catalog request did not use refreshed OAuth facts')
      }
      return new Response(JSON.stringify({
        models: [{ slug: 'gpt-6-astra', visibility: 'list', supported_in_api: true }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    throw new Error(`unexpected request: ${url}`)
  }

  await ctx.plugin(SessionStore)
  await ctx.plugin(CommandRuntime)
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(LocalCredentialProvider, {
    path: join(temporaryRoot, '.credentials.yaml'),
    watch: false,
  })
  await ctx.credentials.modifyRecord(CODEX_KEY, async () => ({
    kind: 'grant',
    payload: {
      type: 'oauth',
      access: 'expired-access',
      refresh: 'expired-refresh',
      expires: 0,
      accountId: 'account-before-refresh',
    },
  }))
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(AuthorizationService)
  await ctx.plugin({ name: namePiAi, inject: injectPiAi, apply: applyPiAi }, { providers: {} })
  await ctx.plugin(builtPlugin)

  const models = await ctx.llm.listModels('openai-codex')
  const record = await ctx.credentials.readRecord(CODEX_KEY)
  process.stdout.write(JSON.stringify({
    calls,
    models: models.map(model => model.id),
    record,
  }))
} finally {
  await ctx.fiber.dispose()
  await rm(temporaryRoot, { recursive: true, force: true })
}
