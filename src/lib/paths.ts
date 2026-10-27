import { DEFAULT_LOCALE, I18N_CONFIG, SUPPORTED_LOCALES } from '@edgekits/astro-i18n/runtime'

// The options `localizedPath` takes, from the config: the mode lives here, not in components.
export const pathOptions = {
  routing: I18N_CONFIG.routing,
  defaultLocale: DEFAULT_LOCALE,
  isLocale: (segment: string) => (SUPPORTED_LOCALES as readonly string[]).includes(segment),
}
