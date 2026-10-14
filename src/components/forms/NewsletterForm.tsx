import { useRef, useState } from 'react'
import { useForm, type RegisterOptions } from 'react-hook-form'
import { actions, isInputError, type ActionError } from 'astro:actions'
import type { Locale } from '@edgekits/astro-i18n/runtime'

import { isEmail } from '@/ui/forms/client-schema'
import { mapErrorToI18n } from '@/ui/forms/error-mapper'
import { ERROR_MESSAGE_CODES, type ErrorMessageCode } from '@/domain/messages/error-codes'
import { isErrorMessageCode } from '@/domain/messages/guards'

type NewsletterValues = {
  email: string
  consent: boolean
}
type FieldName = keyof NewsletterValues

/** The no-JS POST result as error CODES (the island cannot read Astro.getActionResult). */
export interface NewsletterInitialState {
  sent: boolean
  errors: Partial<Record<FieldName | '_form', string>>
}

// Every string arrives already localized from the page; the island fetches nothing.
export interface NewsletterFormProps {
  t: Pick<I18n.Schema, 'newsletter' | 'messages'>
  locale: Locale
  initial?: NewsletterInitialState
}

const { REQUIRED, INVALID_EMAIL, CONSENT_REQUIRED, INTERNAL_SERVER_ERROR } = ERROR_MESSAGE_CODES

// Client rules mirror NewsletterSchema (src/domain/newsletter/schema.ts): same fields, same
// CODES. react-hook-form's own validation instead of a zod resolver: no zod in the browser.
const rules: { [K in FieldName]: RegisterOptions<NewsletterValues, K> } = {
  email: {
    validate: (value) => {
      const email = value.trim()
      if (!email) return REQUIRED
      return isEmail(email) ? true : INVALID_EMAIL
    },
  },
  consent: { validate: (value) => value || CONSENT_REQUIRED },
}

/** A non-input action error -> its form-level code: domain codes pass, the rest is generic. */
function formErrorCode(error: Pick<ActionError, 'code' | 'message'>): ErrorMessageCode {
  return error.code === 'BAD_REQUEST' && isErrorMessageCode(error.message) ? error.message : INTERNAL_SERVER_ERROR
}

/**
 * Called by the page with Astro.getActionResult(actions.newsletter.subscribe) and Astro.url. A
 * failed native POST renders in place, so its errors come from the result; a success never does:
 * src/middleware.ts answers it with a 303 to `?sent=1` (Post/Redirect/Get), read from the URL.
 */
export function noJsState(
  result: { data?: unknown; error?: ActionError } | undefined,
  url: URL,
): NewsletterInitialState {
  const error = result?.error
  if (!error) return { sent: url.searchParams.get('sent') === '1', errors: {} }
  if (!isInputError(error)) return { sent: false, errors: { _form: formErrorCode(error) } }
  const errors: NewsletterInitialState['errors'] = {}
  for (const name of ['email', 'consent'] as const) {
    const code = error.fields[name]?.[0]
    if (code) errors[name] = code
  }
  return { sent: false, errors }
}

const errorClass = 'text-sm font-normal text-red-600'

export default function NewsletterForm({ t, locale, initial }: NewsletterFormProps) {
  const { newsletter, messages } = t
  // Every code the form can receive -> its text in this locale.
  const tErrors: Record<string, string> = { ...messages.errors.ui, ...messages.errors.server }
  const toText = (code: string | undefined) => mapErrorToI18n(code ? { message: code } : undefined, tErrors)

  const formRef = useRef<HTMLFormElement>(null)
  const [sent, setSent] = useState(initial?.sent ?? false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, touchedFields, dirtyFields, isSubmitted, isSubmitting },
  } = useForm<NewsletterValues>({ mode: 'onTouched', defaultValues: { email: '', consent: false } })

  const onSubmit = handleSubmit(async () => {
    if (!formRef.current) return
    try {
      // The action accepts FormData (it also serves the no-JS POST); the hidden locale rides along.
      const { data, error } = await actions.newsletter.subscribe(new FormData(formRef.current))
      if (!error) {
        if (data) setSent(true)
        return
      }
      if (isInputError(error)) {
        let focus = true
        for (const name of ['email', 'consent'] as const) {
          const code = error.fields[name]?.[0]
          if (!code) continue
          setError(name, { type: 'server', message: code }, { shouldFocus: focus })
          focus = false
        }
        return
      }
      setError('root.server', { type: 'server', message: formErrorCode(error) })
    } catch {
      setError('root.server', { type: 'server', message: INTERNAL_SERVER_ERROR })
    }
  })

  if (sent) {
    return (
      <div className="mx-auto w-full max-w-md">
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-emerald-800">
          {messages.common.SUBSCRIPTION_SUCCEED}
        </p>
      </div>
    )
  }

  // The no-JS result shows until the visitor touches that field or submits again.
  const fieldError = (name: FieldName) =>
    toText(
      errors[name]?.message ??
        (isSubmitted || touchedFields[name] || dirtyFields[name] ? undefined : initial?.errors[name]),
    )
  const emailError = fieldError('email')
  const consentError = fieldError('consent')
  const formError = toText(errors.root?.server?.message ?? (isSubmitted ? undefined : initial?.errors._form))

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Before hydration this is a plain form: the native POST runs the action. */}
      <form
        ref={formRef}
        method="POST"
        action={actions.newsletter.subscribe.toString() + '#newsletter'}
        onSubmit={onSubmit}
        noValidate
        aria-busy={isSubmitting}
        className="flex flex-col gap-5 text-left"
      >
        <input type="hidden" name="locale" value={locale} />

        <div role="group" data-slot="field" data-invalid={emailError ? '' : undefined} className="flex flex-col gap-2">
          <label htmlFor="newsletter-email" className="text-sm font-medium">
            {newsletter.emailLabel}
          </label>
          <input
            id="newsletter-email"
            type="email"
            autoComplete="email"
            placeholder={newsletter.placeholder}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? 'newsletter-email-error' : undefined}
            className="rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-500"
            {...register('email', rules.email)}
          />
          {emailError && (
            <div id="newsletter-email-error" role="alert" className={errorClass}>
              {emailError}
            </div>
          )}
        </div>

        <div
          role="group"
          data-slot="field"
          data-invalid={consentError ? '' : undefined}
          className="flex flex-col gap-2"
        >
          <label className="flex items-start gap-3 text-sm text-zinc-700">
            <input
              type="checkbox"
              aria-invalid={consentError ? true : undefined}
              aria-describedby={consentError ? 'newsletter-consent-error' : undefined}
              className="mt-0.5 size-4 accent-zinc-900"
              {...register('consent', rules.consent)}
            />
            <span>{newsletter.consent}</span>
          </label>
          {consentError && (
            <div id="newsletter-consent-error" role="alert" className={errorClass}>
              {consentError}
            </div>
          )}
        </div>

        {formError && (
          <div role="alert" className={errorClass}>
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? `${messages.common.PENDING}…` : newsletter.button}
        </button>
        <p className="text-xs text-zinc-500">{newsletter.demoNote}</p>
      </form>
    </div>
  )
}
