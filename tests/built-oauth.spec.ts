import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

interface ProbeResult {
  readonly calls: readonly string[]
  readonly models: readonly string[]
  readonly record: {
    readonly kind: string
    readonly payload: Record<string, unknown>
  }
}

const packageRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const oauthModule = pathToFileURL(join(packageRoot, 'lib/openai-codex.js')).href
const probe = fileURLToPath(new URL('./fixtures/built-refresh-probe.mjs', import.meta.url))
const execFileAsync = promisify(execFile)

describe('built Codex OAuth entry', () => {
  it('refreshes an expired grant through the production Node module graph', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [probe], {
      cwd: packageRoot,
      timeout: 20_000,
    })
    const result = JSON.parse(stdout) as ProbeResult

    expect(stderr).toBe('')
    expect(result.calls).toEqual([
      'https://auth.openai.com/oauth/token',
      'https://chatgpt.com/backend-api/codex/models?client_version=99.99.99',
    ])
    expect(result.models).toEqual(['gpt-6-astra'])
    expect(result.record).toMatchObject({
      kind: 'grant',
      payload: {
        type: 'oauth',
        refresh: 'replacement-refresh',
        accountId: 'account-refreshed',
      },
    })
  })

  it('keeps its generated implementation inside the packed lib directory', async () => {
    await expect(readFile(fileURLToPath(oauthModule), 'utf8')).resolves.toContain('openaiCodexOAuth')
  })
})
