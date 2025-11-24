<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import SettingsModule from "../settings_module.svelte"

  // Narrow, defensive types for incoming data
  interface Profile {
    unsubscribed?: boolean | null
  }
  interface Props {
    data: { profile?: Profile | null }
  }

  // Accept props (Svelte 5)
  const { data }: Props = $props()

  // Gracefully handle absent profile
  const profile: Profile | null | undefined = data?.profile

  // Optional context: if parent provides an admin section store, set it to "settings"
  const adminSection = getContext<Writable<string> | undefined>("adminSection")
  adminSection?.set("settings")

  // Derived values (Svelte 5) – keeps logic declarative and immutable
  const unsubscribed = $derived(!!profile?.unsubscribed)

  const statusMessage = $derived(
    unsubscribed
      ? "You are currently UNSUBSCRIBED from marketing and product update emails."
      : "You are currently SUBSCRIBED to marketing and product update emails.",
  )

  const saveButtonTitle = $derived(
    unsubscribed ? "Re-subscribe" : "Unsubscribe",
  )
  const successTitle = $derived(
    unsubscribed ? "Subscription Reactivated" : "Unsubscribed",
  )

  // Fixed endpoint (unchanged), explicitly const for safety
  const formTarget = "/account/api?/toggleEmailSubscription" as const
</script>

<svelte:head>
  <title>Change Email Subscription</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Email Subscription</h1>

<SettingsModule
  editable={true}
  title="Communications"
  message={statusMessage}
  {saveButtonTitle}
  {successTitle}
  {formTarget}
  saveButtonClass="btn-gradient-electric"
  fields={[]}
/>
