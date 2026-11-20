import { describe, expect, it } from 'vitest'
import type { Api, Model } from '@earendil-works/pi-ai'
import { withSupplementalCodexModels } from '../src/models.ts'

function find(models: readonly Model<Api>[], id: string): Model<Api> | undefined {
  return models.find(model => model.id === id)
}

describe('supplemental Codex models', () => {
  it('adds GPT-6.2 Sol and Astra to the bundled catalog', () => {
    const models = withSupplementalCodexModels([])

    expect(models.map(model => model.id)).toEqual([
      'gpt-6.2-sol',
      'gpt-6.2-astra',
    ])
    expect(find(models, 'gpt-6.2-sol')).toMatchObject({
      name: 'GPT-6.2 Sol',
      api: 'openai-codex-responses',
      provider: 'openai-codex',
      reasoning: true,
      input: ['text', 'image'],
      contextWindow: 500000,
      maxTokens: 128000,
      cost: {
        input: 2,
        output: 10,
        cacheRead: 0.1,
        cacheWrite: 2.5,
        tiers: [{ inputTokensAbove: 272000, input: 4, output: 15, cacheRead: 0.2, cacheWrite: 5 }],
      },
    })
    expect(find(models, 'gpt-6.2-astra')).toMatchObject({
      name: 'GPT-6.2 Astra',
      reasoning: true,
      input: ['text', 'image'],
      contextWindow: 272000,
      maxTokens: 128000,
      cost: {
        input: 8,
        output: 40,
        cacheRead: 0.4,
        cacheWrite: 10,
        tiers: [{ inputTokensAbove: 272000, input: 16, output: 60, cacheRead: 0.8, cacheWrite: 20 }],
      },
    })
  })

  it('exposes the reasoning levels each supplemented model accepts', () => {
    const models = withSupplementalCodexModels([])

    for (const id of ['gpt-6.2-sol', 'gpt-6.2-astra']) {
      expect(find(models, id)?.thinkingLevelMap).toEqual({
        off: null,
        minimal: 'low',
        low: 'low',
        medium: 'medium',
        high: 'high',
        xhigh: 'xhigh',
        max: 'max',
      })
    }
  })

  it('keeps the bundled entry when pi-ai later ships the same id', () => {
    const shipped = Object.freeze([{
      ...withSupplementalCodexModels([])[0]!,
      id: 'gpt-6.2-sol',
      name: 'Bundled GPT-6.2 Sol',
    }])

    const models = withSupplementalCodexModels(shipped)

    expect(models.map(model => model.id)).toEqual(['gpt-6.2-sol', 'gpt-6.2-astra'])
    expect(find(models, 'gpt-6.2-sol')?.name).toBe('Bundled GPT-6.2 Sol')
  })
})
