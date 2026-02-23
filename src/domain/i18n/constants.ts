// Locales Configuration
export const SUPPORTED_LOCALES = ['en', 'ja', 'de', 'es'] as const
export type SupportedLocales = (typeof SUPPORTED_LOCALES)[number]

// Default locale
export const DEFAULT_LOCALE: SupportedLocales = 'en'

// Missing translation banner flag
export const ENABLE_MISSING_TRANSLATION_BANNER = true

// UI Labels
export const LANGUAGES: Record<SupportedLocales, string> = {
  en: 'English',
  ja: '日本語',
  de: 'Deutsch',
  es: 'Español',
}

// Cookie name
export const LANG_COOKIE_NAME = 'lang'
