import { PROJECT_ID } from '../shared/constants'
import { TRANSLATIONS_VERSION } from './runtime-constants'
import type { Locale, Namespace, PickSchema } from './schemas'
import { deepMerge } from '../shared/deep-merge'

// Optional fallbacks (auto-loaded if generated)
let FALLBACKS: Record<string, any> | null = null

try {
  FALLBACKS = await import('./fallbacks.generated.ts')
} catch {
  FALLBACKS = null
}

const KV_JSON_OPTIONS = { type: 'json' as const, cacheTtl: 3600 }

/**
 * Runtime object provided by Astro via Astro.locals.runtime.
 *
 * It is intentionally kept loosely typed (unknown for cf/caches/ctx) to avoid
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
 * Responsibilities:
 * - Build KV keys using PROJECT_ID, namespace and locale
 * - Optionally use edge cache (controlled by env flag I18N_CACHE)
 * - On cache miss, read from KV and merge with optional FALLBACK_* dictionaries
 * - Persist the merged payload back to the edge cache
 * - If KV is unavailable, fall back to static FALLBACK_* dictionaries only
 */
export async function fetchTranslations<N extends Namespace>(
  runtime: Runtime,
  lang: Locale,
  namespaces: readonly N[],
): Promise<PickSchema<N>> {
  const { env } = runtime
  const useCache = isCacheEnabled(env)

  if (!useCache) {
    debug(env, 'i18n cache DISABLED, using KV only', { lang, namespaces })
  }

  const { cache, waitUntil } = useCache
    ? getEdgeCache(runtime)
    : { cache: null, waitUntil: null }

  const keys = namespaces.map((ns) => `${PROJECT_ID}:${ns}:${lang}`)

  const { cacheRequest } = buildCacheKey(lang, namespaces)

  // 1. Try to serve from edge cache if available and enabled
  if (useCache && cache) {
    try {
      const cached = await cache.match(cacheRequest)

      if (cached) {
        const json = (await cached.json()) as PickSchema<N>
        debug(env, 'i18n cache HIT', { lang, namespaces })
        return json
      }
      debug(env, 'i18n cache MISS (no entry)', { lang, namespaces })
    } catch (error) {
      debug(env, 'i18n cache READ error, falling back to KV', error)
    }
  }

  // 2. Cache is missing, disabled, or unavailable → read from KV
  try {
    const data = await loadTranslationsFromKV(env, keys, namespaces)
    debug(env, 'i18n KV OK', { lang, namespaces })

    // 3. Store the resulting payload in the edge cache asynchronously (if enabled)
    if (useCache && cache && waitUntil) {
      try {
        // const response = new Response(JSON.stringify(data), {
        //   headers: {
        //     'Content-Type': 'application/json; charset=utf-8',
        //     'Cache-Control':
        //       'public, s-maxage=3600, stale-while-revalidate=86400',
        //   },
        // })

        // waitUntil(cache.put(cacheRequest, response.clone()))
        // debug(env, 'i18n cache PUT scheduled', { lang, namespaces })

        const response = new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control':
              'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        })

        const putPromise = cache.put(cacheRequest, response.clone())

        // In real Workers: schedule as a background task.
        // In dev / non-Workers: just await so cache is actually written.
        if (waitUntil) {
          waitUntil(putPromise)
        } else {
          await putPromise
        }

        debug(env, 'i18n cache PUT completed', { lang, namespaces })
      } catch (error) {
        debug(env, 'i18n cache WRITE error', error)
      }
    }

    return data
  } catch (error) {
    debug(env, 'i18n KV ERROR, using FALLBACK_* only', error)

    // 4. Hard fallback to static FALLBACK_* constants if KV is unavailable
    return buildFallbackOnly(namespaces)
  }
}

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
 * Build a stable cache key and synthetic Request object used with the
 * Cache API. The URL origin is irrelevant; only the string identity matters.
 */
function buildCacheKey<N extends Namespace>(
  lang: Locale,
  namespaces: readonly N[],
): { cacheId: string; cacheRequest: Request } {
  const cacheId = `${PROJECT_ID}:i18n:v${TRANSLATIONS_VERSION}:${lang}:${namespaces.join(',')}`

  const cacheRequest = new Request(
    `https://i18n-cache/${encodeURIComponent(cacheId)}`,
  )

  return { cacheId, cacheRequest }
}

/**
 * Read translations from KV and merge with optional FALLBACK_* dictionaries.
 * This is the main "happy-path" loader.
 */
async function loadTranslationsFromKV<N extends Namespace>(
  env: Env,
  keys: string[],
  namespaces: readonly N[],
): Promise<PickSchema<N>> {
  const resultMap = (await env.TRANSLATIONS.get(keys, KV_JSON_OPTIONS)) as Map<
    string,
    unknown | null
  >

  const data: Partial<PickSchema<N>> = {}

  for (let i = 0; i < namespaces.length; i++) {
    const ns = namespaces[i]
    const key = keys[i]
    const value = resultMap.get(key as string) ?? {}

    const fallbackConstName = `FALLBACK_${String(ns).toUpperCase()}`
    const fallback = FALLBACKS?.[fallbackConstName]

    if (fallback) {
      ;(data as any)[ns] = deepMerge(fallback, value as object)
    } else {
      ;(data as any)[ns] = value
    }
  }

  return data as PickSchema<N>
}

/**
 * Build a payload using only FALLBACK_* dictionaries.
 * Used when KV is unavailable or throws unexpectedly.
 */
function buildFallbackOnly<N extends Namespace>(
  namespaces: readonly N[],
): PickSchema<N> {
  const empty: Partial<PickSchema<N>> = {}

  for (let i = 0; i < namespaces.length; i++) {
    const ns = namespaces[i]
    const fallbackConstName = `FALLBACK_${String(ns).toUpperCase()}`
    const fallback = FALLBACKS?.[fallbackConstName]

    ;(empty as any)[ns] = fallback ?? {}
  }

  return empty as PickSchema<N>
}

/**
 * Parse a boolean flag from Wrangler-env string.
 *
 * Accepts:
 *   "1", "true", "on"   → true
 *   "0", "false", "off" → false
 *   undefined           → defaultValue
 */
function parseBooleanFlag(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) return defaultValue

  const v = value.toLowerCase()
  if (v === '1' || v === 'true' || v === 'on') return true
  if (v === '0' || v === 'false' || v === 'off') return false

  return defaultValue
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
  // env.I18N_CACHE is generated by `wrangler types`
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
function debug(env: Env, ...args: unknown[]) {
  const enabled = parseBooleanFlag(env.DEBUG_I18N, /* defaultValue */ false)
  if (!enabled) return

  // eslint-disable-next-line no-console
  console.log(...args)
}
