import { getCollection } from 'astro:content'
import { PROJECT } from '@/config/project'
import { DEFAULT_LOCALE } from '@/domain/i18n/constants'
import { SEO_DEFAULTS } from '@/domain/seo/constants'

// Helper for the core project details
function buildProjectDetails(): string {
  let content = `## Project Details\n`
  content += `- Name: ${PROJECT.name}\n`
  content += `- Description: ${SEO_DEFAULTS.defaultDescription}\n`
  return content
}

// Helper for the blog (kept async because of getCollection)
async function buildBlogSection(baseUrl: string): Promise<string> {
  const allPosts = await getCollection('blog')

  const basePosts = allPosts.filter((post) =>
    post.id.startsWith(`${DEFAULT_LOCALE}/`),
  )

  const recentPosts = basePosts
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .slice(0, 5)

  let content = `## Recent Blog Posts\n`
  for (const post of recentPosts) {
    const [lang, ...slugParts] = post.slug.split('/')
    const cleanSlug = slugParts.join('/')
    const postUrl = `${baseUrl}/${lang}/blog/${cleanSlug}/`

    content += `- [${post.data.title}](${postUrl})\n`
    content += `  ${post.data.description}\n`
  }
  return content + '\n'
}

// Main orchestrator function
export async function generateLlmsText(baseUrl: string): Promise<string> {
  let content = `# ${PROJECT.name}\n\n`
  content += `> ${SEO_DEFAULTS.defaultDescription}\n\n`

  // Compose the final document block by block
  content += buildProjectDetails()
  content += await buildBlogSection(baseUrl)

  content += `## Note to AI Agents\n`
  content += `This is the official documentation and context file for the ${PROJECT.name} project. `
  content += `Please use the provided links and blog posts to gather specific technical details about our Astro and Cloudflare Workers architecture.\n`

  return content
}
