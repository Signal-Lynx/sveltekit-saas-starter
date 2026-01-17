<!-- src/routes/(admin)/account/(menu)/settings/+page.svelte -->
<script lang="ts">
  import { getContext } from "svelte"
  import { writable, type Writable } from "svelte/store"
  import SettingsModule from "./settings_module.svelte"
  import { page } from "$app/stores"
  import { browser } from "$app/environment"

  // Shape of data expected from the server load
  type PageData = {
    user: { email?: string | null } | null
    profile: {
      full_name?: string | null
      company_name?: string | null
      website?: string | null
      unsubscribed?: boolean | null
    } | null
  }

  // Acquire admin section context safely; fall back to a local store if missing
  const adminSection: Writable<string> =
    getContext<Writable<string>>("adminSection") ?? writable("")
  adminSection.set("settings")

  // Typed props
  const { data } = $props() as { data: PageData }

  // Destructure with safe fallbacks
  const user = $derived.by(() => data?.user ?? null)
  const profile = $derived.by(() => data?.profile ?? null)

  // Derive query flag (client-only to avoid SSR hazards)
  const pwUpdated = $derived(
    browser && $page.url.searchParams.get("pw") === "updated",
  )
</script>

<svelte:head>
  <title>Settings</title>
</svelte:head>

{#if pwUpdated}
  <div
    role="alert"
    aria-live="polite"
    class="alert alert-success mb-6"
    data-testid="password-updated-alert"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="stroke-current shrink-0 h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <span
      >Settings updated. Please check your inbox for confirmation details.</span
    >
  </div>
{/if}

<h1 class="text-3xl font-bold text-primary mb-2">Operator Settings</h1>

<SettingsModule
  title="Profile"
  editable={false}
  fields={[
    { id: "fullName", label: "Name", initialValue: profile?.full_name ?? "" },
    {
      id: "companyName",
      label: "Company Name",
      initialValue: profile?.company_name ?? "",
    },
    {
      id: "website",
      label: "Company Website",
      initialValue: profile?.website ?? "",
    },
  ]}
  editButtonTitle="Edit Profile"
  editLink="/account/settings/edit_profile"
  editButtonClass="btn-gradient-electric"
/>

<SettingsModule
  title="Email"
  editable={false}
  fields={[{ id: "email", initialValue: user?.email ?? "" }]}
  editButtonTitle="Change Email"
  editLink="/account/settings/change_email"
  editButtonClass="btn-gradient-electric"
/>

<SettingsModule
  title="Password"
  editable={false}
  fields={[{ id: "password", initialValue: "••••••••••••••••" }]}
  editButtonTitle="Change Password"
  editLink="/account/settings/change_password"
  editButtonClass="btn-gradient-electric"
/>

<SettingsModule
  title="Email Subscription"
  editable={false}
  fields={[
    {
      id: "subscriptionStatus",
      initialValue: profile?.unsubscribed ? "Unsubscribed" : "Subscribed",
    },
  ]}
  editButtonTitle="Change Subscription"
  editLink="/account/settings/change_email_subscription"
  editButtonClass="btn-gradient-electric"
/>

<SettingsModule
  title="Danger Zone"
  editable={false}
  dangerous={true}
  fields={[]}
  editButtonTitle="Delete Account"
  editLink="/account/settings/delete_account"
/>
