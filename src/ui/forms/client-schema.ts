export interface SchemaIssue {
  /** Field path, first element is the field name `enhanceForm` paints. */
  path: Array<string | number>
  /** An ERROR_MESSAGE_CODES value (localized later via `tErrors`). */
  message: string
}

export interface ClientSchemaError {
  issues: SchemaIssue[]
}

export type SafeParseResult<T> = { success: true; data: T } | { success: false; error: ClientSchemaError }

export interface ClientSchema<T> {
  safeParse(values: unknown): SafeParseResult<T>
}

/** Mirror of Zod v4's default `z.email()` pattern — client matches server byte-for-byte. */
export const EMAIL_REGEX =
  /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/

export function isEmail(value: unknown): value is string {
  return typeof value === 'string' && EMAIL_REGEX.test(value)
}

/** Coerce to string with a fallback (FormData values may be File/undefined). */
export function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

/** `undefined`/`null` -> [], scalar -> [scalar] (FormData yields a scalar for a single checkbox). */
export function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value == null ? [] : [value]
}

/** Type-guarded enum membership check. */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

export function ok<T>(data: T): SafeParseResult<T> {
  return { success: true, data }
}

export function fail<T>(issues: SchemaIssue[]): SafeParseResult<T> {
  return { success: false, error: { issues } }
}
