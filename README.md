<div align="center">
  <img src="./.github/assets/banner.jpg" alt="EdgeKits Core Astro Starter Banner" width="100%" />
</div>

# ⚡ Zero-JS i18n Astro Starter for Cloudflare Workers

**Astro + Cloudflare Workers + KV + Type-Safe i18n**

EdgeKits Core is a minimal, production-ready starter designed for developers building **internationalized** Astro sites on **Cloudflare Workers**.

It provides:

- **Zero-JS i18n** (server-side only)
- **Astro middleware–based locale routing**
- **Cloudflare KV–backed translations**
- **Full TypeScript schema auto-generation**
- **Optional fallback dictionaries** (auto-generated)
- **Composable utilities** (cookies, formatting, merging, locale resolution)
- **Clean project structure**

👉 Ideal for building multilingual SaaS marketing sites, docs, landing pages, and platforms deployed on Cloudflare.

---

# ✨ Features

### ✔ Zero-JS i18n (SSR only)

No client bundles, no hydration — all rendering happens at the edge.

### ✔ Cloudflare KV as translation storage

Translations are stored in KV under keys like:

```
<PROJECT_ID>:<namespace>:<locale>
```

Loaded at request time with caching.

### ✔ Fully typed i18n schema

- Translations are validated and typed based on **DEFAULT_LOCALE**.
- The entire `I18n.Schema` is auto-generated from JSON files.

### ✔ Locale routing via Astro middleware

Supports:

- `/en/...`
- `/de/...`
- `/ja/...` (even if translation files are missing)

### ✔ Optional fallback dictionaries

Generate fallback translations from **DEFAULT_LOCALE**, so the app never breaks even if KV is empty or unavailable.

### ✔ Clean DX: simple scripts

```
npm run i18n:bundle
npm run i18n:seed
npm run i18n:migrate

npm run i18n:bundle:fallbacks
npm run i18n:seed:fallbacks
npm run i18n:migrate:fallbacks
```

---

# 🚀 Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/EdgeKits/astro-edgekits-core.git
cd astro-edgekits-core
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure i18n

Add the required i18n settings in your `astro.config.mjs`:

```ts
i18n: {
  locales: [...SUPPORTED_LOCALES], // ["en", "ja", "de", "es"]
  defaultLocale: DEFAULT_LOCALE,   // "en"
  routing: {
    prefixDefaultLocale: true,
    redirectToDefaultLocale: false,
  },
},
```

**Important:**

EdgeKits Core currently supports only two-letter ISO 639-1 locales ("en", "ja", "de", "es").
Do not use region-based locales ("pt-BR", "en-US", "zh-CN", etc.) — Astro will accept them, but the i18n system will not, and translation loading will fail silently.

The `SUPPORTED_LOCALES` and `DEFAULT_LOCALE` constants are defined in `/src/utils/i18n/constants.ts`.

### 4. Configure Worker KV

```bash
npm run setup
```

Then create a KV namespace and wire its ID into `wrangler.jsonc` as described in
**“Creating KV namespaces (local + dashboard)”** below.

### 5. Seed translations (local)

```bash
npm run i18n:seed
```

This:

- Builds i18n artifacts
- Creates `i18n-data.json`
- Uploads it to your **local** KV namespace

### 6. Start local dev server

```bash
npm run dev
```

Open:

```txt
http://localhost:4321/en/
http://localhost:4321/de/
http://localhost:4321/es/
http://localhost:4321/ja/
```

or just:

```txt
http://localhost:4321/
```

---

## Creating KV namespaces (local + dashboard)

EdgeKits Core relies on a single KV namespace bound as `TRANSLATIONS`.
You can create it via the Wrangler CLI (recommended for local dev) or via the Cloudflare Dashboard.

### 1) Local development (Wrangler CLI)

From the project root:

```bash
npx wrangler kv namespace create TRANSLATIONS
```

This command:

- Creates a KV namespace in your Cloudflare account (or in Miniflare when using `wrangler dev`).
- Prints an `id = ...` value — copy this into `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "TRANSLATIONS",
    "id": "<KV_NAMESPACE_ID>",
    "preview_id": "<KV_NAMESPACE_ID>" // for this starter you can reuse the same ID
  }
]
```

For this starter, using the same ID for `id` and `preview_id` is perfectly fine.

### 2) Cloudflare Dashboard (production / staging)

If you prefer the UI or are preparing a production namespace:

1. Open the Workers KV page:
   `https://dash.cloudflare.com/<ACCOUNT_ID>/workers/kv/namespaces`.
2. Click **“Create namespace”**.
3. Enter a name, e.g. `edgekits-core-translations`.
4. Click **Create**.
5. Copy the **Namespace ID** and paste it into `wrangler.jsonc` under the `TRANSLATIONS` binding:

```jsonc
"kv_namespaces": [
  {
    "binding": "TRANSLATIONS",
    "id": "<PROD_KV_NAMESPACE_ID>",
    "preview_id": "<DEV_OR_PREVIEW_KV_NAMESPACE_ID>"
  }
]
```

You can maintain separate namespace IDs for dev/preview/prod, but the minimum requirement for this starter is **at least one working ID wired into `wrangler.jsonc` under the `TRANSLATIONS` binding**.

---

# 🗂 Project Structure

```txt
src/
  assets/                        # Logos, icons, hero images, etc.
  components/
    islands/                     # React Islands (FeatureCard, Newsletter, LocalizedCounter, ...)
    ...                          # Other Astro/React UI components
  content/
    blog/                        # MDX posts (localized via [lang] segment in routes)
  layouts/
    BaseLayout.astro             # Shared HTML shell: <html lang>, header, footer, SEO
  lib/                           # Optional shared helpers for content/MDX (if needed)

  locales/                       # JSON translations grouped by locale + namespace
    en/
      common.json
      landing.json
      blog.json
    de/
      common.json
      landing.json
      blog.json
    es/
      common.json
      landing.json
      blog.json
    ja/
      common.json
      landing.json
      blog.json

  middleware/
    i18n.ts                      # URL locale routing (prefix/redirect logic)
    localeToAstroLocals.ts       # Writes uiLocale + translationLocale to Astro.locals
    index.ts                     # Combines middleware via sequence()

  pages/
    [lang]/                      # Locale-aware routes
      index.astro                # Landing page demo (Astro + React Islands)
      about.astro                # About page example
      blog/
        index.astro              # Localized blog index
        [...slug].astro          # Localized blog post reader using Content Collections

  styles/
    global.css                   # Tailwind layers, theme tokens, base typography, utilities

  utils/
    cookies/
      server.ts                  # Cookie helpers (setCookieLang, getCookieLang)

    i18n/
      constants.ts               # PROJECT_ID, SUPPORTED_LOCALES, cookie names
      schemas.ts                 # Zod schemas for locales/namespaces
      runtime-constants.ts       # Generated: TRANSLATIONS_VERSION, etc.
      fallbacks.generated.ts     # Generated (or stub) fallback dictionaries
      cookie-storage.ts          # Read/write locale cookie from Astro context
      resolve-locale.ts          # uiLocale / translationLocale resolution helpers
      fetcher.ts                 # fetchTranslations(): KV + edge cache + fallbacks
      format.ts                  # fmt(), plural(), pluralIcu(), HTML helpers
      flags.ts                   # Flag metadata for LanguageSwitcher

    shared/
      constants.ts               # Shared constants (PROJECT_ID, DEFAULT_LOCALE, ...)
      deep-merge.ts              # Typed deepMerge helper
      schemas.ts                 # Shared schema utilities

    theme/
      constants.ts               # Design tokens (colors, radii, spacing, etc.)
      schemas.ts                 # Theme config schema

  env.d.ts                       # Extends App.Locals with runtime + locale typings
  i18n.base.d.ts                 # Committed stub for i18n typings
  i18n.generated.d.ts            # Generated from JSON (gitignored)

scripts/
  bundle-translations.ts         # Main i18n generator (JSON → KV payload + TS types)
  setup.mjs                      # One-shot setup: copies .dev.vars, wrangler.jsonc templates
```

---

# 🛠 Tooling

This starter ships with a minimal but opinionated formatting setup:

- **Prettier** is configured with `singleQuote: true`, so JavaScript/TypeScript strings and most attributes will use single quotes by default.
- Formatting for Astro files is handled by **`prettier-plugin-astro`**, and class sorting is handled by **`prettier-plugin-tailwindcss`**.

If you prefer double quotes or want to adjust the formatting style, you can change it directly in `prettier.config.mjs`:

```js
// prettier.config.mjs
export default {
  plugins: ['prettier-plugin-tailwindcss', 'prettier-plugin-astro'],
  overrides: [{ files: '*.astro', options: { parser: 'astro' } }],
  semi: false,
  singleQuote: true, // set to false if you prefer double quotes
}
```

---

# 🌍 How i18n Works

## 1. Translations live in `src/locales/<locale>/<namespace>.json`

Example:

```

src/locales/en/landing.json
{
"welcome": "Welcome back, {name}!",
"subscription": {
"status": "Your plan renews on {date}."
}
}

```

KV keys are generated as:

```

<PROJECT_ID>:landing:en

```

---

## 2. Locale routing with middleware

Middleware guarantees strict locale-aware routing. Every incoming URL is normalized to a canonical structure:

    /about → /en/about/

(depending on cookie and browser preferences)

The pipeline consists of two layers:

1. **i18nMiddleware**
   - Detects `uiLocale` based on URL, cookies, and browser preferences.
   - Fixes the URL when needed (injecting the locale segment).
   - Writes `ctx.locals.uiLocale`.

2. **localeMiddleware**
   - Normalizes `uiLocale` into `translationLocale`.
   - Writes `ctx.locals.translationLocale`.

Result:

- `Astro.locals.uiLocale` is used for `<html lang>`, SEO, navigation.
- `Astro.locals.translationLocale` is used for KV translation loading.

This removes the need for lang props and eliminates repeated locale-resolution logic across pages.

---

### Request flow

Full request-processing pipeline:

    Incoming HTTP request
              │
              ▼
    ┌─────────────────────────────┐
    │  Middleware (middleware/)   │
    │                             │
    │  1) i18nMiddleware          │
    │     - Detects uiLocale      │
    │       from URL / cookies /  │
    │       browser               │
    │     - Writes ctx.locals.    │
    │       uiLocale              │
    │                             │
    │  2) localeMiddleware        │
    │     - Derives               │
    │       translationLocale     │
    │       from uiLocale         │
    │     - Writes ctx.locals.    │
    │       translationLocale     │
    └──────────────┬──────────────┘
                   │
                   ▼
    ┌─────────────────────────────┐
    │ Layout (BaseLayout.astro)   │
    │                             │
    │ - Reads Astro.locals.       │
    │   uiLocale for <html lang>  │
    │ - Uses it for hreflangs,    │
    │   metadata, SEO, etc.       │
    └──────────────┬──────────────┘
                   │
                   ▼
    ┌─────────────────────────────┐
    │ Pages (index/about/etc.)    │
    │                             │
    │ - Read Astro.locals.        │
    │   translationLocale         │
    │ - Call fetchTranslations(   │
    │   env, translationLocale,   │
    │   [...namespaces])          │
    └──────────────┬──────────────┘
                   │
                   ▼
    ┌─────────────────────────────┐
    │ UI components / islands     │
    │                             │
    │ - Receive typed translation │
    │   dictionaries as props     │
    │ - Render strings without    │
    │   re-fetching or guessing   │
    └─────────────────────────────┘

This design provides:

- No duplication of locale-resolution logic.
- No lang prop-drilling through layouts and pages.
- Unified UI locale + translation locale behavior.
- Stable results regardless of regional variants (`/en`, `/en-US`).

Example inspection:

    UI locale: {Astro.locals.uiLocale}
    Translations locale: {Astro.locals.translationLocale}

---

## 3. Fetching translations

All locale resolution happens in middleware, so pages and components receive ready values:

- `Astro.locals.uiLocale` — the UI locale the user **expects** to see based on their language selection
- `Astro.locals.translationLocale` — locale used for KV fetching

### Understanding `uiLocale` vs `translationLocale`

This starter distinguishes **two different locale concepts**, each with a specific purpose.
This separation is critical for preventing runtime crashes and ensuring a graceful fallback behavior.

---

### `uiLocale` — the user’s chosen language

Represents the locale **intended by the user** and controls the visible interface:

- URL structure (`/en/...`, `/de/...`)
- Browser / cookie language preference
- Navigation & routing
- `<html lang="">`
- SEO signals
- Language switcher selection

`uiLocale` **does not require translation files** to exist.

Example:
If the user visits `/ja/about`, then:

```

uiLocale = "ja"

```

even if `ja/` translations are missing.

---

### `translationLocale` — the safe locale used for KV translation fetch

Represents the locale that **actually has translation data available**.

- Ensures KV fetch always succeeds
- Prevents missing-property crashes
- Guarantees consistent fallback behavior
- May differ from `uiLocale`

If `uiLocale` has no translation files, we fall back to `DEFAULT_LOCALE`.

Example:

```

uiLocale = "ja"
translationLocale = "en" // safe fallback

```

This prevents errors like:

```

Cannot read properties of undefined (reading "welcome")

```

---

### Summary Table

| Concept                         | `uiLocale`             | `translationLocale`     |
| ------------------------------- | ---------------------- | ----------------------- |
| Comes from                      | URL / cookie / browser | Derived from `uiLocale` |
| Must exist in SUPPORTED_LOCALES | Yes                    | Yes                     |
| Must have translation files     | No                     | Yes                     |
| Affects routing                 | Yes                    | No                      |
| Affects KV fetch                | No                     | Yes                     |
| Used in `<html lang="">`        | Yes                    | No                      |

---

### Why this separation matters

By keeping these two concepts separate:

- URLs behave exactly as users expect
- SEO remains correct
- UI language reflects the user’s intent
- Translation fetches never break due to missing JSON
- Fallback dictionaries (if enabled) work reliably

This pattern is one of the key design features of **EdgeKits Core** and ensures a stable multilingual experience with zero client-side JavaScript.

### How translation loading works

`fetchTranslations` accepts:

1. Worker `env`
2. `translationLocale`
3. A list of namespaces

Usage example:

```astro
---
import { fetchTranslations } from '@/utils/i18n/fetcher'

const { translationLocale, runtime } = Astro.locals

const { common, landing } = await fetchTranslations(
  runtime,
  translationLocale,
  ['common', 'landing'],
)
---
```

The function provides:

- Full static typing from `I18n.Schema`
- Automatic merge with fallback dictionaries
- Safe behavior when KV returns `{}` or is unreachable
- Loading only the namespaces required by the current page
- Consistent behavior for regional URLs (`/en-US/` → `"en"`)

Together, these guarantees ensure consistent and predictable translation behavior across your entire application.

---

## 💡 Note on URL Strategy

You might notice that we recommend keeping Markdown filenames (slugs) in English across all locales (e.g., `architecture.md` for both `/en/` and `/de/`).
This is an intentional decision based on several practical considerations.

### Why this approach?

1. **Shareability & UX**
   Non-Latin slugs (Cyrillic, Kanji, Arabic, etc.) become percent-encoded in URLs.
   A clean path like `/ja/blog/architecture` is far easier to share than:

   ```
   /ja/%E3%82%A2%E3%83%BC%E3%82­AD...
   ```

2. **Cross-platform stability**
   Unicode filenames often create git conflicts due to filesystem normalization differences
   between macOS and Windows. ASCII filenames ensure consistent behavior across all machines.

3. **Predictable content loading**
   This starter fetches Markdown entries by canonical `id` using Astro Content Collections.
   Keeping filenames identical across locales avoids lookup tables, reverse mappings, and
   reduces complexity in `[...slug].astro`.

### What if you need localized URLs?

If your project requires localized paths (e.g., `/de/architektur`), you can implement a
lightweight slug-mapping layer:

```
localizedSlug → canonicalSlug → getEntry()
```

This preserves stable filenames while exposing SEO-friendly localized URLs.
A more complete mapping utility may be added as an optional extension in future versions.

---

## 🔍 SEO Considerations for Multilingual Sites

Localized slugs _can_ improve CTR and readability in region-specific search results, but they
come with trade-offs. When deciding whether to localize URLs, consider:

### ✔ When localized slugs help

- Region-specific websites targeting a single country
- Content with highly competitive localized keywords
- Sites where user trust strongly depends on native language presentation

### ✔ When English slugs are the better option

- Global, multi-market documentation or developer-focused sites
- Projects with mixed-script languages (e.g., Cyrillic, Kanji, Arabic), where percent-encoding
  degrades link appearance
- Repositories where cross-platform git compatibility and file stability matter
- Multilingual setups where maintaining slug mappings would add unnecessary overhead

### ✔ Technical recommendation

For most international developer-oriented websites (including this demo),
**English canonical slugs provide the highest stability with minimal SEO downside**.
Google ranks pages based on content, hreflangs, and canonical metadata—slug localization
provides a _small_ benefit compared to these factors.

If full localization is desired, the recommended pattern is:

- keep filenames in English,
- map localized URL aliases → canonical IDs,
- add canonical + hreflang tags to avoid duplicate-content collisions.

This offers the best of both worlds: SEO-friendly displayed URLs, with a stable internal architecture.

---

# ⚡ Edge Caching for Translations (Cloudflare Cache API)

EdgeKits Core includes **built-in edge caching** for all translation fetches.

`fetchTranslations` uses the Cloudflare **Cache API** via:

```ts
Astro.locals.runtime.caches.default
```

This provides:

- Lower latency (translations are served from the nearest POP)
- Fewer KV reads (reduced cost and more predictable billing)
- Stable behavior under load and temporary KV degradation

---

## Cache key structure and versioning

Each cache entry is keyed by:

```txt
<PROJECT_ID>:i18n:v<TRANSLATIONS_VERSION>:<locale>:<namespace1,namespace2,...>
```

Example:

```txt
edgekits.dev:i18n:v01b7fd54fe04:en:common
edgekits.dev:i18n:v01b7fd54fe04:en:common,landing
```

Where:

- `PROJECT_ID` comes from `src/utils/shared/constants.ts`.
- `TRANSLATIONS_VERSION` is exported from `src/utils/i18n/runtime-constants.ts` and is **content-based**:
  - Generated by `scripts/bundle-translations.ts`.
  - Computed from a stable hash of the collected translations.
  - Changes **only when translation content changes**, not on every bundle run.

Effect:

- If you edit any JSON in `src/locales/**` and run `npm run i18n:bundle`,
  `TRANSLATIONS_VERSION` changes → all cache keys change → old entries are effectively invalidated.
- If you run `npm run i18n:bundle` without changing translations,
  `TRANSLATIONS_VERSION` stays the same → cache is preserved.

This gives deterministic, content-driven invalidation.

---

## What exactly is cached?

`fetchTranslations(runtime, translationLocale, ['ns1', 'ns2', ...])` performs:

1. Build KV keys:

   ```txt
   <PROJECT_ID>:<namespace>:<locale>
   ```

2. Try to read from edge cache:

   ```ts
   const { cache, waitUntil } = getEdgeCache(runtime)
   const { cacheRequest } = buildCacheKey(lang, namespaces)
   const cached = cache && (await cache.match(cacheRequest))
   ```

3. If **cache HIT** → return cached JSON immediately.
4. If **cache MISS** → KV is queried, fallbacks are merged, and the result is stored back into the edge cache:

   ```ts
   const response = new Response(JSON.stringify(data), {
     headers: {
       'Content-Type': 'application/json; charset=utf-8',
       'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
     },
   })

   const putPromise = cache.put(cacheRequest, response.clone())

   if (waitUntil) {
     waitUntil(putPromise) // Workers / preview
   } else {
     await putPromise // dev environments
   }
   ```

The cached payload includes:

- The merged translation JSON for the requested namespaces.
- Fallback dictionaries already applied (if enabled).

Separate cache entries exist for each `(locale, namespaces[])` combination.

---

## Cache lifetime

The response stored in the Cache API uses:

```http
Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400
```

This means in practice:

- **Up to ~1 hour** of “fresh” edge cache for a given POP (`s-maxage=3600`).
- After that period, entries can be treated as stale and revalidated.
- When combined with Cloudflare’s global CDN cache, this yields:
  - Very fast repeated translation loads.
  - Graceful behavior when KV is slow or briefly unavailable.

If you want faster propagation of updates at the cost of more KV reads, reduce `s-maxage` (e.g. to `300` seconds).

---

## Environment flags: I18N_CACHE and DEBUG_I18N

Caching behavior is controlled by two Wrangler variables:

```ts
function isCacheEnabled(env: Env): boolean {
  return parseBooleanFlag(env.I18N_CACHE, /* defaultValue */ true)
}

function debug(env: Env, ...args: unknown[]) {
  const enabled = parseBooleanFlag(env.DEBUG_I18N, /* defaultValue */ false)
  if (!enabled) return
  console.log(...args)
}
```

`parseBooleanFlag` accepts:

- `"1"`, `"true"`, `"on"` → `true`
- `"0"`, `"false"`, `"off"` → `false`
- `undefined` → `defaultValue`

### I18N_CACHE

Wrangler var:

```jsonc
"vars": {
  "I18N_CACHE": "true"
}
```

- Controls whether the edge cache is used at all.
- If disabled, `fetchTranslations` skips `cache.match` and `cache.put` and always reads directly from KV (with fallbacks).

Recommended:

- **dev**: `"off"` (or set in `.dev.vars`) while actively editing translations.
- **preview/prod**: `"on"`.

### DEBUG_I18N

Wrangler var:

```jsonc
"vars": {
  "DEBUG_I18N": "false"
}
```

- Enables verbose logging from the i18n pipeline when set to `"true" | "1" | "on"`.
- Logs cache hits/misses, KV behavior, and error fallbacks.

Recommended:

- **dev / preview**: `"true"` when debugging.
- **prod**: `"false"`.

After adding these vars to `wrangler.jsonc` or `.dev.vars`, run:

```bash
npm run typegen
```

so the `Env` bindings are updated.

---

## Behavior by environment

### `npm run dev` (Astro dev)

- Runs Astro’s Node-based dev server.
- `Astro.locals.runtime.caches.default` is effectively a stub.
- `cache.put` does not persist across requests.
- Result: **edge caching is effectively disabled / non-persistent** in this mode.
- KV + fallbacks still work correctly; only caching differs.

Use this mode for **fast UI iteration**, not for testing cache behavior.

### `npm run preview` (Astro + Wrangler dev / Miniflare)

Typically:

```bash
astro build && wrangler dev
```

- Runs your built Worker in a Miniflare-based environment.
- `runtime.caches.default` and `ctx.waitUntil` behave like real Cloudflare Workers.
- `fetchTranslations` fully exercises the Cache API.
- You will see real **cache HIT / MISS** patterns in logs.

Use this mode to validate edge-caching behavior end-to-end.

### Production (`wrangler deploy`)

- Same behavior as preview, but globally distributed across POPs.
- Each POP maintains its own cache for translation entries.
- `TRANSLATIONS_VERSION` controls when old caches become obsolete.

---

## Failure modes and fallbacks

If KV is temporarily unavailable or returns `{}`:

- `fetchTranslations` merges KV result with any available `FALLBACK_*` constants generated from `DEFAULT_LOCALE`.
- If KV completely fails, i18n falls back to **fallback-only** mode:

```ts
// Build using only FALLBACK_* dictionaries
return buildFallbackOnly(namespaces)
```

This guarantees:

- Typed translation objects
- Stable rendering
- No runtime crashes due to missing keys

Even during KV outages, existing cached entries (if present) and fallback dictionaries keep translations functional.

---

> **Note: Cloudflare KV Limits (Free & Paid Plans)**
>
> Translation loading relies on Cloudflare KV.
> For detailed information about KV storage, reads, writes, and free-tier/paid quotas, see:
> https://developers.cloudflare.com/kv/platform/
>
> Using edge caching significantly reduces KV-read volume, helping maintain predictable costs — especially for multilingual sites where the same namespaces are fetched on every request.

---

## 📢 Optional: Missing Translation Banner

In multilingual projects, users may select a locale for which translations are not yet available.
With **EdgeKits Core**, such locales are still fully routable (`/ja/about`), but the system silently falls back to `DEFAULT_LOCALE` for translation data.

To improve UX, you can enable an optional banner informing users that the selected language is not yet translated.

### When does the banner appear?

The banner shows **only if**:

1. `uiLocale` is a supported locale **but**
2. it has **no translation files**, based on the generated `LOCALES_WITH_TRANSLATIONS` list
3. the feature flag is enabled

### Enabling the banner

In `src/utils/i18n/constants.ts`:

```ts
export const ENABLE_MISSING_TRANSLATION_BANNER = true

// Written in DEFAULT_LOCALE, shown whenever translations are missing
export const MISSING_TRANSLATION_MESSAGE =
  'Sorry, this page is not yet available in your selected language.'
```

### Using the banner in your pages or layout

```ts
import { getMissingTranslationBanner } from '@/utils/i18n/resolve-locale'

const missingTranslationBanner = getMissingTranslationBanner(
  Astro.locals.uiLocale,
)
```

Render:

```astro
{
  missingTranslationBanner && (
    <div class="mb-4 rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      {missingTranslationBanner}
    </div>
  )
}
```

### Behavior summary

| Condition                  | Banner | Translations used |
| -------------------------- | ------ | ----------------- |
| Locale has translations    | ❌ No  | That locale       |
| Locale has no translations | ✔ Yes | `DEFAULT_LOCALE`  |
| Feature flag disabled      | ❌ No  | Normal behavior   |

This mechanism is entirely optional and can be disabled with a single configuration flag.

---

# 🧰 Scripts

### 1) Build i18n artifacts

```bash
npm run i18n:bundle
```

Generates:

- `i18n-data.json`
- `i18n.generated.d.ts`
- `runtime-constants.ts`

### 2) Seed LOCAL KV

```bash
npm run i18n:seed
```

### 3) Seed REMOTE KV

```bash
npm run i18n:migrate
```

---

## 🔄 Optional: Generate Fallback Dictionaries

Enable fallback dictionary generation:

```bash
npm run i18n:bundle:fallbacks
```

Or seed with fallbacks:

```bash
npm run i18n:seed:fallbacks
npm run i18n:migrate:fallbacks
```

This produces:

```
src/utils/i18n/fallbacks.generated.ts
```

With:

```ts
export const FALLBACK_LANDING = {
  welcome: 'Welcome back, {name}!',
  subscription: { status: 'Your plan renews on {date}.' },
}
```

Fallbacks are merged into runtime KV responses automatically:

```ts
const { landing } = await fetchTranslations(...)
landing.welcome // always defined
```

If KV fails entirely, fallbacks guarantee stable UI.

---

# 🧩 Format & Interpolation

### Translations (generic JSON structure)

Instead of hard-coding HTML in components, keep simple, generic patterns in JSON and inject variables via `{placeholders}`.

`src/locales/en/common.json`

```json
{
  "ui": {
    "emphasis": "Please note: <strong>{content}</strong>",
    "codeSnippet": "Run this command: <code>{code}</code>",
    "learnMore": "Read our <a href='{url}'>{label}</a> for details."
  }
}
```

Use `fmt()` for safe interpolation:

```ts
import { fmt } from '@/utils/i18n/format'

fmt(landing.welcome, { name: userName })
fmt(landing.subscription.status, { date: expiryDate })
fmt(common.ui.emphasis, { content: 'wrangler.jsonc' })
```

Key properties:

- Escapes injected values (XSS-safe).
- Leaves unknown placeholders untouched (`{missing}` stays as is).
- Works the same in normal and fallback-only modes.
- Placeholder names are arbitrary as long as JSON keys match the `values` object (`{name}`, `{quantity}`, `{userId}`, etc.).

---

### Astro usage

```astro
---
import { fmt } from '@/utils/i18n/format'
// ... fetch `common` translations ...

const msg1 = fmt(common.ui.emphasis, { content: 'wrangler.jsonc' })
const msg2 = fmt(common.ui.codeSnippet, { code: 'npm run dev' })
---

<p class="font-semibold" set:html={msg1} />

<div class="bg-blue-500 p-2" set:html={msg2} />
```

Astro renders the HTML from the JSON pattern, while `fmt()` keeps all injected values escaped.

---

### React usage

```tsx
// src/components/Alert.tsx
import type { I18n } from '@/i18n.generated'
import { fmt } from '@/utils/i18n/format'

export function Alert({
  t,
  errorMsg,
}: {
  t: I18n['common']
  errorMsg: string
}) {
  // If errorMsg contains HTML, fmt() escapes it via escapeHtml().
  const html = fmt(t.ui.emphasis, { content: errorMsg })

  return (
    <div className="alert-box">
      <span dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
```

Pattern:

1. Keep HTML structure in JSON (`<strong>`, `<code>`, `<a>`).
2. Inject only data values via `fmt()`.
3. Render with `set:html` (Astro) or `dangerouslySetInnerHTML` (React).

This allows you to change markup (for example, replace `<strong>` with `<span class="text-blue-500">`) in translation files without touching component code.

---

### Plural formatting

For simple English-style plurals you can use the lightweight helper:

```ts
import { plural } from '@/utils/i18n/format'

plural(1, '1 item', '{count} items') // "1 item"
plural(3, '1 item', '{count} items') // "3 items"
```

For proper ICU-style plural rules per locale, use `pluralIcu()` and keep patterns in JSON:

`src/locales/en/common.json`

```json
{
  "counter": {
    "patterns": {
      "zero": "No items",
      "one": "{count} item",
      "other": "{count} items"
    }
  }
}
```

`src/locales/de/common.json`

```json
{
  "counter": {
    "patterns": {
      "zero": "Keine Elemente",
      "one": "{count} Element",
      "other": "{count} Elemente"
    }
  }
}
```

Usage:

```ts
import { pluralIcu } from '@/utils/i18n/format'
import type { PluralPatterns } from '@/utils/i18n/format'

function formatCount(count: number, locale: string, patterns: PluralPatterns) {
  return pluralIcu(count, locale, patterns)
}
```

Example inside a React Island:

```tsx
const label = pluralIcu(count, translationLocale, labels.patterns)
```

Behavior:

- Uses `Intl.PluralRules(locale)` under the hood.
- Selects among `zero | one | two | few | many | other`.
- Falls back to `other` if a specific category is missing.
- Still goes through `fmt()`, so `{count}` and other placeholders are escaped safely.

This makes it possible to express real plural logic per language in JSON, while keeping components free of plural rules and string concatenation.

---

# 🍪 Locale Cookie

Set language:

```ts
setCookieLang(context.cookies, locale)
```

Read language:

```ts
const lang = getCookieLang(context.cookies)
```

Automatically used by middleware.

---

# 🧱 Generated Files (should not be edited)

These files are automatically generated and should not be modified manually:

```
src/i18n.generated.d.ts
src/utils/i18n/runtime-constants.ts
src/utils/i18n/fallbacks.generated.ts   # only when using fallbacks
i18n-data.json
```

---

# 🔒 Gitignore Requirements

Ensure your `.gitignore` includes:

```
i18n-data.json
src/i18n.generated.d.ts
src/utils/i18n/runtime-constants.ts
```

Do **NOT** gitignore:

```
src/utils/i18n/fallbacks.generated.ts
```

The stub must exist for TypeScript to resolve imports.

---

# ❓FAQ

### “Do I need to run the i18n generator before `npm run dev`?”

Yes — run:

```bash
npm run i18n:bundle
```

Or:

```bash
npm run i18n:seed
```

Both generate all necessary artifacts.

---

### “Can I add a locale without translations?”

Yes — all locales in `SUPPORTED_LOCALES` are routable.

If translations are missing:

- UI locale still works
- Translation locale falls back to `DEFAULT_LOCALE`
- KV returns `{}`, which merges with fallbacks if enabled

---

### “What happens if KV is offline?”

If fallback dictionaries are enabled:

- Fallback translations are used automatically
- The app continues working without errors

If fallback dictionaries are not enabled:

- KV fetch returns `{}` safely
- You can manually use optional chaining + fallback strings

---

### “Can I add new translation namespaces?”

Yes — simply create a new JSON file:

```
src/locales/en/pricing.json
```

Run:

```bash
npm run i18n:bundle
```

The namespace will be automatically discovered.

---

# 🧭 Roadmap

Add support for regional locales (e.g. pt-BR, zh-CN). Contributions welcome!

---

# 🎉 You're ready!

This starter is designed to be a **drop-in foundation** for multilingual Astro apps running on Cloudflare Workers.

If you need additional utilities, deeper integrations (R2, D1, Durable Objects, Agents), or production deployment templates — EdgeKits provides extensions that build on this core (coming soon).

Happy shipping!
⚡ **Astro EdgeKits Core**
