// Specify the path here without the @ alias, since we use this file in astro.config.ts
import { PROJECT, LINKS } from '../../config'

export const SEO_DEFAULTS = {
  siteName: PROJECT.name,

  baseUrl: `https://${PROJECT.id}`,

  // Dynamically inserting a name into a template
  titleTemplate: `%s | ${PROJECT.name}`,

  // Other SEO-specific things
  ogImageFallback: `/public/images/og-image.jpg`,
  defaultDescription:
    'Production-ready foundations for SaaS and Telegram Mini Apps',
  maxDescriptionLength: 160,
  author: {
    name: 'Gary Stupak',
    url: LINKS.twitter,
  },
} as const
