import { z } from 'zod'

import { SUPPORTED_LOCALES } from './constants'
import { NAMESPACE_KEYS } from './runtime-constants'

// Auto-generated namespaces and real supported locales that have translations
export * from './runtime-constants'

// Locale schema from shared constant
export const LocaleSchema = z.enum(SUPPORTED_LOCALES)

// Runtime safety: if namespaces are empty (fresh clone), fall back to string
const hasNamespaces = (NAMESPACE_KEYS as readonly string[]).length > 0

export const NamespaceSchema = hasNamespaces
  ? z.enum(NAMESPACE_KEYS as [string, ...string[]])
  : z.string()

export type Locale = z.infer<typeof LocaleSchema>
export type Namespace = z.infer<typeof NamespaceSchema>

type GlobalSchema = I18n.Schema

export type PickSchema<N extends Namespace> = [N] extends [keyof GlobalSchema]
  ? Pick<GlobalSchema, N>
  : any
