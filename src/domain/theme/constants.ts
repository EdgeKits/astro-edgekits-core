// Themes configuration
export const THEMES = ['light', 'dark'] as const
export type SupportedThemes = (typeof THEMES)[number]

// Default theme
export const DEFAULT_THEME: SupportedThemes = 'light'
