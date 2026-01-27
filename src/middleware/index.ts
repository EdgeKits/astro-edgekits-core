import { sequence } from 'astro:middleware'
import { i18nMiddleware } from './i18n'
import { localeMiddleware } from './localeToAstroLocals.ts'
import { demoProtectionMiddleware } from './demoProtectionMiddleware.ts'

export const onRequest = sequence(
  i18nMiddleware,
  localeMiddleware,
  demoProtectionMiddleware, // see the explanation inside
)
