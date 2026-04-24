/**
 * Parse a boolean flag from Wrangler-env string.
 *
 * Accepts:
 *   "1", "true", "on"   → true
 *   "0", "false", "off" → false
 *   undefined           → defaultValue
 */
export function parseBooleanFlag(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) return defaultValue

  const v = value.toLowerCase()
  if (v === '1' || v === 'true' || v === 'on') return true
  if (v === '0' || v === 'false' || v === 'off') return false

  return defaultValue
}
