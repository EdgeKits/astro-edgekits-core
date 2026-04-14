// @ts-check
import { defineConfig } from 'astro/config'
import type { PluginOption } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'
import mdx from '@astrojs/mdx'

import { PROJECT } from './src/config'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './src/domain/i18n/constants'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  site: `https://${PROJECT.id}`,
  // Dev-only: emulate Cloudflare runtime in `astro dev` using your wrangler config.
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      configPath: 'wrangler.jsonc',
    },
    // Use Cloudflare's image service for SSR compatibility on Workers.
    // Read more at https://developers.cloudflare.com/images/
    // Does not work in local dev
    ...(isProd ? { imageService: 'cloudflare' } : {}),
  }),
  integrations: [react(), mdx()],
  vite: {
    plugins: [
      // Important: This is a collision between two different Vite.Plugin types from different node_modules.
      // Everything is correct at runtime; the incompatibility is only at the d.ts level.
      tailwindcss() as PluginOption,
    ],
    resolve: {
      // Use the edge-compatible React DOM server bundle only in production.
      alias: isProd ? { 'react-dom/server': 'react-dom/server.edge' } : {},
    },
    build: {
      // Use Astro 5's LightningCSS via Vite for maximum CSS compression.
      cssMinify: 'lightningcss',
    },
    ssr: {
      // Node-only internals used by some libraries must not be bundled for Workers.
      external: [
        'async_hooks',
        'node:fs',
        'node:fs/promises',
        'node:path',
        'node:url',
        'node:crypto',
      ],
      // Force the bundler to include the project's local Zod version to keep parity with shadcn/ui.
      noExternal: ['zod'],
    },
  },
  i18n: {
    locales: [...SUPPORTED_LOCALES], // ["en", "ja", "de", "es", "pt-br"]
    defaultLocale: DEFAULT_LOCALE, // "en-us"
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  trailingSlash: 'ignore',
  output: 'server',
  prefetch: false,
  security: {
    checkOrigin: true,
  },
  devToolbar: {
    enabled: false,
  },
})
