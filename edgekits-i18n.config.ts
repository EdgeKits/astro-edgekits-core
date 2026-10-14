import { defineI18nConfig } from '@edgekits/astro-i18n/config'

export default defineI18nConfig({
  // The keys are the locales (lowercase); countryCode picks the flag in public/flags/.
  languages: {
    en: { countryCode: 'us', name: 'English' },
    de: { countryCode: 'de', name: 'Deutsch' },
    es: { countryCode: 'es', name: 'Español' },
    ja: { countryCode: 'jp', name: '日本語' },
    'pt-br': { countryCode: 'br', name: 'Português (Brasil)' },
  },
  defaultLocale: 'en',
  // The language cookie: set by the LanguageSwitcher, kept in sync by the middleware.
  cookie: { name: 'lang', maxAge: 60 * 60 * 24 * 365 },
  // Prefix of every KV key and the host of every edge-cache URL.
  keyPrefix: 'astro-edgekits-core',
  missingTranslationBanner: true,
  routing: 'prefix',
})
