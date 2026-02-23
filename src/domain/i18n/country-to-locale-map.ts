import type { Locale } from './schema.ts'

// Key: ISO 3166-1 Alpha-2 Country Code (from request.cf.country)
// Value: The optimal language to serve
const GEO_MAP: Record<string, Locale> = {
  // --- ANGLOSPHERE (Explicitly set to EN) ---
  US: 'en', // United States
  GB: 'en', // United Kingdom
  AU: 'en', // Australia
  NZ: 'en', // New Zealand
  IE: 'en', // Ireland
  CA: 'en', // Canada (Majority EN, fallbacks handle FR better via Accept-Language headers)

  // --- DACH (German) ---
  DE: 'de',
  AT: 'de',
  CH: 'de',
  LI: 'de',

  // --- LATAM + SPAIN ---
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  VE: 'es',
  GT: 'es',
  EC: 'es',

  // Asia
  JP: 'ja',

  // --- LUSOPHONE (Portuguese) ---
  // PT: 'pt',
  // BR: 'pt',
  // AO: 'pt',
  // MZ: 'pt',

  // --- FRANCOPHONE ---
  //   FR: 'fr',
  //   BE: 'fr',
  //   MC: 'fr',
  //   SN: 'fr',

  // --- SLAVIC / POST-SOVIET ---
  //   UA: 'uk',
  //   RU: 'ru',
  //   KZ: 'ru',
  //   BY: 'ru',

  // Add other mappings as needed...
}

/**
 * Maps a Cloudflare Country Code to a supported App Locale.
 * Returns undefined if no direct mapping exists (falling back to default strategy).
 */
export function mapCountryToLocale(country: unknown): string | undefined {
  // Safety: In dev mode (localhost), 'country' might be null or undefined.
  if (typeof country !== 'string') return undefined

  // Cloudflare always sends uppercase (e.g., 'US', 'DE'), but safety first.
  const code = country.toUpperCase()

  return GEO_MAP[code]
}
