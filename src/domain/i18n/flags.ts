import type { Locale } from '@/domain/i18n/schema'

// Explicit locale → flag mapping
export const FLAG_CODES = {
  en: 'us',
  ja: 'jp',
  de: 'de',
  es: 'es',
} as const

export type FlagCode = (typeof FLAG_CODES)[keyof typeof FLAG_CODES]

export const localeToFlagCode = (locale: Locale): FlagCode | null => {
  return FLAG_CODES[locale as keyof typeof FLAG_CODES] || null
}
