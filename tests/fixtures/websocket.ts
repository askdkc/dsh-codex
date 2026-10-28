import { vi } from 'vitest'

export function sockets(
  mode: 'before' | 'after' | 'tool' | 'cancel' | 'error',
  afterStart?: () => void,
): { requests: unknown[] } {
  const requests: unknown[] = []
  class Socket extends EventTarget {
    readyState = 0
    constructor() {
      super()
      queueMicrotask(() => {
        if (mode === 'before') this.dispatchEvent(new Event('error'))
        else {
          this.readyState = 1
          this.dispatchEvent(new Event('open'))
        }
      })
    }
    send(body: string): void {
      requests.push(JSON.parse(body))
      setTimeout(() => {
        this.dispatchEvent(
          new MessageEvent('message', { data: JSON.stringify({ type: 'response.created', response: { id: 'r1' } }) }),
        )
        if (mode === 'tool') {
          const item = { type: 'function_call', id: 'i1', call_id: 'c1', name: 'lookup', arguments: '{}' }
          for (const event of [
            { type: 'response.output_item.added', output_index: 0, item: { ...item, arguments: '' } },
            { type: 'response.function_call_arguments.delta', output_index: 0, delta: '{}' },
            { type: 'response.output_item.done', output_index: 0, item },
          ])
            this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(event) }))
        }
        if (mode === 'cancel' && afterStart !== undefined) setTimeout(afterStart, 0)
        if (mode !== 'cancel')
          setTimeout(() => {
            this.readyState = 3
            if (mode === 'error') {
              this.dispatchEvent(new Event('error'))
              return
            }
            this.dispatchEvent(
              Object.assign(new Event('close'), { code: 1006, reason: 'Bearer synthetic-secret', wasClean: false }),
            )
          }, 0)
      }, 0)
    }
    close(): void {
      this.readyState = 3
    }
  }
  vi.stubGlobal('WebSocket', Socket)
  return { requests }
}

export function sse(): Response {
  const item = { type: 'message', id: 'm1', role: 'assistant', content: [{ type: 'output_text', text: 'OK' }] }
  return new Response(
    [
      { type: 'response.output_item.added', output_index: 0, item: { ...item, content: [] } },
      { type: 'response.output_text.delta', output_index: 0, content_index: 0, delta: 'OK' },
      { type: 'response.output_item.done', output_index: 0, item },
      {
        type: 'response.completed',
        response: {
          id: 'r1',
          status: 'completed',
          output: [item],
          usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
        },
      },
    ]
      .map(event => `data: ${JSON.stringify(event)}\n\n`)
      .join(''),
    { headers: { 'content-type': 'text/event-stream' } },
  )
}
