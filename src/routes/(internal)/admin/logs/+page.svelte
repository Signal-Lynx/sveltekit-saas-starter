<!-- src/routes/(internal)/admin/logs/+page.svelte -->
<script lang="ts">
  export let data: {
    q: string
    entries: Array<{
      id: string
      created_at: string
      actor: string | null
      actor_email: string | null
      action: string
      target: string | null
      target_email: string | null
      meta: Record<string, unknown> | null
    }>
  }

  const dtf = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
  function fmtDate(iso: string): string {
    const d = new Date(iso)
    return isNaN(d.getTime()) ? iso : dtf.format(d)
  }

  function qLink(value: string): string {
    return `/admin/logs?q=${encodeURIComponent(value)}`
  }

  function metaSummary(meta: Record<string, unknown> | null): string {
    if (!meta) return "—"
    try {
      const s = JSON.stringify(meta)
      return s.length <= 80 ? s : s.slice(0, 80) + "…"
    } catch {
      return "[unserializable]"
    }
  }

  let copiedKey: string | null = null
  let copyTimer: number | undefined
  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard?.writeText(text)
      copiedKey = key
      if (copyTimer) window.clearTimeout(copyTimer)
      copyTimer = window.setTimeout(() => (copiedKey = null), 1200)
    } catch {
      // clipboard may be unavailable; ignore
    }
  }
</script>

<svelte:head>
  <title>Audit Log</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<h1 class="text-2xl font-semibold mb-4">Audit Log</h1>

<form
  method="GET"
  class="mb-4 flex gap-2 items-center"
  aria-label="Search audit log"
>
  <input
    name="q"
    class="input input-bordered w-full"
    placeholder="Search by user ID, email, or action"
    value={data.q}
    autocomplete="off"
    aria-label="Search query"
  />
  <button class="btn btn-outline" type="submit">Search</button>
  {#if data.q}
    <a class="btn btn-outline" href="/admin/logs" aria-label="Clear search"
      >Clear</a
    >
  {/if}
</form>

{#if data.entries.length === 0}
  <div class="text-base-content/70">No audit events.</div>
{:else}
  <div class="mb-2 text-xs text-base-content/70">
    Showing {data.entries.length}
    {data.entries.length === 1 ? "event" : "events"}
    {#if data.q}
      for "<span class="font-mono">{data.q}</span>"{/if}.
  </div>

  <div class="overflow-x-auto">
    <!-- Removed redundant role="table" -->
    <table class="table table-sm">
      <caption class="sr-only">Audit events table</caption>
      <thead>
        <tr class="text-left border-b">
          <th scope="col" class="py-2 pr-4">Time</th>
          <th scope="col" class="py-2 pr-4">Actor</th>
          <th scope="col" class="py-2 pr-4">Action</th>
          <th scope="col" class="py-2 pr-4">Target</th>
          <th scope="col" class="py-2 pr-4">Meta</th>
        </tr>
      </thead>
      <tbody>
        {#each data.entries as e (e.id)}
          <tr class="hover">
            <td class="py-2 pr-4 whitespace-nowrap">
              <time
                datetime={e.created_at}
                title={new Date(e.created_at).toISOString()}
              >
                {fmtDate(e.created_at)}
              </time>
            </td>

            <td class="py-2 pr-4">
              {#if e.actor}
                <div class="flex items-center gap-2">
                  <a class="font-mono break-words link" href={qLink(e.actor)}
                    >{e.actor}</a
                  >
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost"
                    aria-label="Copy actor ID"
                    on:click={() => copy(e.actor!, `actor:${e.id}`)}
                  >
                    {copiedKey === `actor:${e.id}` ? "Copied" : "Copy"}
                  </button>
                </div>
              {:else}
                <span class="text-base-content/50">—</span>
              {/if}
              {#if e.actor_email}
                <div class="mt-0.5 flex items-center gap-2">
                  <a
                    class="text-base-content/80 link break-words"
                    href={qLink(e.actor_email)}>{e.actor_email}</a
                  >
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost"
                    aria-label="Copy actor email"
                    on:click={() => copy(e.actor_email!, `actor_email:${e.id}`)}
                  >
                    {copiedKey === `actor_email:${e.id}` ? "Copied" : "Copy"}
                  </button>
                </div>
              {/if}
            </td>

            <td class="py-2 pr-4">
              <a class="link" href={qLink(e.action)}>{e.action}</a>
            </td>

            <td class="py-2 pr-4">
              {#if e.target}
                <div class="flex items-center gap-2">
                  <a class="font-mono break-words link" href={qLink(e.target)}
                    >{e.target}</a
                  >
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost"
                    aria-label="Copy target ID"
                    on:click={() => copy(e.target!, `target:${e.id}`)}
                  >
                    {copiedKey === `target:${e.id}` ? "Copied" : "Copy"}
                  </button>
                </div>
              {:else}
                <span class="text-base-content/50">—</span>
              {/if}
              {#if e.target_email}
                <div class="mt-0.5 flex items-center gap-2">
                  <a
                    class="text-base-content/80 link break-words"
                    href={qLink(e.target_email)}>{e.target_email}</a
                  >
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost"
                    aria-label="Copy target email"
                    on:click={() =>
                      copy(e.target_email!, `target_email:${e.id}`)}
                  >
                    {copiedKey === `target_email:${e.id}` ? "Copied" : "Copy"}
                  </button>
                </div>
              {/if}
            </td>

            <td class="py-2 pr-4">
              {#if e.meta}
                <details open>
                  <summary
                    class="cursor-pointer select-none text-xs text-base-content/80 mb-1"
                  >
                    {metaSummary(e.meta)}
                  </summary>
                  <pre
                    class="text-xs bg-base-200 rounded p-2 whitespace-pre-wrap break-words">
{JSON.stringify(e.meta, null, 2)}
                  </pre>
                </details>
              {:else}
                <span class="text-base-content/50">—</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
