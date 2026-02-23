import { defineCollection, z } from 'astro:content'

const blogCollection = defineCollection({
  type: 'content',

  // We use a function to get access to the 'image' helper
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),

      // Coerce allows strings like "2025-11-28" to be parsed as Date objects
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),

      heroImage: image().optional(),

      // Optional categorization
      tags: z.array(z.string()).default(['Untagged']),

      // Useful for filtering out unfinished posts in production builds
      draft: z.boolean().default(false),
    }),
})

export const collections = {
  blog: blogCollection,
}
