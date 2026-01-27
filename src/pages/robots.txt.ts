import type { APIRoute } from 'astro'

/**
 * 🤖 DYNAMIC ROBOTS.TXT
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

export const GET: APIRoute = ({ locals }) => {
  const isDemo = locals.runtime?.env?.DEMO_MODE === 'on'

  const robotsTxt = isDemo
    ? `
# DEMO MODE
User-agent: *
Disallow: /
`
    : `
# PRODUCTION MODE
User-agent: *
Allow: /
`

  return new Response(robotsTxt.trim(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
