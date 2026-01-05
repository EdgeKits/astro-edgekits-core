import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

import { PROJECT_ID, DEFAULT_LOCALE } from '../src/utils/constants'

const ROOT = process.cwd()
const LOCALES_DIR = path.join(ROOT, 'src', 'locales')

const OUTPUT_DATA = path.join(ROOT, 'i18n-data.json')
const OUTPUT_TYPES = path.join(ROOT, 'src', 'i18n.generated.d.ts')
const OUTPUT_RUNTIME_CONSTANTS = path.join(
  ROOT,
  'src',
  'utils',
  'i18n',
  'runtime-constants.ts',
)
const OUTPUT_FALLBACKS = path.join(
  ROOT,
  'src',
  'utils',
  'i18n',
  'fallbacks.generated.ts',
)

// CLI / env flag to control fallback generation
const SHOULD_GENERATE_FALLBACKS =
  process.argv.includes('--fallbacks') ||
  process.env.I18N_GENERATE_FALLBACKS === 'true'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TranslationTree = Record<string, unknown>

interface CollectedData {
  [locale: string]: {
    [namespace: string]: TranslationTree
  }
}

// ---------------------------------------------------------------------------
// 1. Collect translations from src/locales/<locale>/<namespace>.json
// ---------------------------------------------------------------------------

if (!fs.existsSync(LOCALES_DIR)) {
  console.error(`Locales directory not found: ${LOCALES_DIR}`)
  process.exit(1)
}

// Locales that actually contain at least one JSON file
const localeDirs = fs
  .readdirSync(LOCALES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((locale) => {
    const fullPath = path.join(LOCALES_DIR, locale)
    const files = fs.readdirSync(fullPath, { withFileTypes: true })
    return files.some((f) => f.isFile() && f.name.endsWith('.json'))
  })

const collected: CollectedData = {}

for (const locale of localeDirs) {
  const localeDir = path.join(LOCALES_DIR, locale)
  const files = fs
    .readdirSync(localeDir, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name.endsWith('.json'))

  for (const file of files) {
    const namespace = path.basename(file.name, '.json')
    const fullPath = path.join(localeDir, file.name)
    const raw = fs.readFileSync(fullPath, 'utf8')
    const json = JSON.parse(raw) as TranslationTree

    if (!collected[locale]) collected[locale] = {}
    collected[locale][namespace] = json
  }
}

const localesWithTranslations = Object.keys(collected).sort()

if (localesWithTranslations.length === 0) {
  console.warn(
    '[i18n] No locales with JSON files found in src/locales. Generating empty artifacts.',
  )
}

// ---------------------------------------------------------------------------
// 2. Write KV bulk data: i18n-data.json
// ---------------------------------------------------------------------------

type KvBulkEntry = { key: string; value: string }

const bulkData: KvBulkEntry[] = []

for (const [locale, namespaces] of Object.entries(collected)) {
  for (const [ns, json] of Object.entries(namespaces)) {
    const key = `${PROJECT_ID}:${ns}:${locale}`
    const value = JSON.stringify(json)
    bulkData.push({ key, value })
  }
}

fs.writeFileSync(OUTPUT_DATA, JSON.stringify(bulkData, null, 2) + '\n', 'utf8')

// ---------------------------------------------------------------------------
// 3. Generate src/i18n.generated.d.ts (global I18n.Schema)
//    Source of truth: DEFAULT_LOCALE if present, otherwise first available.
// ---------------------------------------------------------------------------

function generateSchemaTs(schema: TranslationTree, indent = 4): string {
  const pad = ' '.repeat(indent)
  const padInner = ' '.repeat(indent + 2)

  if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
    const entries = Object.entries(schema)
    if (entries.length === 0) return '{}'

    const lines = entries.map(([key, value]) => {
      const valueTs =
        value && typeof value === 'object' && !Array.isArray(value)
          ? generateSchemaTs(value as TranslationTree, indent + 2)
          : 'string'
      return `${padInner}${JSON.stringify(key)}: ${valueTs}`
    })

    return `{\n${lines.join(';\n')};\n${pad}}`
  }

  return 'string'
}

let schemaSourceLocale: string | undefined

if (collected[DEFAULT_LOCALE]) {
  schemaSourceLocale = DEFAULT_LOCALE
} else if (localesWithTranslations.length > 0) {
  schemaSourceLocale = localesWithTranslations[0]
  console.warn(
    `[i18n] DEFAULT_LOCALE="${DEFAULT_LOCALE}" has no translation files. ` +
      `Using "${schemaSourceLocale}" as the source for I18n.Schema.`,
  )
}

const schemaObject: TranslationTree =
  (schemaSourceLocale && collected[schemaSourceLocale]) || {}

const namespaceEntries = Object.entries(schemaObject)

const namespaceLines = namespaceEntries.map(([ns, value]) => {
  const valueTs = generateSchemaTs(value as TranslationTree, 10)
  return `      ${JSON.stringify(ns)}: ${valueTs}`
})

const interfaceBody =
  namespaceLines.length > 0
    ? `    export interface Schema {\n${namespaceLines.join(';\n')};\n    }`
    : `    export interface Schema {}`

const typesContent = `// Auto-generated by scripts/bundle-translations.ts
// Do not edit manually.

declare global {
  namespace I18n {
${interfaceBody}
  }
}

export {}
`

fs.writeFileSync(OUTPUT_TYPES, typesContent, 'utf8')

// ---------------------------------------------------------------------------
// 4. Generate src/utils/i18n/runtime-constants.ts
//    - NAMESPACE_KEYS             -> from schemaSourceLocale (DEFAULT_LOCALE preferred)
//    - LOCALES_WITH_TRANSLATIONS  -> from all collected locales
// ---------------------------------------------------------------------------

// Normalize the namespace source to a non-undefined object
const namespaceSource =
  (schemaSourceLocale && collected[schemaSourceLocale]) || {}

const namespaceKeys = Object.keys(namespaceSource).sort()

// Build the translations version based on the actual translation content.
// If translations do not change, this value stays the same across runs.
const translationsVersion = computeTranslationsVersion(collected)
console.log('[i18n] TRANSLATIONS_VERSION =', translationsVersion)

const runtimeConstantsContent = `// Auto-generated by scripts/bundle-translations.ts
// Do not edit manually.

export const NAMESPACE_KEYS = [${namespaceKeys
  .map((n) => `'${n}'`)
  .join(', ')}] as [string, ...string[]];

export const LOCALES_WITH_TRANSLATIONS = [${localesWithTranslations
  .map((l) => `'${l}'`)
  .join(', ')}] as const;

/**
 * Monotonic translation bundle version.
 *
 * Updated on every \`npm run i18n:bundle\` run, based on the current timestamp.
 * Used for edge-cache invalidation in fetcher.ts.
 */
export const TRANSLATIONS_VERSION = '${translationsVersion}'
`

fs.writeFileSync(OUTPUT_RUNTIME_CONSTANTS, runtimeConstantsContent, 'utf8')

// ---------------------------------------------------------------------------
// 5. Optional: Generate src/utils/i18n/fallbacks.generated.ts
//    from DEFAULT_LOCALE JSON (one const per namespace)
// ---------------------------------------------------------------------------

if (SHOULD_GENERATE_FALLBACKS) {
  const fallbackLocale = DEFAULT_LOCALE
  const fallbackNamespaces = collected[fallbackLocale]

  if (!fallbackNamespaces) {
    console.warn(
      `[i18n] No translations found for DEFAULT_LOCALE="${fallbackLocale}". ` +
        'Skipping fallback generation.',
    )
  } else {
    const lines: string[] = []

    lines.push('// Auto-generated by scripts/bundle-translations.ts')
    lines.push('// Do not edit manually.\n')
    lines.push(
      `export const FALLBACK_LOCALE = ${JSON.stringify(
        fallbackLocale,
      )} as const;\n`,
    )

    for (const [ns, json] of Object.entries(fallbackNamespaces)) {
      const constName = `FALLBACK_${ns.toUpperCase()}`
      const literal = JSON.stringify(json, null, 2)
      lines.push(`export const ${constName} = ${literal} as const;\n`)
    }

    const fallbacksContent = lines.join('\n')
    fs.writeFileSync(OUTPUT_FALLBACKS, fallbacksContent, 'utf8')
  }
} else {
  console.log(
    '[i18n] Skipping fallback generation. Enable with I18N_GENERATE_FALLBACKS=true or --fallbacks.',
  )
}

// ---------------------------------------------------------------------------
// 6. Summary
// ---------------------------------------------------------------------------

const outputs = [
  OUTPUT_DATA,
  OUTPUT_TYPES,
  OUTPUT_RUNTIME_CONSTANTS,
  SHOULD_GENERATE_FALLBACKS ? OUTPUT_FALLBACKS : null,
].filter(Boolean) as string[]

console.log(
  'Generated:\n' + outputs.map((p) => `- ${path.relative(ROOT, p)}`).join('\n'),
)

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']'
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => a.localeCompare(b),
  )

  return (
    '{' +
    entries
      .map(([k, v]) => JSON.stringify(k) + ':' + stableStringify(v))
      .join(',') +
    '}'
  )
}

function computeTranslationsVersion(bundle: unknown): string {
  const json = stableStringify(bundle)
  const hash = crypto.createHash('sha256').update(json).digest('hex')
  // Shorten for readability; 8–12 chars is usually enough
  return hash.slice(0, 12)
}
