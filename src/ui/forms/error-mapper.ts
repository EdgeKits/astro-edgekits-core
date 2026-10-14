type ErrorLike = { message?: string }

export function mapErrorToI18n(issue: ErrorLike | undefined, tErrors: Record<string, string>): string | null {
  if (!issue?.message) return null
  return tErrors[issue.message] ?? null
}

/** Resolve raw error CODES to a deduped list of localized messages (no React, no DOM). */
export function resolveFieldMessages(codes: Array<string | undefined>, tErrors: Record<string, string>): string[] {
  const localized = codes
    .map((code) => mapErrorToI18n(code ? { message: code } : undefined, tErrors))
    .filter((message): message is string => Boolean(message))
  return [...new Set(localized)]
}
