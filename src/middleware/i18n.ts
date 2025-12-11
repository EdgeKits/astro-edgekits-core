import type { MiddlewareHandler } from 'astro'
import { LocaleSchema, type Locale } from '@/utils/schemas'
import { DEFAULT_LOCALE } from '@/utils/constants'
import { getCookieLang, setCookieLang } from '@/utils/i18n/cookie-storage'

const PUBLIC_FILE_REGEX =
  /\.(ico|png|jpg|jpeg|svg|webp|gif|css|js|map|txt|xml|json|woff2?|avif)$/i

const IGNORED_PREFIXES = ['/assets', '/_astro', '/favicon', '/robots.txt']

type I18nMiddlewareContext = Parameters<MiddlewareHandler>[0]

function shouldBypassI18n(pathname: string): boolean {
  if (PUBLIC_FILE_REGEX.test(pathname)) return true
  if (IGNORED_PREFIXES.some((p) => pathname.startsWith(p))) return true
  return false
}

function buildLocalizedPath(locale: Locale, rest: string[]): string {
  const suffix = rest.join('/')
  return suffix ? `/${locale}/${suffix}/` : `/${locale}/`
}

function resolveFallbackLocale(context: I18nMiddlewareContext): Locale {
  const cookieLocale = getCookieLang(context.cookies)
  if (cookieLocale) return cookieLocale

  const browserRaw = context.preferredLocale
  if (browserRaw) {
    // 1) Try full match (for cases where you actually have 'pt-br' in SUPPORTED_LOCALES)
    let parsed = LocaleSchema.safeParse(browserRaw)
    if (parsed.success) return parsed.data

    // 2) Fallback: language part only, e.g. 'pt-br' -> 'pt'
    const short = browserRaw.split('-')[0]
    parsed = LocaleSchema.safeParse(short)
    if (parsed.success) return parsed.data
  }

  return DEFAULT_LOCALE
}

export const i18nMiddleware: MiddlewareHandler = async (context, next) => {
  const url = new URL(context.request.url)
  const pathname = url.pathname

  // 0. Skip static / system paths
  if (shouldBypassI18n(pathname)) {
    return next()
  }

  const segments = pathname.split('/').filter(Boolean) // "/es/about/" -> ["es", "about"]
  const firstSegment = segments[0] ?? null

  const fallbackLocale = resolveFallbackLocale(context)

  // 1. No locale in URL — redirect to fallback locale root
  if (!firstSegment) {
    const target = buildLocalizedPath(fallbackLocale, [])
    if (pathname !== target) {
      return context.redirect(target, 302)
    }
    return next()
  }

  // 2. URL has first segment — validate as locale
  const parsed = LocaleSchema.safeParse(firstSegment)
  const urlLocale: Locale | null = parsed.success ? parsed.data : null

  if (urlLocale) {
    // Keep cookie in sync with URL locale
    setCookieLang(context.cookies, urlLocale)

    // Put the resolved locale into context.locals.
    // We intentionally call this uiLocale because it represents
    // the locale *requested by the user* (URL, cookie, or browser)
    // and is used for:
    //   • URL structure (/en/, /de/, /ja/)
    //   • <html lang="">
    //   • UI language preference

    // IMPORTANT: uiLocale does NOT guarantee that translation
    // files exist for this locale. A later function,
    // resolveLocaleForTranslations(), will compute a safe
    // translationLocale (usually falling back to DEFAULT_LOCALE)
    // to avoid missing-namespace crashes.

    // In short:
    //   uiLocale = user's chosen locale (may not have translations)
    //   translationLocale = safe locale used for KV translation fetch
    context.locals.uiLocale = urlLocale

    // Normalize trailing slash and structure
    const normalized = buildLocalizedPath(urlLocale, segments.slice(1))
    if (pathname !== normalized) {
      return context.redirect(normalized, 302)
    }

    return next()
  }

  // 3. Invalid locale in URL -> treat the whole path as content missing the locale prefix.
  // We redirect to the fallback locale (e.g. /en/slug) to enforce a canonical URL structure.
  // If the target path doesn't exist, Astro renders a 404 page with a 404 status code there.
  // This ensures "Hard 404" behavior and avoids "Soft 404" penalties on non-canonical URLs.
  // P.S. Not ideal, but works.
  const target = buildLocalizedPath(fallbackLocale, segments)

  if (pathname !== target) {
    return context.redirect(target, 302)
  }

  return next()
}
