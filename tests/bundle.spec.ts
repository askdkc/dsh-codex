import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import yaml from 'js-yaml'

const root = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(root, '..')
const pinnedBasePatch = fileURLToPath(import.meta.resolve('@deepseek-ai/dsh-base/cordis.patch.yml'))

type RecordValue = Record<string, unknown>

function record(value: unknown): RecordValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('expected a YAML mapping')
  }
  return value as RecordValue
}

describe('bundle patch contract', () => {
  it('adds the adapter and replaces llm-pi-ai with the complete Codex base config', async () => {
    const source = await readFile(join(packageRoot, 'cordis.patch.yml'), 'utf8')
    const rows = yaml.load(source) as unknown[]
    const llmRow = rows.map(record).find(row => row.id === 'llm-pi-ai')
    const insertRow = rows.map(record).find(row => 'insert' in row)

    expect(llmRow).toEqual({
      id: 'llm-pi-ai',
      config: { providers: { 'openai-codex': {} } },
    })
    expect(insertRow).toEqual({
      insert: [{ id: 'codex-subscription-oauth', name: './lib/index.js' }],
    })
  })

  it('guards the pinned base from silently acquiring llm-pi-ai config', async () => {
    const source = await readFile(pinnedBasePatch, 'utf8')
    const start = source.indexOf('    - id: llm-pi-ai\n')
    expect(start).toBeGreaterThanOrEqual(0)
    const next = source.indexOf('\n    - id:', start + 1)
    const row = source.slice(start, next === -1 ? undefined : next)

    expect(row).toContain("name: '@deepseek-ai/dsh-llm-pi-ai'")
    expect(row).not.toMatch(/^\s+config:/m)
  })
})
