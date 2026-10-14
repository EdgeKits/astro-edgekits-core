import { ERROR_MESSAGE_CODES, type ErrorMessageCode } from './error-codes'

export function isErrorMessageCode(value: string): value is ErrorMessageCode {
  return Object.values(ERROR_MESSAGE_CODES).includes(value as ErrorMessageCode)
}
