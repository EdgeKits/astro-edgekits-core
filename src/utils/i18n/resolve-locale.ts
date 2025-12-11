import type { AstroGlobal } from 'astro'

import { LocaleSchema, type Locale } from './schemas'
import {
  DEFAULT_LOCALE,
  ENABLE_MISSING_TRANSLATION_BANNER,
  DEFAULT_MISSING_TRANSLATION_MESSAGE,
} from './constants'
import { LOCALES_WITH_TRANSLATIONS } from './runtime-constants'

function hasTranslations(locale: Locale): boolean {
  return (LOCALES_WITH_TRANSLATIONS as readonly string[]).includes(locale)
}

/**
 * UI / routing locale:
 * - What user selected
 * - What is used for <html lang>, URL, etc.
 */
export function resolveLocale(Astro: AstroGlobal): Locale {
  const raw = Astro.currentLocale ?? DEFAULT_LOCALE
  const parsed = LocaleSchema.safeParse(raw)
  return parsed.success ? parsed.data : DEFAULT_LOCALE
}

/**
 * Translation locale:
 * - What we actually load from KV
 * - Falls back if there is no bundle for the UI locale
 */
export function resolveLocaleForTranslations(locale: Locale): Locale {
  return hasTranslations(locale) ? locale : DEFAULT_LOCALE
}

/**
 * Optional: return a “missing translation” banner message
 * when uiLocale has no translations.
 *
 * Returns:
 *   - string: message to show
 *   - null: if banner should not be shown
 */
export function getMissingTranslationBanner(uiLocale: Locale): string | null {
  if (!ENABLE_MISSING_TRANSLATION_BANNER) return null

  // If this locale already has translations, no banner
  if (hasTranslations(uiLocale)) return null

  // Otherwise display default message
  return DEFAULT_MISSING_TRANSLATION_MESSAGE
}
