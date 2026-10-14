import { ActionError, defineAction } from 'astro:actions'
import { env } from 'cloudflare:workers'
import { LocaleSchema } from '@edgekits/astro-i18n/runtime'

import { ERROR_MESSAGE_CODES } from '@/domain/messages'
import { NewsletterSchema } from '@/domain/newsletter/schema'

export const newsletter = {
  subscribe: defineAction({
    // FormData both ways: the no-JS native POST and the enhanced submit (see NewsletterForm).
    accept: 'form',
    input: NewsletterSchema.extend({
      // The UI locale, for locale-aware server work (e.g. the confirmation email's language).
      locale: LocaleSchema,
    }),
    handler: async () => {
      // DEMO_MODE=on: the input is validated and nothing is stored.
      if (env.DEMO_MODE === 'on') return { ok: true as const }

      // A real deployment stores the subscriber here (a D1 row, a KV key or an email
      // provider's API, using `input.email` and `input.locale`) and reports expected
      // failures as codes: throw new ActionError({ message: 'EMAIL_TAKEN', code: 'BAD_REQUEST' }).
      // This starter ships no store, so outside demo mode the request fails.
      throw new ActionError({ message: ERROR_MESSAGE_CODES.INTERNAL_SERVER_ERROR, code: 'INTERNAL_SERVER_ERROR' })
    },
  }),
}
