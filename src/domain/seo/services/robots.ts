export function generateRobotsTxt(
  baseUrl: string,
  isProd: boolean,
  isDemoMode: boolean,
): string {
  // 1. Prevent indexing on staging, dev, or preview deployments
  if (!isProd || isDemoMode) {
    return `User-agent: *\nDisallow: /`
  }

  // 2. Allow everything in production and point to the sitemap
  return `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`
}
