/// <reference types="./src/utils/i18n/schemas" />
type Runtime = import('@astrojs/cloudflare').Runtime<Env>

declare namespace App {
  interface Locals extends Runtime {
    uiLocale: Locale
    translationLocale: Locale
  }
}
