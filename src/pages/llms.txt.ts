import type { APIRoute } from 'astro'
import { DEFAULT_LOCALE, fetchTranslations } from '@edgekits/astro-i18n/runtime'

import { getPostsForLocale, splitId } from '@/lib/blog'
import { SITE_NAME, siteOrigin } from '@/lib/site'

// Default-locale content only: one language is enough for a model's context.
export const GET: APIRoute = async ({ site, url }) => {
  const origin = siteOrigin(site, url)
  const { common } = await fetchTranslations(DEFAULT_LOCALE, ['common'])
  const posts = await getPostsForLocale(DEFAULT_LOCALE)

  const lines = [
    `# ${SITE_NAME}`,
    '',
    `> ${common.seo.description}`,
    '',
    '## Pages',
    `- [${common.nav.home}](${origin}/${DEFAULT_LOCALE}/)`,
    `- [${common.nav.blog}](${origin}/${DEFAULT_LOCALE}/blog/)`,
    '',
    '## Blog posts',
    ...posts.map(
      (post) =>
        `- [${post.data.title}](${origin}/${DEFAULT_LOCALE}/blog/${splitId(post.id).slug}/): ${post.data.description}`,
    ),
    '',
    '## Source',
    '- [GitHub repository](https://github.com/EdgeKits/astro-edgekits-core)',
    '- [@edgekits/astro-i18n on npm](https://www.npmjs.com/package/@edgekits/astro-i18n)',
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
