<!-- FILE: src/routes/(marketing)/+layout.svelte -->
<script lang="ts">
  import { dev } from "$app/environment"
  import { page } from "$app/stores"
  import { WebsiteName, SITE_CONFIG, WebsiteBaseUrl } from "./../../config"
  import "../../app.css"

  interface Props {
    children?: import("svelte").Snippet
  }

  const { children }: Props = $props()
  const HOME_HREF = dev ? "/" : WebsiteBaseUrl
</script>

<svelte:head>
  <!-- Improved Syntax: Handles dev and prod URLs perfectly -->
  <link
    rel="canonical"
    href={(dev ? $page.url.origin : WebsiteBaseUrl) + $page.url.pathname}
  />
</svelte:head>

<div class="navbar bg-base-100 container mx-auto relative z-40">
  <div class="flex-1">
    <a class="btn btn-ghost text-xl" href={HOME_HREF} data-sveltekit-reload>
      <img
        src={SITE_CONFIG.logoPath}
        alt={SITE_CONFIG.logoAlt}
        class="h-10 w-auto mr-2"
      />
      {WebsiteName}
    </a>
  </div>
  <!-- ... existing navigation markup remains unchanged ... -->
  <div class="flex-none">
    <ul class="menu menu-horizontal px-1 hidden sm:flex font-bold text-lg">
      <li class="dropdown dropdown-hover md:mx-2">
        <div tabindex="0" role="button">Products</div>
        <ul
          class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
        >
          {#each SITE_CONFIG.footerNav.products as item}
            <li><a href={item.href}>{item.name}</a></li>
          {/each}
        </ul>
      </li>
      <li class="md:mx-2"><a href="/docs">Docs</a></li>
      <li class="md:mx-2"><a href="/articles">Articles</a></li>
      <li class="md:mx-2"><a href="/faq">FAQ</a></li>
      <li class="md:mx-2"><a href="/contact_us">Contact</a></li>
      <li class="md:mx-2"><a href="/account">Account</a></li>
      <li class="md:mx-0">
        <a href="/search" aria-label="Search">
          <svg
            fill="currentColor"
            class="w-6 h-6"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
            ><path
              d="M17.545 15.467l-3.779-3.779a6.15 6.15 0 0 0 .898-3.21c0-3.417-2.961-6.377-6.378-6.377A6.185 6.185 0 0 0 2.1 8.287c0 3.416 2.961 6.377 6.377 6.377a6.15 6.15 0 0 0 3.115-.844l3.799 3.801a.953.953 0 0 0 1.346 0l.943-.943c.371-.371.236-.84-.135-1.211zM4.004 8.287a4.282 4.282 0 0 1 4.282-4.283c2.366 0 4.474 2.107 4.474 4.474a4.284 4.284 0 0 1-4.283 4.283c-2.366-.001-4.473-2.109-4.473-4.474z"
              fill="currentColor"
            /></svg
          >
        </a>
      </li>
    </ul>

    <div class="dropdown dropdown-end sm:hidden">
      <button
        id="mobile-menu-button"
        type="button"
        class="btn btn-ghost btn-circle"
        aria-label="Open menu"
        aria-haspopup="menu"
        aria-controls="mobile-nav-menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h7"
          /></svg
        >
      </button>
      <ul
        id="mobile-nav-menu"
        class="menu menu-lg dropdown-content mt-3 z-50 p-2 shadow-lg bg-base-100/95 backdrop-blur rounded-box w-56 font-bold"
        role="menu"
        aria-labelledby="mobile-menu-button"
      >
        <li>
          <span>Products</span>
          <ul class="p-2">
            {#each SITE_CONFIG.footerNav.products as item}
              <li><a href={item.href} role="menuitem">{item.name}</a></li>
            {/each}
          </ul>
        </li>
        {#each SITE_CONFIG.footerNav.company as item}
          <li><a href={item.href} role="menuitem">{item.name}</a></li>
        {/each}
        <li><a href="/account" role="menuitem">Account</a></li>
      </ul>
    </div>
  </div>
</div>

<div class="">
  {@render children?.()}
</div>

<div class="grow"></div>

<div class="bg-base-100">
  <div class="border-t max-w-7xl mx-auto"></div>
  <footer class="footer p-10 max-w-7xl mx-auto text-base-content">
    <nav>
      <span class="footer-title opacity-80">Products</span>
      {#each SITE_CONFIG.footerNav.products as item}
        <a class="link link-hover" href={item.href}>{item.name}</a>
      {/each}
    </nav>
    <nav>
      <span class="footer-title opacity-80">Company</span>
      {#each SITE_CONFIG.footerNav.company as item}
        <a class="link link-hover" href={item.href}>{item.name}</a>
      {/each}
    </nav>
    <nav>
      <span class="footer-title opacity-80">Community</span>
      {#each SITE_CONFIG.socials as item}
        <a
          href={item.href}
          class="link link-hover"
          target="_blank"
          rel="noopener noreferrer">{item.name}</a
        >
      {/each}
    </nav>
    <nav>
      <span class="footer-title opacity-80">Legal & Policies</span>
      {#each SITE_CONFIG.footerNav.legal as item}
        <a class="link link-hover" href={item.href}>{item.name}</a>
      {/each}
    </nav>
  </footer>
</div>
