import type { AstroGlobal } from 'astro'

import type { Locale } from '@/domain/i18n/constants'
import { LocaleSchema } from './schema'
import { DEFAULT_LOCALE, ENABLE_MISSING_TRANSLATION_BANNER } from './constants'
import {
  LOCALES_WITH_TRANSLATIONS,
  FULLY_TRANSLATED_LOCALES,
} from './runtime-constants'

// Checking for the presence of at least one file with translations
function hasTranslations(locale: Locale): boolean {
  return (LOCALES_WITH_TRANSLATIONS as readonly string[]).includes(locale)
}

// Checking the completeness of translations
function isFullyTranslated(locale: Locale): boolean {
  return (FULLY_TRANSLATED_LOCALES as readonly string[]).includes(locale)
}

/**
 * Optional: return a “missing translation” banner message
 * when uiLocale has no translations or (blog) content is missing in required language.
 *
 * Returns:
 *   - MissingTranslationType: type of message to show ('ui' or 'content')
 *   - null: if banner should not be shown
 */
type MissingTranslationType = 'ui' | 'content' | null

export function checkMissingTranslation(
  uiLocale: Locale,
  isMissingContent: boolean | undefined,
): MissingTranslationType {
  if (!ENABLE_MISSING_TRANSLATION_BANNER) return null

  if (isFullyTranslated(uiLocale) && !isMissingContent) return null

  return isMissingContent ? 'content' : 'ui'
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
