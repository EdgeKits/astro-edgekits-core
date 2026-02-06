import { sequence } from 'astro:middleware'
import { i18nMiddleware } from './i18n'
import { localeMiddleware } from './localeToAstroLocals'
import { demoProtectionMiddleware } from './demoProtectionMiddleware'

export const onRequest = sequence(
  i18nMiddleware,
  localeMiddleware,
  demoProtectionMiddleware, // see the explanation inside
)
