import { describe, expect, it } from 'vitest'
import { toBundledCodexContext } from '../src/provider.ts'

describe('Codex SDK context boundary', () => {
  it('leaves the legacy envelope and caller-owned history intact', () => {
    const context = { systemPrompt: 'Legacy prompt', tools: [], messages: [] }
    expect(toBundledCodexContext(context)).toBe(context)
  })

  it('replays system sections and tool additions/removals without mutating history', () => {
    const removed = { name: 'old', description: 'Old tool', parameters: { type: 'object' as const } }
    const replacement = { ...removed, name: 'lookup', description: 'Latest definition' }
    const user = { role: 'user' as const, content: 'Hello', timestamp: 1 }
    const context = {
      messages: [
        { role: 'system' as const, content: 'Base', sections: { policy: 'Old', discarded: 'Remove me' }, toolsAdded: [removed], timestamp: 0 },
        user,
        { role: 'system' as const, content: [{ type: 'text' as const, text: 'Update' }],
          sections: { policy: 'New', discarded: null }, toolsRemoved: [{ name: 'old' }], toolsAdded: [replacement], timestamp: 2 },
      ],
    }
    const original = structuredClone(context)
    expect(toBundledCodexContext(context)).toEqual({
      systemPrompt: 'Base\n\nUpdate\n\nNew', tools: [replacement], messages: [user],
    })
    expect(context).toEqual(original)
  })
})
