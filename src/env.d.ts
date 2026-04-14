/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>

declare namespace App {
  interface Locals extends Runtime {
    uiLocale: Locale
    translationLocale: Locale
    isMissingContent?: boolean // in content collections
  }
}
