export type Language = { countryCode: string; name: string }

// The only source of truth - add new languages here
export const LANGUAGES = {
  en: { countryCode: 'us', name: 'English (US)' },
  de: { countryCode: 'de', name: 'Deutsch' },
  es: { countryCode: 'es', name: 'Español' },
  'pt-br': { countryCode: 'br', name: 'Português (Br)' },
  ja: { countryCode: 'jp', name: '日本語' },
} as const

export type Locale = keyof typeof LANGUAGES

// Locales Configuration
export const SUPPORTED_LOCALES = Object.keys(LANGUAGES) as [Locale, ...Locale[]]

// export const SUPPORTED_LOCALES = ['en', 'de', 'es', 'pt-br', 'ja'] as const
export type SupportedLocales = (typeof SUPPORTED_LOCALES)[number]

// Default locale
export const DEFAULT_LOCALE: SupportedLocales = 'en'

// Missing translation banner flag
export const ENABLE_MISSING_TRANSLATION_BANNER = true

// Cookie name
export const LANG_COOKIE_NAME = 'lang'
