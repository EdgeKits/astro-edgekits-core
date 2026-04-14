import type { APIRoute } from 'astro'
import { SEO_DEFAULTS } from '@/domain/seo/constants'
import { parseBooleanFlag } from '@/utils/shared/parse-boolean'
import { generateLlmsText } from '@/domain/seo/services/llms'

export const GET: APIRoute = async (context) => {
  const isProd = import.meta.env.PROD
  const isDemoMode = parseBooleanFlag(
    context.locals.runtime.env.DEMO_MODE,
    true,
  )

  // 1. Smart baseUrl resolution for local/staging vs production environments
  const baseUrl =
    isProd && !isDemoMode
      ? SEO_DEFAULTS.baseUrl
      : new URL(context.request.url).origin

  // 2. Generate the markdown-formatted text
  const text = await generateLlmsText(baseUrl)

  // 3. Return as a plain text response
  return new Response(text.trim(), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Cache on Edge nodes in production, disable cache locally
      'Cache-Control': import.meta.env.PROD
        ? 'public, max-age=3600'
        : 'no-cache',
    },
  })
}
