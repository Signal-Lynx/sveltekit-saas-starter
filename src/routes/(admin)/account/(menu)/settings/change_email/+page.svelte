<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import SettingsModule from "../settings_module.svelte"

  // Context (safe if missing)
  const adminSection = getContext<Writable<string> | undefined>("adminSection")
  adminSection?.set("settings")

  // Props
  type User = { email?: string } | null
  type Props = { data: { user: User } }
  const { data }: Props = $props()

  // Runes-mode derivations (no `$:` reactive labels)
  const user: User = $derived(data?.user ?? null)
  const emailInitial: string = $derived(user?.email ?? "")
</script>

<svelte:head>
  <title>Change Email</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Update Email Address</h1>

<SettingsModule
  title="Change Login Email"
  editable={true}
  saveButtonTitle="Update Email"
  successTitle="Email Update Initiated"
  formTarget="/account/api?/updateEmail"
  saveButtonClass="btn-gradient-electric"
  fields={[
    {
      id: "email",
      label: "New Email",
      initialValue: emailInitial,
      placeholder: "Email address",
    },
  ]}
/>
