// Sanitizer: Turns <script> into &lt;script&gt;
function escapeHtml(unsafe: string | number): string {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

type TemplateValues = Record<string, string | number>

/**
 * Interpolates {placeholders} in a template string and escapes values.
 * - If `template` is undefined/null, returns an empty string (and logs in dev).
 * - If `values` is undefined, returns the template unchanged.
 */
export function fmt(
  template: string | null | undefined,
  values?: TemplateValues,
): string {
  if (template == null) {
    if (!import.meta.env.PROD) {
      console.warn('[i18n] fmt() called with null/undefined template')
    }
    return ''
  }

  if (!values) return template

  return template.replace(/{([^}]+)}/g, (match, key) => {
    const replacement = values[key]

    if (replacement === undefined || replacement === null) {
      return match
    }

    return escapeHtml(replacement)
  })
}

/**
 * Simple two-form plural helper.
 * Good for English-like languages where "1" vs "other" is enough.
 */
export function plural(
  count: number,
  singular: string,
  plural: string,
): string {
  return count === 1 ? singular : fmt(plural, { count })
}

/**
 * ICU-style plural categories used by Intl.PluralRules.
 */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'

export type PluralPatterns = Partial<Record<PluralCategory, string>>

/**
 * Advanced plural helper using Intl.PluralRules + fmt().
 *
 * - `locale` controls plural categories (en, de, es, ja, ...).
 * - `patterns` comes from KV (e.g. { zero, one, other }).
 * - Missing categories fall back to `other`.
 *
 * Example:
 *   pluralIcu(5, 'en', {
 *     zero: 'No items',
 *     one: '{count} item',
 *     other: '{count} items'
 *   })
 */
export function pluralIcu(
  count: number,
  locale: string,
  patterns: PluralPatterns,
): string {
  const rules = new Intl.PluralRules(locale)
  const cat = rules.select(count) as PluralCategory

  const template =
    patterns[cat] ??
    patterns.other ??
    (import.meta.env.PROD
      ? ''
      : (console.warn('[i18n] pluralIcu(): missing "other" pattern'), ''))

  return fmt(template, { count })
}

// Used in the LanguageSwitcher and SeoHreflangs components
export function replaceLocaleInPath(
  currentPath: string,
  currentLocale: string,
  newLocale: string,
): string {
  const prefixRegex = new RegExp(`^/${currentLocale}/`)
  return currentPath.replace(prefixRegex, `/${newLocale}/`)
}

// Used in the LanguageSwitcher component
export function getLangFromUrl(pathname: string) {
  // Remove leading/trailing slashes: '/en/about/' -> 'en/about'
  const cleaned = pathname.replace(/^\/+|\/+$/g, '')
  const [lang] = cleaned.split('/')
  return lang
}
