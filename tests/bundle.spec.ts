import { readdir, readFile } from 'node:fs/promises'
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
  it('keeps llm-pi-ai for OAuth while assigning the live Codex route to this plugin', async () => {
    const source = await readFile(join(packageRoot, 'cordis.patch.yml'), 'utf8')
    const rows = yaml.load(source) as unknown[]
    const llmRow = rows.map(record).find(row => row.id === 'llm-pi-ai')
    const insertRow = rows.map(record).find(row => 'insert' in row)

    expect(llmRow).toEqual({
      id: 'llm-pi-ai',
      config: { providers: {} },
    })
    expect(insertRow).toEqual({
      insert: [{
        id: 'codex-subscription-oauth',
        name: './lib/index.js',
        config: {
          catalog: {
            refreshIntervalMs: 900000,
            revalidateAfterMs: 60000,
            timeoutMs: 15000,
          },
        },
      }],
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

  it('keeps pi-ai and its provider-wide SDK graph out of runtime dependencies', async () => {
    const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
      files?: string[]
    }

    expect(manifest.dependencies).toEqual({
      '@deepseek-ai/dsh-authorization': '0.1.2-alpha.3',
    })
    expect(manifest.devDependencies?.['@earendil-works/pi-ai']).toBe('0.85.1')
    expect(manifest.files).toContain('README.ja.md')
    expect(manifest.dependencies).not.toHaveProperty('@earendil-works/pi-ai')
    expect(manifest.dependencies).not.toHaveProperty('@google/genai')
    expect(manifest.dependencies).not.toHaveProperty('protobufjs')
    await expect(readFile(join(packageRoot, 'THIRD_PARTY_NOTICES.md'), 'utf8')).resolves.toContain(
      '@earendil-works/pi-ai 0.85.1',
    )
  })

  it('emits the opaque OAuth target without forbidden external imports', async () => {
    const lib = join(packageRoot, 'lib')
    const files = (await readdir(lib)).filter(file => file.endsWith('.js'))
    expect(files).toContain('openai-codex.js')

    const imports = new Set<string>()
    for (const file of files) {
      const source = await readFile(join(lib, file), 'utf8')
      for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\()\s*['"]([^'"]+)['"]/g)) {
        const specifier = match[1]
        if (specifier !== undefined) imports.add(specifier)
      }
    }

    expect([...imports]).not.toContain('@earendil-works/pi-ai')
    expect([...imports]).not.toContain('@earendil-works/pi-ai/providers/openai-codex')
    expect([...imports]).not.toContain('@google/genai')
    expect([...imports]).not.toContain('protobufjs')
  })
})
