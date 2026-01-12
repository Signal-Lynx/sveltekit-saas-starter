// FILE: src/routes/(marketing)/articles/[slug]/+page.server.ts
import { error } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"
import { getArticle } from "$lib/data/articles/posts"
import { articleHref } from "$lib/data/articles/meta"

export const load: PageServerLoad = ({ params }) => {
  const found = getArticle(params.slug)
  if (!found) throw error(404, "Article not found")

  return {
    meta: found.meta,
    post: found.post,
    href: articleHref(found.meta.slug),
  }
}
