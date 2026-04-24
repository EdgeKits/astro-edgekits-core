import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execSync } from 'node:child_process'

import {
  parse as parseJsonc,
  printParseErrorCode,
  type ParseError,
} from 'jsonc-parser'

import { DEFAULT_LOCALE } from '../src/domain/i18n/constants'
import {
  buildTranslationKvKey,
  buildTranslationCacheUrl,
} from '../src/domain/i18n/translations-keys'

const ROOT = process.cwd()
const LOCALES_DIR = path.join(ROOT, 'locales')

const OUTPUT_DATA = path.join(ROOT, 'i18n-data.json')
const OUTPUT_TYPES = path.join(ROOT, 'src', 'i18n.generated.d.ts')
const OUTPUT_RUNTIME_CONSTANTS = path.join(
  ROOT,
  'src',
  'domain',
  'i18n',
  'runtime-constants.ts',
)
const OUTPUT_FALLBACKS = path.join(
  ROOT,
  'src',
  'domain',
  'i18n',
  'fallbacks.generated.ts',
)

// Stores per-namespace content hashes from the previous run.
// Used to detect which namespaces actually changed and need cache purging.
// Gitignored — absence means "first run", all namespaces treated as changed.
const HASHES_FILE = path.join(ROOT, '.i18n-hashes.json')

// CLI / env flags
const SHOULD_GENERATE_FALLBACKS =
  process.argv.includes('--fallbacks') ||
  process.env.I18N_GENERATE_FALLBACKS === 'true'

// --deploy-version: push KV + purge changed cache entries after bundling.
// Absent from i18n:bundle — only present in i18n:seed and i18n:migrate.
const SHOULD_DEPLOY_VERSION = process.argv.includes('--deploy-version')

// --local: target local KV (preview_id). Used by i18n:seed, never i18n:migrate.
// Local dev uses I18N_CACHE=off, so no Purge API call is needed.
const IS_LOCAL = process.argv.includes('--local')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TranslationTree = Record<string, unknown>

interface CollectedData {
  [locale: string]: {
    [namespace: string]: TranslationTree
  }
}

// Persisted hash map: "<locale>:<namespace>" → content hash
type HashMap = Record<string, string>

// ---------------------------------------------------------------------------
// Wrangler config reader
// Parses wrangler.jsonc to extract KV namespace IDs and vars by key.
// Single source of truth — no hardcoded IDs or zone IDs in package.json.
// ---------------------------------------------------------------------------

const WRANGLER_CONFIG_PATH = path.join(ROOT, 'wrangler.jsonc')

function readWranglerConfig(): Record<string, unknown> {
  if (!fs.existsSync(WRANGLER_CONFIG_PATH)) {
    console.error(`[i18n] wrangler.jsonc not found at ${WRANGLER_CONFIG_PATH}`)
    process.exit(1)
  }

  const raw = fs.readFileSync(WRANGLER_CONFIG_PATH, 'utf8')

  const errors: ParseError[] = []
  const config = parseJsonc(raw, errors, { allowTrailingComma: true })

  if (!config || typeof config !== 'object') {
    console.error('[i18n] Failed to parse wrangler.jsonc — result is empty.')
    for (const err of errors) {
      const snippet = raw.slice(Math.max(0, err.offset - 10), err.offset + 20)
      console.error(
        `  ${printParseErrorCode(err.error)} at offset ${err.offset}: ...${JSON.stringify(snippet)}...`,
      )
    }
    process.exit(1)
  }

  return config
}

function getKvNamespaceId(binding: string): string {
  const config = readWranglerConfig()
  const kvNamespaces = config.kv_namespaces as
    | Array<{
        binding: string
        id: string
      }>
    | undefined

  const entry = kvNamespaces?.find((kv) => kv.binding === binding)

  if (!entry) {
    console.error(`[i18n] KV binding "${binding}" not found in wrangler.jsonc`)
    process.exit(1)
  }

  return entry.id
}

function getWranglerVar(key: string): string | undefined {
  const config = readWranglerConfig()
  const vars = config.vars as Record<string, string> | undefined
  return vars?.[key]
}

const KV_BINDING = 'TRANSLATIONS'
const KV_ID = getKvNamespaceId(KV_BINDING)

// ---------------------------------------------------------------------------
// 1. Collect translations from locales/<locale>/<namespace>.json
// ---------------------------------------------------------------------------

if (!fs.existsSync(LOCALES_DIR)) {
  console.error(`Locales directory not found: ${LOCALES_DIR}`)
  process.exit(1)
}

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
    `[i18n] No locales with JSON files found in ${LOCALES_DIR}. Generating empty artifacts.`,
  )
}

// ---------------------------------------------------------------------------
// 2. Compute per-namespace content hashes and detect changes
// ---------------------------------------------------------------------------

// Load previous hashes (absent on first run — all namespaces treated as new)
const previousHashes: HashMap = fs.existsSync(HASHES_FILE)
  ? (JSON.parse(fs.readFileSync(HASHES_FILE, 'utf8')) as HashMap)
  : {}

const currentHashes: HashMap = {}
const changedKeys: string[] = [] // "<locale>:<namespace>" pairs that changed

for (const [locale, namespaces] of Object.entries(collected)) {
  for (const [ns, json] of Object.entries(namespaces)) {
    const hashKey = `${locale}:${ns}`
    const hash = computeHash(json)
    currentHashes[hashKey] = hash

    if (previousHashes[hashKey] !== hash) {
      changedKeys.push(hashKey)
    }
  }
}

if (changedKeys.length > 0) {
  console.log(`[i18n] Changed namespaces (${changedKeys.length}):`)
  changedKeys.forEach((k) => console.log(`  - ${k}`))
} else {
  console.log('[i18n] No translation changes detected.')
}

// ---------------------------------------------------------------------------
// 3. Write KV bulk data: i18n-data.json
// ---------------------------------------------------------------------------

type KvBulkEntry = { key: string; value: string }

const bulkData: KvBulkEntry[] = []

for (const [locale, namespaces] of Object.entries(collected)) {
  for (const [ns, json] of Object.entries(namespaces)) {
    bulkData.push({
      key: buildTranslationKvKey(locale as any, ns as any),
      value: JSON.stringify(json),
    })
  }
}

fs.writeFileSync(OUTPUT_DATA, JSON.stringify(bulkData, null, 2) + '\n', 'utf8')

// ---------------------------------------------------------------------------
// 4. Generate src/i18n.generated.d.ts (global I18n.Schema)
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

const namespaceLines = Object.entries(schemaObject).map(([ns, value]) => {
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
// 5. Generate src/domain/i18n/runtime-constants.ts
//    - NAMESPACE_KEYS            -> from schemaSourceLocale (DEFAULT_LOCALE preferred)
//    - LOCALES_WITH_TRANSLATIONS -> from all collected locales
//    - FULLY_TRANSLATED_LOCALES  -> locales that have ALL namespace keys
// ---------------------------------------------------------------------------

const namespaceSource =
  (schemaSourceLocale && collected[schemaSourceLocale]) || {}

const namespaceKeys = Object.keys(namespaceSource).sort()

const fullyTranslatedLocales = localesWithTranslations.filter((locale) => {
  const localeNamespaces = Object.keys(collected[locale] || {})
  return namespaceKeys.every((ns) => localeNamespaces.includes(ns))
})

const runtimeConstantsContent = `// Auto-generated by scripts/bundle-translations.ts
// Do not edit manually.

export const NAMESPACE_KEYS = [${namespaceKeys
  .map((n) => `'${n}'`)
  .join(', ')}] as [string, ...string[]];

export const LOCALES_WITH_TRANSLATIONS = [${localesWithTranslations
  .map((l) => `'${l}'`)
  .join(', ')}] as const;

export const FULLY_TRANSLATED_LOCALES = [${fullyTranslatedLocales
  .map((l) => `'${l}'`)
  .join(', ')}] as const;
`

fs.writeFileSync(OUTPUT_RUNTIME_CONSTANTS, runtimeConstantsContent, 'utf8')

// ---------------------------------------------------------------------------
// 6. Optional: Generate src/domain/i18n/fallbacks.generated.ts
// ---------------------------------------------------------------------------

if (SHOULD_GENERATE_FALLBACKS) {
  const fallbackNamespaces = collected[DEFAULT_LOCALE]

  if (!fallbackNamespaces) {
    console.warn(
      `[i18n] No translations found for DEFAULT_LOCALE="${DEFAULT_LOCALE}". ` +
        'Skipping fallback generation.',
    )
  } else {
    const lines: string[] = []
    lines.push('// Auto-generated by scripts/bundle-translations.ts')
    lines.push('// Do not edit manually.\n')
    lines.push(
      `export const FALLBACK_LOCALE = ${JSON.stringify(DEFAULT_LOCALE)} as const;\n`,
    )

    for (const [ns, json] of Object.entries(fallbackNamespaces)) {
      const constName = `FALLBACK_${ns.toUpperCase()}`
      lines.push(
        `export const ${constName} = ${JSON.stringify(json, null, 2)} as const;\n`,
      )
    }

    fs.writeFileSync(OUTPUT_FALLBACKS, lines.join('\n'), 'utf8')
  }
} else {
  console.log(
    '[i18n] Skipping fallback generation. Enable with I18N_GENERATE_FALLBACKS=true or --fallbacks.',
  )
}

// ---------------------------------------------------------------------------
// 7. Summary of generated files
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

// ---------------------------------------------------------------------------
// 8. Optional: Push to KV + purge changed cache entries via Cloudflare API
//    Skipped entirely during i18n:bundle (pure local codegen, no side effects).
//
//    --deploy-version + --local  → local KV only, no purge (cache is off locally)
//    --deploy-version            → remote KV + Cloudflare Purge API
// ---------------------------------------------------------------------------

if (SHOULD_DEPLOY_VERSION) {
  const kvFlag = IS_LOCAL ? '--local' : '--remote'
  const target = IS_LOCAL ? 'local' : 'remote'

  // Push all translations to KV
  console.log(`[i18n] Pushing translations to ${target} KV...`)
  try {
    execSync(
      `wrangler kv bulk put i18n-data.json ${kvFlag} --namespace-id=${KV_ID}`,
      { stdio: 'inherit' },
    )
    console.log(`[i18n] ✅ KV updated (${target}).`)
  } catch (err) {
    console.error(`[i18n] ❌ Failed to push to ${target} KV.`, err)
    process.exit(1)
  }

  // ---------------------------------------------------------------------------
  // Graceful recovery for the hash file:
  //
  //   We update .i18n-hashes.json ONLY when one of these holds:
  //     - Local run (--local): no edge cache exists, purge is not applicable.
  //     - Remote run with no changes: nothing needed purging to begin with.
  //     - Remote run with a successful purge of all changed URLs.
  //
  //   If a remote purge was attempted but failed (network error, rate limit
  //   saturation, API error, missing credentials), we DO NOT write the file.
  //   This way, the next run of i18n:migrate will see the same diff as this
  //   one and re-attempt the invalidation automatically. No manual intervention,
  //   no silent cache staleness.
  // ---------------------------------------------------------------------------

  let shouldWriteHashes = false

  if (IS_LOCAL) {
    // Local: no purge is applicable, always update hashes.
    shouldWriteHashes = true
  } else if (changedKeys.length === 0) {
    // Remote, but nothing changed — nothing to purge, safe to update hashes.
    console.log('[i18n] No cache entries to purge.')
    shouldWriteHashes = true
  } else {
    // Remote run with changes — purge must succeed before we update hashes.
    // ---------------------------------------------------------------------------
    // Load .dev.vars into process.env for local script execution.
    // wrangler dev reads .dev.vars automatically for the Worker runtime, but
    // Node.js / tsx does not — so we parse it manually here.
    // ---------------------------------------------------------------------------

    const devVarsPath = path.join(ROOT, '.dev.vars')
    if (fs.existsSync(devVarsPath)) {
      const lines = fs.readFileSync(devVarsPath, 'utf8').split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIndex = trimmed.indexOf('=')
        if (eqIndex === -1) continue
        const key = trimmed.slice(0, eqIndex).trim()
        const value = trimmed.slice(eqIndex + 1).trim()
        // Never overwrite variables already set in the real environment
        if (key && !(key in process.env)) {
          process.env[key] = value
        }
      }
    }

    // Build Purge API URLs for changed locale:namespace pairs
    const purgeUrls = changedKeys.map((hashKey) => {
      const [locale, ns] = hashKey.split(':') as [string, string]
      return buildTranslationCacheUrl(locale as any, ns as any)
    })

    const zoneId =
      getWranglerVar('CLOUDFLARE_ZONE_ID') || process.env.CLOUDFLARE_ZONE_ID

    const apiToken = process.env.CLOUDFLARE_CACHEPURGE_API_TOKEN

    if (!zoneId) {
      console.warn(
        '[i18n] ⚠️  CLOUDFLARE_ZONE_ID not found in wrangler.jsonc vars or environment. ' +
          'Skipping cache purge — hash file NOT updated. Re-run i18n:migrate after setting the variable.',
      )
    } else if (!apiToken) {
      console.warn(
        '[i18n] ⚠️  CLOUDFLARE_CACHEPURGE_API_TOKEN not set in environment. ' +
          'Skipping cache purge — hash file NOT updated. Re-run i18n:migrate after setting the secret.',
      )
    } else {
      console.log(
        `[i18n] Purging ${purgeUrls.length} cache entries via Cloudflare API...`,
      )
      const purgeSuccess = await purgeTranslationsCache(
        zoneId,
        apiToken,
        purgeUrls,
      )

      if (purgeSuccess) {
        console.log('[i18n] ✅ Cache purge completed.')
        shouldWriteHashes = true
      } else {
        console.error(
          '[i18n] ❌ Cache purge failed — hash file NOT updated. ' +
            'Re-run i18n:migrate to retry the same invalidation.',
        )
        // Non-fatal for KV: translations are already pushed. Cache will
        // converge on the next successful i18n:migrate run.
      }
    }
  }

  if (shouldWriteHashes) {
    fs.writeFileSync(
      HASHES_FILE,
      JSON.stringify(currentHashes, null, 2) + '\n',
      'utf8',
    )
    console.log('[i18n] ✅ .i18n-hashes.json updated.')
  }
} else {
  console.log(
    '[i18n] Skipping KV deploy. Enable with --deploy-version (add --local for local dev).',
  )
}

// ---------------------------------------------------------------------------
// Cloudflare Cache Purge API
// ---------------------------------------------------------------------------

/**
 * Purge a list of URLs from Cloudflare's edge cache via the Purge API.
 *
 * Handles Cloudflare's rate limits automatically:
 *   - Max 100 URLs per request (max operations per request)
 *   - Max 800 URLs per second on Free plan (8 chunks of 100)
 *
 * Reference: https://developers.cloudflare.com/cache/how-to/purge-cache/
 *
 * @returns true if all chunks succeeded, false if any chunk failed
 */
async function purgeTranslationsCache(
  zoneId: string,
  apiToken: string,
  urls: string[],
): Promise<boolean> {
  if (!urls.length) return true

  // Cloudflare limit: max 100 URLs per single purge request
  const CHUNK_SIZE = 100

  // Cloudflare Free plan limit: 800 URLs/sec = 8 chunks of 100 per second
  // Pro and above: 1500 URLs/sec — CHUNK_SIZE * MAX_CHUNKS_PER_SEC covers Free plan
  const MAX_CHUNKS_PER_SEC = 8

  console.log(`[i18n] Purging cache for ${urls.length} URL(s)...`)

  for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
    const chunk = urls.slice(i, i + CHUNK_SIZE)
    const currentChunkIndex = Math.floor(i / CHUNK_SIZE) + 1

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ files: chunk }),
        },
      )

      // Rate limit hit — wait and retry the same chunk
      if (response.status === 429) {
        console.warn(
          `[i18n] [Chunk ${currentChunkIndex}] Rate limit hit, waiting 1000ms before retry...`,
        )
        await sleep(1000)
        i -= CHUNK_SIZE // retry same chunk
        continue
      }

      if (!response.ok) {
        const errorData = await response.text()
        console.error(
          `[i18n] [Chunk ${currentChunkIndex}] Cloudflare API error:`,
          errorData,
        )
        return false
      }

      console.log(
        `[i18n] [Chunk ${currentChunkIndex}] Purged ${chunk.length} URL(s).`,
      )

      // After sending MAX_CHUNKS_PER_SEC chunks (= 800 URLs), pause for 1 second
      // to stay within the Free plan rate limit before the next batch
      if (
        currentChunkIndex % MAX_CHUNKS_PER_SEC === 0 &&
        i + CHUNK_SIZE < urls.length
      ) {
        console.log(
          `[i18n] Reached 800 URL/sec limit. Waiting 1000ms before next batch...`,
        )
        await sleep(1000)
      }
    } catch (error) {
      console.error(
        `[i18n] [Chunk ${currentChunkIndex}] Network error calling Cloudflare API:`,
        error,
      )
      return false
    }
  }

  return true
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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

function computeHash(value: unknown): string {
  const json = stableStringify(value)
  return crypto.createHash('sha256').update(json).digest('hex').slice(0, 12)
}
