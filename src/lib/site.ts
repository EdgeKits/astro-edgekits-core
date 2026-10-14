// The origin absolute URLs are built from: `site` from astro.config in production, the
// request's own origin in development (so links work on localhost).
export function siteOrigin(site: URL | undefined, requestUrl: URL): string {
  return import.meta.env.PROD && site ? site.origin : requestUrl.origin
}

export const SITE_NAME = 'Astro EdgeKits Core'

// Localized static routes, relative to `/<locale>`.
export const STATIC_ROUTES = ['/', '/blog/'] as const
