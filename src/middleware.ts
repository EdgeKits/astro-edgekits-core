import { getActionContext } from 'astro:actions'
import { defineMiddleware, sequence } from 'astro:middleware'

import { redirectAfterNativePost } from '@/ui/forms/native-post'

// The i18n middleware is registered by the integration (`auto` mode) and runs ahead of this file.
const newsletterFormPost = defineMiddleware((ctx, next) =>
  redirectAfterNativePost(getActionContext(ctx), 'newsletter.subscribe', 'newsletter', ctx, next),
)

export const onRequest = sequence(newsletterFormPost)
