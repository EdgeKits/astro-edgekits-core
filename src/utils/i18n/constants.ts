// Locales Configuration
export const SUPPORTED_LOCALES = ['en', 'ja', 'de', 'es', 'pt'] as const
export type SupportedLocales = (typeof SUPPORTED_LOCALES)[number]

// Default locale
export const DEFAULT_LOCALE: SupportedLocales = 'en'

// Missing translation banner flag
export const ENABLE_MISSING_TRANSLATION_BANNER = true

// Missing translation banner message (write it in DEFAULT_LOCALE language)
export const DEFAULT_MISSING_TRANSLATION_MESSAGE =
  'Sorry, this page is not yet available in your selected language.'

// UI Labels
export const LANGUAGES: Record<SupportedLocales, string> = {
  en: 'English',
  ja: '日本語',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
}

// Cookie name
export const LANG_COOKIE_NAME = 'lang'
