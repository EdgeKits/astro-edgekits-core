import type { AstroCookies } from 'astro'
import type { ZodTypeAny, TypeOf } from 'zod'

import { ONEYEAR_COOKIE_MAXAGE } from '@/utils/constants'

type AstroCookieOptions = NonNullable<Parameters<AstroCookies['set']>[2]>

const DEFAULT_OPTIONS: AstroCookieOptions = {
  path: '/',
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: 'lax',
  maxAge: ONEYEAR_COOKIE_MAXAGE,
}

export type SetCookieOverrides = Partial<AstroCookieOptions>

// ------------------------------
// SETTER
// ------------------------------
export function setCookie<T = string>(
  cookies: AstroCookies,
  name: string,
  value: T,
  overrides?: SetCookieOverrides,
): void {
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value)

  cookies.set(name, stringValue, {
    ...DEFAULT_OPTIONS,
    ...overrides,
  })
}

// ------------------------------
// STRING COOKIE
// ------------------------------
export function getCookieWithSchema<S extends ZodTypeAny>(
  cookies: AstroCookies,
  name: string,
  schema: S,
): TypeOf<S> | null {
  const entry = cookies.get(name)
  if (!entry) return null

  const raw = entry.value

  const result = schema.safeParse(raw)
  if (result.success) return result.data as TypeOf<S>

  if (!import.meta.env.PROD) {
    console.warn(`Invalid cookie "${name}"`, result.error.format())
  }

  return null
}

// ------------------------------
// JSON COOKIE
// ------------------------------
export function getJsonCookieWithSchema<S extends ZodTypeAny>(
  cookies: AstroCookies,
  name: string,
  schema: S,
): TypeOf<S> | null {
  const entry = cookies.get(name)
  if (!entry) return null

  const raw = entry.value

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    if (!import.meta.env.PROD) {
      console.warn(`Failed to parse JSON cookie "${name}"`)
    }
    return null
  }

  const result = schema.safeParse(parsed)
  if (result.success) return result.data as TypeOf<S>

  if (!import.meta.env.PROD) {
    console.warn(`Invalid JSON cookie "${name}"`, result.error.format())
  }

  return null
}
