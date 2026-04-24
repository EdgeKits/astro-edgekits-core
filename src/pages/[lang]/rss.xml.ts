import rss from '@astrojs/rss'
import type { APIRoute } from 'astro'

import { SEO_DEFAULTS } from '@/domain/seo/constants'
import { parseBooleanFlag } from '@/utils/shared/parse-boolean'
import { fetchTranslations } from '@/domain/i18n/fetcher'
import { getLocalizedRssItems } from '@/domain/seo/services/rss'
import {
  SUPPORTED_LOCALES,
  type SupportedLocales,
} from '@/domain/i18n/constants'

export const GET: APIRoute = async (context) => {
  const { runtime } = context.locals
  const { lang } = context.params

  // 1. Basic protection: if the locale is not supported, we return a 404
  if (!lang || !SUPPORTED_LOCALES.includes(lang as SupportedLocales)) {
    return new Response('Not found', { status: 404 })
  }

  // 3. Fetch translations.
  // We can't use context.locals.uiLocale here because it differs from the Astro.locals context.
  const { common } = await fetchTranslations(
    runtime,
    lang as SupportedLocales,
    ['common'],
  )

  const isProd = import.meta.env.PROD
  const isDemoMode = parseBooleanFlag(
    context.locals.runtime.env.DEMO_MODE,
    true,
  )

  // 2. Determine the base URL
  const baseUrl =
    isProd && !isDemoMode
      ? SEO_DEFAULTS.baseUrl
      : new URL(context.request.url).origin

  // 3. Receiving posts through our service
  const items = await getLocalizedRssItems(lang, baseUrl)

  // 4. Generating the RSS ourselves
  const feed = await rss({
    title: SEO_DEFAULTS.siteName,
    description: common.seo.description || SEO_DEFAULTS.defaultDescription,
    site: baseUrl,
    items: items,
    // Specify the feed language for proper parsing by aggregators
    customData: `<language>${lang}</language>`,
  })

  // 5. Adding caching headers for the edge network
  feed.headers.set(
    'Cache-Control',
    import.meta.env.PROD ? 'public, max-age=3600' : 'no-cache',
  )

  return feed
}
