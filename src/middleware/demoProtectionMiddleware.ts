import type { MiddlewareHandler } from 'astro'

/**
 * 🛡️ DEMO PROTECTION MIDDLEWARE
 *
 * This middleware safeguards the site when deployed as a public demo (e.g. *.workers.dev).
 * It forces a "noindex" header if the `DEMO_MODE` environment variable is set to "on".
 *
 * - Prevents SEO cannibalization of the main project.
 * - Prevents indexing of staging environments.
 *
 * Usage: Set `DEMO_MODE="on"` in your wrangler.jsonc or Cloudflare Dashboard.
 * You can safely remove this if you don't need staging protection.
 */

export const demoProtectionMiddleware: MiddlewareHandler = async (
  ctx,
  next,
) => {
  const response = await next()

  const isDemo = ctx.locals.runtime?.env?.DEMO_MODE === 'on'

  if (isDemo) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
}
