// @ts-check
import { defineConfig } from 'astro/config'
import type { PluginOption } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'
import mdx from '@astrojs/mdx'

import {
  PROJECT_ID,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
} from './src/utils/constants'

const enableClientPrerender = process.env.ASTRO_CLIENT_PRERENDER === '1'

export default defineConfig({
  site: `https://${PROJECT_ID}`,
  // Dev-only: emulate Cloudflare runtime in `astro dev` using your wrangler config.
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      configPath: 'wrangler.jsonc',
      // persist: {
      //   path: './.cache/wrangler/v3',
      // },
    },
    // Use Cloudflare's image service for SSR compatibility on Workers.
    // Does not work in local dev (?)
    imageService: 'cloudflare',
  }),
  experimental: {
    // Safer default for a public starter; opt-in via env when needed.
    clientPrerender: enableClientPrerender,
  },
  integrations: [react(), mdx()],
  vite: {
    plugins: [
      // Important: This is a collision between two different Vite.Plugin types from different node_modules.
      // Everything is correct at runtime; the incompatibility is only at the d.ts level.
      // @ts-expect-error: tailwindcss() is compatible with the Vite plugin at runtime.
      tailwindcss() as PluginOption,
    ],
    resolve: {
      // Use the edge-compatible React DOM server bundle only in production.
      alias:
        process.env.NODE_ENV === 'production'
          ? { 'react-dom/server': 'react-dom/server.edge' }
          : {},
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
    locales: [...SUPPORTED_LOCALES], // ["en", "ja", "de", "es"]
    defaultLocale: DEFAULT_LOCALE, // "en"
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  trailingSlash: 'ignore',
  output: 'server',
  prefetch: true,
  security: {
    checkOrigin: true,
  },
  devToolbar: {
    enabled: false,
  },
})
