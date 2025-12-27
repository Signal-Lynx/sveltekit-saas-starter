<script lang="ts">
  import { page } from "$app/stores"

  // 1. We added 'children' here to satisfy the Svelte 5 requirement
  interface Props {
    data: {
      nav: { href: string; label: string }[]
      admin: { actorId: string; email: string }
    }
    children: import("svelte").Snippet
  }

  // 2. Destructure children along with data
  const { data, children }: Props = $props()

  const normalize = (p: string) => {
    if (!p) return "/"
    const noQuery = p.split("?")[0].split("#")[0]
    const stripped = noQuery.replace(/\/+$/, "")
    return stripped || "/"
  }

  const isActive = (href: string, currentPath: string) => {
    const cur = normalize(currentPath)
    const tgt = normalize(href)
    return cur === tgt || (tgt !== "/" && cur.startsWith(tgt + "/"))
  }

  const linkBase =
    "block px-3 py-2 rounded outline-none transition-colors duration-150"
  const linkIdle = "hover:bg-base-200 focus:bg-base-200 text-base-content"
  const linkActive = "bg-base-200 font-medium"
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="min-h-screen flex flex-col lg:flex-row">
  <aside
    class="w-full lg:w-64 shrink-0 p-4 border-b lg:border-b-0 lg:border-r border-base-300"
    role="navigation"
    aria-label="Admin navigation"
  >
    <div class="mb-4 text-sm text-base-content/70">
      <div class="font-semibold text-base-content">Admin</div>
      <div class="truncate" title={data?.admin?.email ?? ""}>
        {data?.admin?.email}
      </div>
    </div>

    <nav class="space-y-2">
      {#each data?.nav ?? [] as item (item.href)}
        {#if item}
          <a
            href={item.href}
            class={`${linkBase} ${isActive(item.href, $page.url.pathname) ? linkActive : linkIdle}`}
            aria-current={isActive(item.href, $page.url.pathname)
              ? "page"
              : undefined}
            title={item.label}
            data-sveltekit-preload-data="hover"
          >
            {item.label}
          </a>
        {/if}
      {/each}
    </nav>
  </aside>

  <main class="flex-1 min-w-0 p-4 sm:p-6">
    <!-- 3. THIS IS THE FIX: Replaced <slot /> with the new Svelte 5 render tag -->
    {@render children?.()}
  </main>
</div>
