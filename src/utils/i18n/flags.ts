import type { SupportedLocales } from './constants'

// List of flag codes for which there are corresponding
// SVGs in the /assets/icons/flags directory
export const FLAG_CODES = ['us', 'jp', 'de', 'es'] as const
export type FlagCode = (typeof FLAG_CODES)[number]

// Explicit locale → flag mapping
export const localeToFlagCode: Record<SupportedLocales, FlagCode> = {
  en: 'us',
  ja: 'jp',
  de: 'de',
  es: 'es',
}
