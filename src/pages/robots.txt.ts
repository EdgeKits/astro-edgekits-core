import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'

import { siteOrigin } from '@/lib/site'

// DEMO_MODE=on (a public demo deployment): keep crawlers out entirely.
export const GET: APIRoute = ({ site, url }) => {
  const body =
    env.DEMO_MODE === 'on'
      ? 'User-agent: *\nDisallow: /\n'
      : `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin(site, url)}/sitemap.xml\n`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
