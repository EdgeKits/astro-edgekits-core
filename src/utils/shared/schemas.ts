import { z } from 'zod'

import { ThemeSchema } from '../theme/schemas'
import { LocaleSchema } from '../i18n/schemas'

export const PreferencesSchema = z.object({
  theme: ThemeSchema,
  lang: LocaleSchema,
})

// Inference Types
export type Preferences = z.infer<typeof PreferencesSchema>
