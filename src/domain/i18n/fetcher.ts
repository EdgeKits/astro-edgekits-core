import type { Locale } from '@/domain/i18n/constants'
import type { Namespace, PickSchema } from './schema'
import {
  buildTranslationKvKey,
  buildTranslationCacheRequest,
} from './translations-keys'
import { deepMerge } from '@/utils/shared/deep-merge'
import { parseBooleanFlag } from '@/utils/shared/parse-boolean'

// Optional fallbacks (auto-loaded if generated)
let FALLBACKS: Record<string, any> | null = null

try {
  FALLBACKS = await import('./fallbacks.generated.ts')
} catch {
  FALLBACKS = null
}

const KV_JSON_OPTIONS = { type: 'json' as const }

/**
 * Runtime object provided by Astro via Astro.locals.runtime.
 *
 * Intentionally loosely typed (unknown for cf/caches/ctx) to avoid
 * hard coupling to Cloudflare Workers or DOM types in this shared module.
 * We narrow the shape locally only where we need Cache API or waitUntil.
 */
export interface Runtime {
  env: Env
  cf: unknown
  caches: unknown
  ctx: unknown
}

/**
 * Fetch translations from KV for a given locale and list of namespaces.
 *
 * Cache strategy — per-namespace static cache keys:
 *
 * Each namespace is cached individually under a static (non-versioned) URL:
 *   https://<project.id>/<encodeURIComponent(<project.id>:i18n:<locale>:<ns>)>
 *
 * Cache invalidation is handled explicitly by the Cloudflare Purge API
 * in bundle-translations.ts — only namespaces whose content actually changed
 * are purged, leaving untouched namespaces warm in the cache.
 *
 * Hot path (all namespaces cached):
 *   Parallel cache.match() for each namespace → all HIT → return immediately.
 *   Zero KV reads.
 *
 * Partial or full cache miss:
 *   Missing namespaces collected → single KV getAll() batch →
 *   merge with FALLBACK_* → individual cache.put() per namespace → return.
 *
 * KV unavailable:
 *   Falls back to FALLBACK_* compiled dictionaries (always available).
 *   If FALLBACKS is null, returns empty objects per namespace — no crash.
 */
export async function fetchTranslations<N extends Namespace>(
  runtime: Runtime,
  locale: Locale,
  namespaces: readonly N[],
): Promise<PickSchema<N>> {
  const { env } = runtime
  const useCache = isCacheEnabled(env)

  if (!useCache) {
    debug(env, 'i18n cache DISABLED, using KV only', { locale, namespaces })
    return fetchAllFromKV(env, locale, namespaces)
  }

  const { cache, waitUntil } = getEdgeCache(runtime)

  if (!cache) {
    // Cache API unavailable (e.g. Astro dev server without Miniflare)
    debug(env, 'i18n Cache API unavailable, using KV only', {
      locale,
      namespaces,
    })
    return fetchAllFromKV(env, locale, namespaces)
  }

  // ---------------------------------------------------------------------------
  // 1. Check Cache API in parallel for each namespace individually
  // ---------------------------------------------------------------------------

  const cacheResults = await Promise.all(
    namespaces.map(async (ns) => {
      const cacheRequest = buildTranslationCacheRequest(locale, ns)
      try {
        const cached = await cache.match(cacheRequest)
        if (cached) {
          return { ns, data: await cached.json(), hit: true }
        }
      } catch (error) {
        debug(env, `i18n cache READ error for ${ns}`, error)
      }
      return { ns, data: null, hit: false }
    }),
  )

  // ---------------------------------------------------------------------------
  // 2. Separate hits from misses
  // ---------------------------------------------------------------------------

  const finalData: Partial<PickSchema<N>> = {}
  const missingNamespaces: N[] = []

  for (const { ns, data, hit } of cacheResults) {
    if (hit) {
      finalData[ns] = data as PickSchema<N>[typeof ns]
    } else {
      missingNamespaces.push(ns)
    }
  }

  // All namespaces were in cache — return immediately, zero KV reads
  if (missingNamespaces.length === 0) {
    debug(env, 'i18n cache FULL HIT', { locale, namespaces })
    return finalData as PickSchema<N>
  }

  debug(env, 'i18n cache PARTIAL/FULL MISS', {
    locale,
    hit: namespaces.length - missingNamespaces.length,
    miss: missingNamespaces.length,
  })

  // ---------------------------------------------------------------------------
  // 3. Batch KV read for missing namespaces only
  // ---------------------------------------------------------------------------

  const missingKvKeys = missingNamespaces.map((ns) =>
    buildTranslationKvKey(locale, ns),
  )

  let kvResults = new Map<string, unknown | null>()
  let kvFailed = false

  try {
    kvResults = (await env.TRANSLATIONS.get(
      missingKvKeys,
      KV_JSON_OPTIONS,
    )) as Map<string, unknown | null>

    debug(env, 'i18n KV batch OK', { locale, missingNamespaces })
  } catch (error) {
    kvFailed = true
    debug(env, 'i18n KV ERROR, using FALLBACK_* for missing namespaces', error)
  }

  // ---------------------------------------------------------------------------
  // 4. Assemble missing namespaces + schedule individual cache writes
  // ---------------------------------------------------------------------------

  const putPromises: Promise<void>[] = []

  for (let i = 0; i < missingNamespaces.length; i++) {
    const ns = missingNamespaces[i] as N
    const kvKey = missingKvKeys[i] as string

    // Use KV value if available, otherwise empty object (fallback will fill it)
    const kvValue = kvFailed ? {} : ((kvResults.get(kvKey) as object) ?? {})

    // Merge with FALLBACK_* compiled dictionary if present
    const fallbackConstName = `FALLBACK_${String(ns).toUpperCase()}`
    const fallback = FALLBACKS?.[fallbackConstName]

    const nsData = fallback ? deepMerge(fallback, kvValue) : kvValue

    if (kvFailed && !fallback) {
      debug(
        env,
        `i18n namespace "${ns}" unavailable: KV failed and no fallback`,
      )
    }

    finalData[ns] = nsData as PickSchema<N>[typeof ns]

    // Cache the resolved namespace individually with a long TTL.
    // Invalidation is handled explicitly via Cloudflare Purge API —
    // no TTL-based expiry needed here.
    const cacheRequest = buildTranslationCacheRequest(locale, ns)
    const response = new Response(JSON.stringify(nsData), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=31536000, immutable',
      },
    })

    putPromises.push(
      cache.put(cacheRequest, response.clone()).catch((error: unknown) => {
        const errorMsg = error instanceof Error ? error.message : String(error)
        debug(env, `i18n cache WRITE error for ${ns}`, errorMsg)
      }),
    )
  }

  // ---------------------------------------------------------------------------
  // 5. Schedule cache writes as background tasks
  // ---------------------------------------------------------------------------

  if (putPromises.length > 0) {
    const allPuts = Promise.all(putPromises)

    if (waitUntil) {
      // Real Workers: schedule as a non-blocking background task
      waitUntil(allPuts)
    } else {
      // Dev / non-Workers: await directly so cache is actually written
      await allPuts
    }

    debug(env, 'i18n cache PUT scheduled', { locale, missingNamespaces })
  }

  return finalData as PickSchema<N>
}

// ---------------------------------------------------------------------------
// KV helpers
// ---------------------------------------------------------------------------

/**
 * Fetch all requested namespaces directly from KV, bypassing the cache.
 * Used when caching is disabled or the Cache API is unavailable.
 */
async function fetchAllFromKV<N extends Namespace>(
  env: Env,
  locale: Locale,
  namespaces: readonly N[],
): Promise<PickSchema<N>> {
  const keys = namespaces.map((ns) => buildTranslationKvKey(locale, ns))

  let kvResults = new Map<string, unknown | null>()
  let kvFailed = false

  try {
    kvResults = (await env.TRANSLATIONS.get(keys, KV_JSON_OPTIONS)) as Map<
      string,
      unknown | null
    >
  } catch (error) {
    kvFailed = true
  }

  if (kvFailed) {
    return buildFallbackOnly(namespaces)
  }

  const data: Partial<PickSchema<N>> = {}

  for (let i = 0; i < namespaces.length; i++) {
    const ns = namespaces[i]
    const kvValue = (kvResults.get(keys[i] as string) as object) ?? {}
    const fallbackConstName = `FALLBACK_${String(ns).toUpperCase()}`
    const fallback = FALLBACKS?.[fallbackConstName]
    ;(data as any)[ns] = fallback ? deepMerge(fallback, kvValue) : kvValue
  }

  return data as PickSchema<N>
}

/**
 * Build a payload using only FALLBACK_* compiled dictionaries.
 * Used when KV is completely unavailable.
 */
function buildFallbackOnly<N extends Namespace>(
  namespaces: readonly N[],
): PickSchema<N> {
  const data: Partial<PickSchema<N>> = {}

  for (const ns of namespaces) {
    const fallbackConstName = `FALLBACK_${String(ns).toUpperCase()}`
    ;(data as any)[ns] = FALLBACKS?.[fallbackConstName] ?? {}
  }

  return data as PickSchema<N>
}

// ---------------------------------------------------------------------------
// Runtime helpers
// ---------------------------------------------------------------------------

/**
 * Narrow runtime.caches and runtime.ctx to the minimal shape needed
 * for using the Cache API and waitUntil in this module.
 */
function getEdgeCache(runtime: Runtime): {
  cache: { match: any; put: any } | null
  waitUntil: ((p: Promise<unknown>) => void) | null
} {
  const cacheStorage = runtime.caches as { default?: { match: any; put: any } }
  const ctx = runtime.ctx as { waitUntil?: (p: Promise<unknown>) => void }

  return {
    cache: cacheStorage?.default ?? null,
    waitUntil: ctx?.waitUntil ?? null,
  }
}

/**
 * Determine whether edge caching is enabled.
 *
 * Wrangler var:
 *   I18N_CACHE = "on" | "off" | "true" | "false" | "1" | "0"
 *
 * After adding the variable:
 *   - Update wrangler.jsonc / wrangler.toml or .dev.vars
 *   - Run: npm run typegen
 */
function isCacheEnabled(env: Env): boolean {
  return parseBooleanFlag(env.I18N_CACHE, /* defaultValue */ true)
}

/**
 * Debug logger controlled by a Wrangler variable.
 *
 * Wrangler var:
 *   DEBUG_I18N = "on" | "off" | "true" | "false" | "1" | "0"
 *
 * After adding the variable:
 *   - Update wrangler.jsonc / wrangler.toml or .dev.vars
 *   - Run: npm run typegen
 */
function debug(env: Env, ...args: unknown[]): void {
  const enabled = parseBooleanFlag(env.DEBUG_I18N, /* defaultValue */ false)
  if (!enabled) return

  // eslint-disable-next-line no-console
  console.log(...args)
}
