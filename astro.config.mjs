// @ts-check
import { defineConfig } from 'astro/config'
import cloudflare from '@astrojs/cloudflare'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import { edgekitsI18n } from '@edgekits/astro-i18n'

import i18nConfig from './edgekits-i18n.config'

// https://astro.build/config
export default defineConfig({
  // Placeholder: set your production origin (used by the sitemap, RSS and hreflang URLs).
  site: 'https://example.com',
  output: 'server',
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [edgekitsI18n(i18nConfig), mdx(), react()],
})
