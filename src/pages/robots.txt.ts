/**
 * DYNAMIC ROBOTS.TXT
 *
 * Generates `robots.txt` dynamically based on the environment.
 *
 * - In DEMO_MODE: Disallows ALL crawling. This saves Cloudflare request quota
 * by preventing bots from hitting your pages.
 *
 * - In PROD: Allows crawling and points to the sitemap.
 *
 * Note: This relies on the same `DEMO_MODE` env var as the protection middleware.
 */

import type { APIRoute } from 'astro'
import { SEO_DEFAULTS } from '@/domain/seo/constants'
import { parseBooleanFlag } from '@/utils/shared/parse-boolean'
import { generateRobotsTxt } from '@/domain/seo/services/robots'

export const GET: APIRoute = (context) => {
  const isProd = import.meta.env.PROD
  const isDemoMode = parseBooleanFlag(
    context.locals.runtime.env.DEMO_MODE,
    true,
  )

  // 1. BaseUrl resolution
  const baseUrl =
    isProd && !isDemoMode
      ? SEO_DEFAULTS.baseUrl
      : new URL(context.request.url).origin

  // 2. Generate the dynamic text
  const robotsTxt = generateRobotsTxt(baseUrl, isProd, isDemoMode)

  // 3. Return the response with Edge caching
  return new Response(robotsTxt.trim(), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': isProd ? 'public, max-age=3600' : 'no-cache',
    },
  })
}
