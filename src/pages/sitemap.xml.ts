import type { APIRoute } from 'astro'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, localizedPath, toIetfTag } from '@edgekits/astro-i18n/runtime'

import { getPostLocales, getPublishedPosts, splitId } from '@/lib/blog'
import { pathOptions } from '@/lib/paths'
import { siteOrigin, STATIC_ROUTES } from '@/lib/site'

interface Entry {
  loc: string
  lastmod?: Date
  // locale -> URL of the same page in that locale
  alternates: Map<string, string>
}

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function renderEntry({ loc, lastmod, alternates }: Entry): string {
  const links = [...alternates].map(
    ([locale, href]) => `    <xhtml:link rel="alternate" hreflang="${toIetfTag(locale)}" href="${escapeXml(href)}"/>`,
  )
  const xDefault = alternates.get(DEFAULT_LOCALE)
  if (xDefault) links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(xDefault)}"/>`)

  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod.toISOString()}</lastmod>`] : []),
    ...(alternates.size > 1 ? links : []),
    '  </url>',
  ].join('\n')
}

// Every static route in every locale, plus each post in the locales it is written in.
// Fallback renders (a post opened in a locale it lacks) are left out: their canonical is the original.
export const GET: APIRoute = async ({ site, url }) => {
  const origin = siteOrigin(site, url)
  const urlOf = (locale: string, path: string) => origin + localizedPath(locale, path, pathOptions)
  const entries: Entry[] = []

  for (const route of STATIC_ROUTES) {
    const alternates = new Map(SUPPORTED_LOCALES.map((locale) => [locale, urlOf(locale, route)]))
    for (const locale of SUPPORTED_LOCALES) entries.push({ loc: urlOf(locale, route), alternates })
  }

  const postLocales = await getPostLocales()
  for (const post of await getPublishedPosts()) {
    const { locale, slug } = splitId(post.id)
    const alternates = new Map((postLocales.get(slug) ?? [locale]).map((code) => [code, urlOf(code, `/blog/${slug}/`)]))
    entries.push({
      loc: urlOf(locale, `/blog/${slug}/`),
      lastmod: post.data.updatedDate ?? post.data.pubDate,
      alternates,
    })
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries.map(renderEntry),
    '</urlset>',
  ].join('\n')

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
