import { getCollection } from 'astro:content'
import type { RSSFeedItem } from '@astrojs/rss'

export async function getLocalizedRssItems(
  lang: string,
  baseUrl: string,
): Promise<RSSFeedItem[]> {
  const posts = await getCollection('blog')

  // 1. We leave only posts of the required locale (for example, those starting with "en/")
  const localizedPosts = posts.filter((post) =>
    post.slug.startsWith(`${lang}/`),
  )

  // 2. Converting data into RSS feed format
  return localizedPosts.map((post) => {
    // Cut off the locale from the slug
    const [, ...slugParts] = post.slug.split('/')
    const cleanSlug = slugParts.join('/')

    return {
      title: post.data.title,
      pubDate: post.data.pubDate,
      // We use our truncated/short description for previews in RSS readers
      description: post.data.description,
      // Generating the correct link to the article
      link: `${baseUrl}/${lang}/blog/${cleanSlug}/`,
    }
  })
}
