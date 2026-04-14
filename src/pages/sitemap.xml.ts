import type { APIRoute } from 'astro'

import { SEO_DEFAULTS } from '@/domain/seo/constants'
import { parseBooleanFlag } from '@/utils/shared/parse-boolean'
import { generateSitemapXml } from '@/domain/seo/services/sitemap'

export const GET: APIRoute = async (context) => {
  const isProd = import.meta.env.PROD
  const isDemoMode = parseBooleanFlag(
    context.locals.runtime.env.DEMO_MODE,
    true,
  )

  const baseUrl =
    isProd && !isDemoMode
      ? SEO_DEFAULTS.baseUrl
      : new URL(context.request.url).origin

  const xml = await generateSitemapXml(baseUrl)

  return new Response(xml.trim(), {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      // In production, we cache on edge (1 hour)
      'Cache-Control': import.meta.env.PROD
        ? 'public, max-age=3600'
        : 'no-cache',
    },
  })
}
