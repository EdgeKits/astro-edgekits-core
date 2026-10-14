import { isInputError } from 'astro:actions'

import { resolveFieldMessages } from './error-mapper'
import type { ClientSchema, ClientSchemaError } from './client-schema'

/**
 * enhanceForm — framework-free progressive enhancement for Astro action forms.
 *   - client-side safeParse on submit (hand-rolled mirror, see client-schema.ts; blocks the request when invalid)
 *   - per-field validation on focusout, re-validation of touched fields on input
 *   - submit via the astro:actions client; isInputError(error).fields auto-mapped to slots
 *   - pending state (disables submit, sets data-pending / aria-busy)
 *   - focus the first invalid field; dirty tracking (submit disabled until a value changes)
 *
 * Error rendering contract (markup owns the slots):
 *   - each field error renders into  <* data-error-for="<name>">  inside the form
 *   - a non-field / form-level error renders into  data-error-for="_form"
 *   - aria-invalid is toggled on [name="<name>"], data-invalid on its closest [data-slot="field"]
 *
 * No-JS fallback: the <form> carries method="POST" + action={actions.x}; the page renders
 * Astro.getActionResult(actions.x). This controller preventDefault()s only when JS is present.
 */

type FormValues = Record<string, unknown>

export interface ActionErrorLike {
  code?: string
  message?: string
}
type ActionFn<TData> = (input: never) => Promise<{ data?: TData; error?: ActionErrorLike }>

export interface FormErrorHelpers {
  /** Render error CODES into field slots (e.g. { email: 'EMAIL_ALREADY_EXISTS' }). */
  setErrors: (errors: Record<string, string | string[]>) => void
  /** Render a single form-level error code into the _form slot. */
  setFormError: (code: string) => void
  /** Clear every rendered error + invalid markers. */
  clearErrors: () => void
}

export interface EnhanceFormOptions<TValues extends FormValues, TData> {
  /** Map an error CODE → localized string (= t.messages.errors.ui). */
  tErrors: Record<string, string>
  /** Map validated values into the action input (e.g. inject locale, nest fields). */
  transform?: (values: TValues) => unknown
  onSuccess?: (data: TData, values: TValues) => void | Promise<void>
  /** Non-input action errors (domain ActionErrors). Use helpers, or toast and render nothing. */
  onActionError?: (error: ActionErrorLike, helpers: FormErrorHelpers) => void | Promise<void>
  /** Override value collection. Default: FormData; a name="x[]" ⇒ array x. */
  getValues?: (form: HTMLFormElement) => TValues
  validateOnBlur?: boolean // default true
  revalidateOnInput?: boolean // default true
  focusError?: boolean // default true
  disableUntilDirty?: boolean // default true
}

export interface FormController extends FormErrorHelpers {
  setPending: (pending: boolean) => void
  destroy: () => void
}

const FORM_LEVEL_KEY = '_form'

export function enhanceForm<TValues extends FormValues, TData>(
  form: HTMLFormElement,
  schema: ClientSchema<TValues>,
  action: ActionFn<TData>,
  options: EnhanceFormOptions<TValues, TData>,
): FormController {
  const {
    tErrors,
    transform,
    onSuccess,
    onActionError,
    getValues = defaultGetValues<TValues>,
    validateOnBlur = true,
    revalidateOnInput = true,
    focusError = true,
    disableUntilDirty = true,
  } = options

  const touched = new Set<string>()
  const initialSnapshot = serialize(getValues(form))
  let pending = false

  function slotFor(name: string): HTMLElement | null {
    return form.querySelector<HTMLElement>(`[data-error-for="${cssEscape(name)}"]`)
  }

  function paintField(name: string, messages: string[]): void {
    const slot = slotFor(name)
    if (slot) renderMessages(slot, messages)
    const invalid = messages.length > 0
    form.querySelectorAll<HTMLElement>(`[name="${cssEscape(name)}"]`).forEach((el) => {
      el.toggleAttribute('aria-invalid', invalid)
      el.closest<HTMLElement>('[data-slot="field"]')?.toggleAttribute('data-invalid', invalid)
    })
  }

  function setErrors(errors: Record<string, string | string[]>): void {
    for (const [name, codes] of Object.entries(errors)) {
      paintField(name, resolveFieldMessages(Array.isArray(codes) ? codes : [codes], tErrors))
    }
  }
  function setFormError(code: string): void {
    paintField(FORM_LEVEL_KEY, resolveFieldMessages([code], tErrors))
  }
  function clearErrors(): void {
    form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((slot) => {
      const name = slot.getAttribute('data-error-for')
      if (name) paintField(name, [])
    })
  }
  const helpers: FormErrorHelpers = { setErrors, setFormError, clearErrors }

  function issuesByField(error: ClientSchemaError): Map<string, string[]> {
    const byField = new Map<string, string[]>()
    for (const issue of error.issues) {
      const head = issue.path[0]
      const key = head === undefined ? FORM_LEVEL_KEY : String(head)
      const list = byField.get(key)
      if (list) list.push(issue.message)
      else byField.set(key, [issue.message])
    }
    return byField
  }

  function validate(): { ok: boolean; byField: Map<string, string[]> } {
    const result = schema.safeParse(getValues(form))
    if (result.success) return { ok: true, byField: new Map() }
    return { ok: false, byField: issuesByField(result.error) }
  }

  function focusFirstInvalid(byField: Map<string, string[]>): void {
    if (!focusError) return
    for (const el of Array.from(form.querySelectorAll<HTMLElement>('[name]'))) {
      const name = el.getAttribute('name')
      if (name && byField.has(name)) {
        el.focus()
        return
      }
    }
  }

  function submitButtons(): HTMLButtonElement[] {
    return Array.from(form.querySelectorAll<HTMLButtonElement>('button[type="submit"], button:not([type])'))
  }
  function isDirty(): boolean {
    return serialize(getValues(form)) !== initialSnapshot
  }
  function syncSubmitDisabled(): void {
    const disabled = pending || (disableUntilDirty && !isDirty())
    submitButtons().forEach((btn) => {
      btn.disabled = disabled
    })
  }
  function setPending(next: boolean): void {
    pending = next
    form.toggleAttribute('data-pending', next)
    form.setAttribute('aria-busy', String(next))
    syncSubmitDisabled()
  }

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    if (pending) return
    const parsed = schema.safeParse(getValues(form))
    if (!parsed.success) {
      const byField = issuesByField(parsed.error)
      clearErrors()
      for (const [name, codes] of byField) paintField(name, resolveFieldMessages(codes, tErrors))
      focusFirstInvalid(byField)
      return
    }
    clearErrors()
    setPending(true)
    try {
      const input = (transform ? transform(parsed.data) : parsed.data) as never
      const { data, error } = await action(input)
      if (error) {
        if (isInputError(error as Parameters<typeof isInputError>[0])) {
          const fields = (error as { fields?: Record<string, string[]> }).fields
          if (fields) {
            setErrors(fields)
            focusFirstInvalid(new Map(Object.entries(fields)))
          }
          return
        }
        await onActionError?.(error, helpers)
        return
      }
      if (data !== undefined) await onSuccess?.(data, parsed.data)
    } catch (error) {
      await onActionError?.(error as ActionErrorLike, helpers)
    } finally {
      setPending(false)
    }
  }

  function fieldName(target: EventTarget | null): string | null {
    if (!(target instanceof HTMLElement)) return null
    return target.getAttribute('name') || null
  }
  function repaintField(name: string): void {
    const { byField } = validate()
    paintField(name, resolveFieldMessages(byField.get(name) ?? [], tErrors))
  }
  function handleFocusOut(event: FocusEvent): void {
    if (!validateOnBlur) return
    const name = fieldName(event.target)
    if (!name) return
    touched.add(name)
    repaintField(name)
  }
  function handleInput(event: Event): void {
    syncSubmitDisabled()
    if (!revalidateOnInput) return
    const name = fieldName(event.target)
    if (!name || !touched.has(name)) return
    repaintField(name)
  }

  form.addEventListener('submit', handleSubmit)
  form.addEventListener('focusout', handleFocusOut)
  form.addEventListener('input', handleInput)
  syncSubmitDisabled()

  return {
    setErrors,
    setFormError,
    clearErrors,
    setPending,
    destroy() {
      form.removeEventListener('submit', handleSubmit)
      form.removeEventListener('focusout', handleFocusOut)
      form.removeEventListener('input', handleInput)
    },
  }
}

/** Collect form values: FormData, with name="x[]" collapsed to array x. */
function defaultGetValues<TValues extends FormValues>(form: HTMLFormElement): TValues {
  const data = new FormData(form)
  const out: FormValues = {}
  for (const key of new Set(data.keys())) {
    const isArray = key.endsWith('[]')
    const name = isArray ? key.slice(0, -2) : key
    const all = data.getAll(key)
    out[name] = isArray ? all : all.length > 1 ? all : all[0]
  }
  return out as TValues
}

function serialize(values: FormValues): string {
  const keys = Object.keys(values).sort()
  return JSON.stringify(
    keys.map((key) => {
      const value = values[key]
      return [key, value instanceof File ? value.name : value]
    }),
  )
}

/** Mirrors shadcn FieldError markup: empty ⇒ hidden; one ⇒ text; many ⇒ bulleted list. */
function renderMessages(slot: HTMLElement, messages: string[]): void {
  if (messages.length === 0) {
    slot.replaceChildren()
    slot.removeAttribute('role')
    slot.removeAttribute('data-slot')
    slot.hidden = true
    return
  }
  slot.hidden = false
  slot.setAttribute('role', 'alert')
  slot.setAttribute('data-slot', 'field-error')
  slot.classList.add('text-red-600', 'text-sm', 'font-normal') // the project's error styling
  if (messages.length === 1) {
    slot.textContent = messages[0] ?? ''
    return
  }
  const ul = document.createElement('ul')
  ul.className = 'ml-4 flex list-disc flex-col gap-1'
  for (const message of messages) {
    const li = document.createElement('li')
    li.textContent = message
    ul.appendChild(li)
  }
  slot.replaceChildren(ul)
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value)
  return value.replace(/["\\]/g, '\\$&')
}
