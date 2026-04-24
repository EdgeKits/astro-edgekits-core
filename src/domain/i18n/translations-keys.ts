import { PROJECT } from '@/config'
import type { Locale } from './constants'
import type { Namespace } from './schema'

/**
 * Single source of truth for translation KV key construction.
 *
 * Used by both:
 *   - fetcher.ts (runtime: cache.match / cache.put)
 *   - bundle-translations.ts (build: Cloudflare Purge API)
 *
 * Format: <project.id>:<namespace>:<locale>
 */
export function buildTranslationKvKey(locale: Locale, ns: Namespace): string {
  return `${PROJECT.id}:${ns}:${locale}`
}

/**
 * Single source of truth for translation cache URL construction.
 *
 * Used by both:
 *   - fetcher.ts (runtime: cache.match / cache.put)
 *   - bundle-translations.ts (build: Cloudflare Purge API)
 *
 * The URL uses a static, non-versioned structure. Cache invalidation is
 * handled explicitly via the Cloudflare Purge API in bundle-translations.ts
 * rather than by changing the key on every deploy.
 *
 * Format: https://<project.id>/<encodeURIComponent(<project.id>:i18n:<locale>:<namespace>)>
 */
export function buildTranslationCacheUrl(
  locale: Locale,
  ns: Namespace,
): string {
  const cacheId = `i18n:${locale}:${ns}`
  return `https://${PROJECT.id}/${encodeURIComponent(cacheId)}`
}

/**
 * Build a Cache API Request object from a translation cache URL.
 * The Cache API requires a Request object, not a plain string.
 */
export function buildTranslationCacheRequest(
  locale: Locale,
  ns: Namespace,
): Request {
  return new Request(buildTranslationCacheUrl(locale, ns))
}
