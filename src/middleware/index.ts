import { sequence } from 'astro:middleware'
import { i18nMiddleware } from '../domain/i18n/middleware/i18n.ts'
import { demoProtectionMiddleware } from './demoProtectionMiddleware'

export const onRequest = sequence(
  i18nMiddleware,
  demoProtectionMiddleware, // see the explanation inside
)
