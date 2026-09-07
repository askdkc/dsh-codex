/**
 * pi-ai credential access over DSH's opaque `llm-pi-ai` grant records.
 *
 * The existing llm-pi-ai plugin still owns login and token persistence. This
 * bridge lets this plugin resolve and refresh the same grant without learning
 * or logging its provider-specific fields.
 */
import type { Context } from '@deepseek-ai/cordis'
import {
  credentialKeyId,
  credentialKeyScope,
  isCredentialKeySegment,
  type CredentialRecord,
} from '@deepseek-ai/dsh-credentials'
import { recordKeyFor } from '@deepseek-ai/dsh-llm-pi-ai'
import type {
  AuthContext,
  Credential,
  CredentialStore,
} from '@earendil-works/pi-ai'

const RECORD_SCOPE = 'llm-pi-ai'

/** Remove explicitly undefined plain-object members before durable storage. */
function jsonImage(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(entry => entry === undefined ? null : jsonImage(entry))
  if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
    const image: Record<string, unknown> = {}
    for (const [key, member] of Object.entries(value)) {
      if (member !== undefined) image[key] = jsonImage(member)
    }
    return image
  }
  return value
}

/** Translate the record format owned by llm-pi-ai back to a pi-ai credential. */
function toCredential(record: CredentialRecord | undefined): Credential | undefined {
  if (record === undefined) return undefined
  if (record.kind === 'api-key') {
    return {
      type: 'api_key',
      ...(record.key === undefined ? {} : { key: record.key }),
      ...(record.env === undefined ? {} : { env: { ...record.env } }),
    }
  }
  return record.payload as Credential
}

/** Translate a pi-ai credential to the same durable record format. */
function toRecord(credential: Credential): CredentialRecord {
  if (credential.type === 'api_key') {
    return {
      kind: 'api-key',
      ...(credential.key === undefined ? {} : { key: credential.key }),
      ...(credential.env === undefined ? {} : { env: { ...credential.env } }),
    }
  }
  return { kind: 'grant', payload: jsonImage(credential) }
}

/**
 * Access only records owned by llm-pi-ai. OAuth refresh remains serialized by
 * the DSH credential provider's cross-process modify operation.
 */
export function credentialStoreFrom(ctx: Context): CredentialStore {
  return {
    async read(providerId) {
      if (!isCredentialKeySegment(providerId)) return undefined
      return toCredential(await ctx.credentials.readRecord(recordKeyFor(providerId)))
    },
    async list() {
      const records = await ctx.credentials.listRecords()
      return records
        .filter(entry => credentialKeyScope(entry.key) === RECORD_SCOPE)
        .map(entry => ({
          providerId: credentialKeyId(entry.key),
          type: entry.kind === 'api-key' ? 'api_key' as const : 'oauth' as const,
        }))
    },
    async modify(providerId, mutate) {
      if (!isCredentialKeySegment(providerId)) {
        throw new Error(`codex-subscription-oauth: invalid credential provider id "${providerId}"`)
      }
      const result = await ctx.credentials.modifyRecord(recordKeyFor(providerId), async current => {
        const next = await mutate(toCredential(current))
        return next === undefined ? undefined : toRecord(next)
      })
      return toCredential(result)
    },
    async delete(providerId) {
      if (!isCredentialKeySegment(providerId)) return
      await ctx.credentials.deleteRecord(recordKeyFor(providerId))
    },
  }
}

/** Codex OAuth has no environment or filesystem-based authentication path. */
export function codexAuthContext(): AuthContext {
  return {
    env: async () => undefined,
    fileExists: async () => false,
  }
}
