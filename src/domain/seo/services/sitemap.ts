import { getCollection } from 'astro:content'
import { SUPPORTED_LOCALES } from '@/domain/i18n/constants'

// 1. Strong typing for sitemap elements
export interface SitemapEntry {
  loc: string
  lastmod?: string
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never'
  priority?: number
}

export async function generateSitemapXml(siteUrl: string): Promise<string> {
  const posts = await getCollection('blog')
  const staticRoutes = ['', '/blog']
  const entries: SitemapEntry[] = []

  // 2. Building static routes for all locales.
  for (const locale of SUPPORTED_LOCALES) {
    for (const route of staticRoutes) {
      entries.push({
        loc: `${siteUrl}/${locale}${route}`,
        changefreq: 'daily',
        priority: route === '' ? 1.0 : 0.8,
      })
    }
  }

  // 3. Building dynamic blog routes
  for (const post of posts) {
    const [lang, ...slugParts] = post.slug.split('/')
    const cleanSlug = slugParts.join('/')

    entries.push({
      loc: `${siteUrl}/${lang}/blog/${cleanSlug}/`,
      lastmod: post.data.pubDate.toISOString(),
      changefreq: 'weekly',
      priority: 0.7,
    })
  }

  // 4. Generating the final XML
  const urlsXml = entries
    .map(
      (entry) => `
  <url>
    <loc>${entry.loc}</loc>
    ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
    ${entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : ''}
    ${entry.priority ? `<priority>${entry.priority.toFixed(1)}</priority>` : ''}
  </url>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`
}
