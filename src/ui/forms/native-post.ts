/** The part of `getActionContext(context)` this rule reads, typed without `astro:actions`. */
export interface FormActionContext<R extends { error?: unknown }, S> {
  action?: { calledFrom: 'rpc' | 'form'; name: string; handler: () => Promise<R> }
  setActionResult: (actionName: string, actionResult: S) => void
  serializeActionResult: (result: R) => S
}

/**
 * Post/Redirect/Get for a native (no-JS) form post. Success is a 303 back to the page at the
 * form's fragment with `?sent=1`, so a reload is a GET and cannot submit twice. An error renders
 * in place, as Astro does by default: the page reads it through `Astro.getActionResult`.
 * RPC calls (the enhanced submit) and every other action pass through untouched.
 */
export async function redirectAfterNativePost<R extends { error?: unknown }, S>(
  actionContext: FormActionContext<R, S>,
  actionName: string,
  fragment: string,
  requestContext: { originPathname: string; redirect: (path: string, status: 303) => Response },
  next: () => Promise<Response>,
): Promise<Response> {
  const { action } = actionContext
  if (action?.calledFrom !== 'form' || action.name !== actionName) return next()

  const result = await action.handler()
  if (!result.error) {
    // The path the visitor posted to (decoded by Astro: encodeURI keeps the header ASCII).
    return requestContext.redirect(`${encodeURI(requestContext.originPathname)}?sent=1#${fragment}`, 303)
  }

  // Setting the result here also stops Astro from running the action again.
  actionContext.setActionResult(action.name, actionContext.serializeActionResult(result))
  return next()
}
