import { z } from 'astro/zod'

import { ERROR_MESSAGE_CODES } from '@/domain/messages/error-codes'

// Server-side source of truth; every message is a CODE, localized through `messages`.
// The browser validates with react-hook-form rules that mirror it (NewsletterForm.tsx), never with zod.
export const NewsletterSchema = z.object({
  // Astro's FormData parsing turns an empty field into null: the type error is REQUIRED too.
  email: z
    .string({ message: ERROR_MESSAGE_CODES.REQUIRED })
    .trim()
    .min(1, { message: ERROR_MESSAGE_CODES.REQUIRED, abort: true })
    .pipe(z.email({ message: ERROR_MESSAGE_CODES.INVALID_EMAIL })),
  // A checkbox: Astro's FormData parsing turns presence into `true`.
  consent: z.boolean().refine((value) => value, { message: ERROR_MESSAGE_CODES.CONSENT_REQUIRED }),
})
export type NewsletterData = z.infer<typeof NewsletterSchema>
