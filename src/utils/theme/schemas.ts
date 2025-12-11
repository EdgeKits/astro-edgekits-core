import { z } from 'zod'

// Constants
import { THEMES } from './constants'

// Zod Schemas
export const ThemeSchema = z.enum(THEMES)

// Inference Types
export type Theme = z.infer<typeof ThemeSchema>
