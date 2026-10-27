import type { APIRoute } from 'astro'
import rss from '@astrojs/rss'
import { fetchTranslations, localizedPath } from '@edgekits/astro-i18n/runtime'

import { getPostsForLocale, splitId } from '@/lib/blog'
import { pathOptions } from '@/lib/paths'
import { SITE_NAME, siteOrigin } from '@/lib/site'

// One feed per locale, with the posts written in that locale.
export const GET: APIRoute = async ({ locals, site, url }) => {
  const { uiLocale, translationLocale } = locals
  const { common } = await fetchTranslations(translationLocale, ['common'])
  const posts = await getPostsForLocale(uiLocale)
  const origin = siteOrigin(site, url)
  const urlOf = (path: string) => origin + localizedPath(uiLocale, path, pathOptions)

  return rss({
    title: SITE_NAME,
    description: common.seo.description,
    site: urlOf('/'),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: urlOf(`/blog/${splitId(post.id).slug}/`),
    })),
    customData: `<language>${uiLocale}</language>`,
  })
}
