<!-- src/routes/(admin)/account/(menu)/settings/edit_profile/+page.svelte -->
<script lang="ts">
  import SettingsModule from "../settings_module.svelte"
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"

  /**
   * Shape of the profile data we expect from the page load.
   * Uses optional + null-friendly fields for robustness.
   */
  type Profile = {
    full_name?: string | null
    company_name?: string | null
    website?: string | null
  }

  type Props = {
    data: {
      profile?: Profile | null
    }
  }

  // Props (Svelte 5)
  const { data }: Props = $props()

  /**
   * Context is optional in practice; guard the call so missing context
   * doesn't throw at runtime in isolated renders/tests.
   */
  const adminSection = getContext<Writable<string> | undefined>("adminSection")
  adminSection?.set("settings")

  /**
   * Helper to normalize possibly null/undefined strings to "" for inputs.
   */
  const asInput = (v: string | null | undefined) =>
    typeof v === "string" ? v : ""
</script>

<svelte:head>
  <title>Edit Profile</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Update Profile</h1>

<SettingsModule
  editable={true}
  title="Operator Details"
  successTitle="Profile Updated"
  formTarget="/account/api?/updateProfile"
  saveButtonClass="btn-gradient-electric"
  fields={[
    {
      id: "fullName",
      label: "Name",
      initialValue: asInput(data.profile?.full_name),
      placeholder: "Your full name",
      maxlength: 50,
    },
    {
      id: "companyName",
      label: "Company Name",
      initialValue: asInput(data.profile?.company_name),
      maxlength: 50,
    },
    {
      id: "website",
      label: "Company Website",
      initialValue: asInput(data.profile?.website),
      maxlength: 50,
    },
  ]}
/>
