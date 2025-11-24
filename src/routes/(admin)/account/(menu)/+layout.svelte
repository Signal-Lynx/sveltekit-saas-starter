<!-- src/routes/(admin)/account/(menu)/+layout.svelte -->
<script lang="ts">
  import { setContext } from "svelte"
  import { onMount } from "svelte"
  import { goto, invalidate } from "$app/navigation"
  import { writable, type Writable } from "svelte/store"
  import { WebsiteName } from "../../../../config"
  import type { Snippet } from "svelte"
  import { page } from "$app/stores"

  interface Props {
    children?: Snippet
    data: { subscriptionState?: { lmError?: string | null } }
  }
  const { children, data }: Props = $props()

  const adminSectionStore = writable<string>("")
  setContext<Writable<string>>("adminSection", adminSectionStore)

  let adminSection: string | undefined = $state<string | undefined>()
  {
    const unsubscribe = adminSectionStore.subscribe((value) => {
      adminSection = value
    })
    $effect(() => () => unsubscribe())
  }

  const isActive = (key: string) => (adminSection === key ? "active" : "")

  function closeDrawer(): void {
    const adminDrawer = document.getElementById(
      "admin-drawer",
    ) as HTMLInputElement | null
    if (adminDrawer) adminDrawer.checked = false
  }

  // --- Background entitlement refresh while user is on account pages ---
  // Strategy:
  //  - Always bump a cache-buster and invalidate the server load.
  //  - For the first few kicks (and first focus/visible), also send ?forceClaim=1.
  //    The server will ignore the claim gate cookie when this param is present.
  let firstFocusForced = false
  let firstVisibleForced = false
  let polls = 0
  const FORCE_POLLS = 3 // first ~36s at 12s cadence will force claim
  const MAX_POLLS = 10 // total short poll attempts (~2 min)
  const POLL_MS = 12_000

  /**
   * Bump a cache-buster in the URL (replaceState; no visible navigation),
   * then invalidate the server load that declared depends("lm:entitlements").
   * This forces a fresh LM fetch via forceReload (?bust=...) on the server.
   * When opts.forceClaim is true, we also add ?forceClaim=1 to bypass the gate.
   */
  async function refreshEntitlements(opts?: { forceClaim?: boolean }) {
    const href = new URL(window.location.href)
    href.searchParams.set("bust", Date.now().toString(36))
    if (opts?.forceClaim) href.searchParams.set("forceClaim", "1")
    else href.searchParams.delete("forceClaim")

    // replace the URL silently, keep focus, avoid scroll jank
    await goto(href.toString(), {
      replaceState: true,
      keepFocus: true,
      noScroll: true,
    })
    await invalidate("lm:entitlements")
  }

  onMount(() => {
    // --- Polling Guard ---
    // If the server already told us there's an error, don't start polling.
    const hasInitialError =
      !!data?.subscriptionState?.lmError ||
      !!$page.data.subscriptionState?.lmError
    if (hasInitialError) {
      return // Abort onMount early
    }

    let destroyed = false
    let lastKick = 0

    const KICK = async (opts?: { forceClaim?: boolean }) => {
      // de-dupe: avoid hammering if something else just triggered
      const now = Date.now()
      if (now - lastKick < 1500) return
      lastKick = now
      try {
        await refreshEntitlements(opts)
      } catch {
        /* ignore */
      }
    }

    // 1) Immediate first check shortly after mount — FORCE claim
    const t0 = window.setTimeout(() => {
      void KICK({ forceClaim: true })
    }, 600)

    // 2) Refresh when tab becomes visible — force only the first time
    const onVisible = () => {
      if (!document.hidden) {
        const force = !firstVisibleForced
        firstVisibleForced = true
        void KICK({ forceClaim: force })
      }
    }

    // 3) Refresh when window regains focus — force only the first time
    const onFocus = () => {
      const force = !firstFocusForced
      firstFocusForced = true
      void KICK({ forceClaim: force })
    }

    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onFocus)

    // 4) Gentle short polling — force the first few polls
    const timer = window.setInterval(() => {
      if (destroyed || polls >= MAX_POLLS) {
        window.clearInterval(timer)
        return
      }
      const force = polls < FORCE_POLLS
      polls++
      void KICK({ forceClaim: force })
    }, POLL_MS)

    return () => {
      destroyed = true
      window.clearTimeout(t0)
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onFocus)
    }
  })
</script>

<div class="drawer lg:drawer-open">
  <input id="admin-drawer" type="checkbox" class="drawer-toggle" />

  <!-- Main content -->
  <div class="drawer-content">
    <!-- Mobile top bar -->
    <div class="navbar bg-base-100 lg:hidden">
      <div class="flex-1">
        <a class="btn btn-ghost normal-case text-xl" href="/">{WebsiteName}</a>
      </div>
      <div class="flex-none">
        <div class="dropdown dropdown-end">
          <!-- Uses label-for pattern to toggle drawer; stays SSR-safe -->
          <label
            for="admin-drawer"
            class="btn btn-ghost btn-circle"
            aria-label="Open account menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
          </label>
        </div>
      </div>
    </div>

    <div class="container min-w-0 px-4 sm:px-6 lg:px-12 py-3 lg:py-6">
      {@render children?.()}
    </div>
  </div>

  <!-- Side navigation -->
  <div class="drawer-side">
    <label for="admin-drawer" class="drawer-overlay" aria-hidden="true"></label>

    <nav
      class="menu menu-lg p-4 w-80 min-h-full bg-base-100 lg:border-r text-primary"
      aria-label="Account navigation"
    >
      <li>
        <div
          class="normal-case menu-title text-xl font-bold text-primary flex flex-row items-center"
        >
          <a href="/" class="grow" data-sveltekit-reload>{WebsiteName}</a>
          <label
            for="admin-drawer"
            class="lg:hidden ml-3"
            aria-label="Close menu">✕</label
          >
        </div>
      </li>

      <li>
        <a
          href="/account"
          class={isActive("home")}
          onclick={closeDrawer}
          aria-current={adminSection === "home" ? "page" : undefined}
          data-sveltekit-prefetch
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Dashboard
        </a>
      </li>

      <li>
        <a
          href="/account/downloads"
          class={isActive("downloads")}
          onclick={closeDrawer}
          aria-current={adminSection === "downloads" ? "page" : undefined}
          data-sveltekit-prefetch
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          The Arsenal
        </a>
      </li>

      <li>
        <a
          href="/account/billing"
          class={isActive("billing")}
          onclick={closeDrawer}
          aria-current={adminSection === "billing" ? "page" : undefined}
          data-sveltekit-prefetch
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            stroke="none"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M18,1H6A3,3,0,0,0,3,4V22a1,1,0,0,0,1.8.6L6.829,19.9l1.276,2.552a1,1,0,0,0,.8.549.981.981,0,0,0,.89-.4L12,19.667,14.2,22.6a.983.983,0,0,0,.89.4,1,1,0,0,0,.8-.549L17.171,19.9,19.2,22.6a1,1,0,0,0,.8.4,1,1,0,0,0,1-1V4A3,3,0,0,0,18,1Zm1,18-1.2-1.6a.983.983,0,0,0-.89-.4,1,1,0,0,0-.8.549l-1.276,2.552L12.8,17.4a1,1,0,0,0-1.6,0L9.171,20.105,7.9,17.553A1,1,0,0,0,7.09,17a.987.987,0,0,0-.89.4L5,19V4A1,1,0,0,1,6,3H18a1,1,0,0,1,1,1ZM17,9a1,1,0,0,1-1,1H8A1,1,0,0,1,8,8h8A1,1,0,0,1,17,9Zm-4,4a1,1,0,0,1-1,1H8a1,1,0,0,1,0-2h4A1,1,0,0,1,13,13Z"
            />
          </svg>
          Billing
        </a>
      </li>

      <li>
        <a
          href="/account/reset-machine-id"
          class={isActive("reset-machine-id")}
          onclick={closeDrawer}
          aria-current={adminSection === "reset-machine-id"
            ? "page"
            : undefined}
          data-sveltekit-prefetch
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Reset Machine ID
        </a>
      </li>

      <li>
        <a
          href="/account/settings"
          class={isActive("settings")}
          onclick={closeDrawer}
          aria-current={adminSection === "settings" ? "page" : undefined}
          data-sveltekit-prefetch
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Settings
        </a>
      </li>

      <li class="mt-auto">
        <form method="POST" action="/account/sign_out">
          <button type="submit" class="w-full text-left text-base"
            >Sign Out</button
          >
        </form>
      </li>
    </nav>
  </div>
</div>
