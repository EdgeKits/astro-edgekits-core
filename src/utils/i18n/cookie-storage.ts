import { type AstroCookies } from 'astro'

import { type Locale, LocaleSchema } from './schemas'
import { setCookie, getCookieWithSchema } from '../cookies/server'
import { LANG_COOKIE_NAME } from './constants'

export function setCookieLang(cookies: AstroCookies, locale: Locale) {
  setCookie(cookies, LANG_COOKIE_NAME, locale)
}

export function getCookieLang(cookies: AstroCookies): Locale | null {
  return getCookieWithSchema(cookies, LANG_COOKIE_NAME, LocaleSchema)
}
