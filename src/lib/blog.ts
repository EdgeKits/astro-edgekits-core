import { getCollection, type CollectionEntry } from 'astro:content'

export type Post = CollectionEntry<'blog'>

// `en/localized-formatting-demo` -> { locale: 'en', slug: 'localized-formatting-demo' }
export function splitId(id: string): { locale: string; slug: string } {
  const [locale = '', ...rest] = id.split('/')
  return { locale, slug: rest.join('/') }
}

export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft)
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
}

export async function getPostsForLocale(locale: string): Promise<Post[]> {
  return (await getPublishedPosts()).filter((post) => splitId(post.id).locale === locale)
}

// slug -> locales the post exists in (hreflang, sitemap alternates).
export async function getPostLocales(): Promise<Map<string, string[]>> {
  const bySlug = new Map<string, string[]>()
  for (const post of await getPublishedPosts()) {
    const { locale, slug } = splitId(post.id)
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), locale])
  }
  return bySlug
}

// Whitespace-separated words for alphabetic scripts; characters for Japanese.
export function readingMinutes(body: string | undefined, locale: string): number {
  const text = body ?? ''
  const units = locale === 'ja' ? text.replace(/\s/g, '').length / 500 : text.split(/\s+/).length / 200
  return Math.max(1, Math.round(units))
}
