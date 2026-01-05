import type { MiddlewareHandler } from 'astro'
import { resolveLocaleForTranslations } from '@/utils/i18n/resolve-locale'

export const localeMiddleware: MiddlewareHandler = async (ctx, next) => {
  const translationLocale = resolveLocaleForTranslations(ctx.locals.uiLocale)

  ctx.locals.translationLocale = translationLocale

  return next()
}
