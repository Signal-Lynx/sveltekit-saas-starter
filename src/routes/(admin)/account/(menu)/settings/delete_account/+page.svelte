<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import SettingsModule from "../settings_module.svelte"

  // Robust context fetch (no crash if not provided)
  type AdminSection = Writable<string>
  const adminSection = getContext<AdminSection | undefined>("adminSection")
  adminSection?.set("settings")

  // Typed constants (no behavioral changes)
  const PAGE_TITLE = "Delete Account" as const
  const HEADING = "Danger Zone: Self-Destruct" as const
  const MESSAGE =
    "Warning: This is the big red button. This action is irreversible. All your data, subscriptions, and access will be permanently purged from our systems. There is no undo." as const
  const FORM_TARGET = "/account/api?/deleteAccount" as const

  // Local typing for SettingsModule fields prop
  interface FieldConfig {
    id: string
    label: string
    initialValue: string
    inputType?: "text" | "password" | "email" | "url"
  }

  const fields: FieldConfig[] = [
    {
      id: "currentPassword",
      label: "Confirm Current Password",
      initialValue: "",
      inputType: "password",
    },
  ]
</script>

<svelte:head>
  <title>{PAGE_TITLE}</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">{HEADING}</h1>

<SettingsModule
  title="Delete Account"
  editable={true}
  dangerous={true}
  message={MESSAGE}
  saveButtonTitle="Initiate Self-Destruct"
  successTitle="Account Deletion In Progress"
  formTarget={FORM_TARGET}
  {fields}
/>
