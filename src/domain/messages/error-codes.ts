// Keys MUST match keys in locales/<locale>/messages.json (errors.ui / errors.server).

export const SERVER_ERROR_CODES = {
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const
export type ServerErrorCode = (typeof SERVER_ERROR_CODES)[keyof typeof SERVER_ERROR_CODES]

export const UI_ERROR_CODES = {
  INVALID_EMAIL: 'INVALID_EMAIL',
  REQUIRED: 'REQUIRED',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
} as const
export type UiErrorCode = (typeof UI_ERROR_CODES)[keyof typeof UI_ERROR_CODES]

export const ERROR_MESSAGE_CODES = { ...SERVER_ERROR_CODES, ...UI_ERROR_CODES } as const
export type ErrorMessageCode = (typeof ERROR_MESSAGE_CODES)[keyof typeof ERROR_MESSAGE_CODES]
