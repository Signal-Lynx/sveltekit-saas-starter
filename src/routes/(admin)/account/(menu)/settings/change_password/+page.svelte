<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import SettingsModule from "../settings_module.svelte"
  import { enhance } from "$app/forms"

  // Context (safe if missing)
  const adminSection = getContext<Writable<string> | undefined>("adminSection")
  adminSection?.set("settings")

  // Props
  type FormShape = { success?: boolean; error?: string }
  type UserLike = {
    email?: string
    amr?: Array<{ method?: string } | undefined>
  }

  const { data, form }: { data: { user?: UserLike }; form?: FormShape } =
    $props()
  const { user } = data ?? {}

  // AMR checks w/o ts-ignore
  const amr = Array.isArray(user?.amr)
    ? (user?.amr as Array<{ method?: string }>)
    : []
  const hasPassword = amr.some((x) => x?.method === "password")
  const usingOAuth = amr.some((x) => x?.method === "oauth")

  let isLoading = $state(false)
</script>

<svelte:head>
  <title>Change Password</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Update Password</h1>

{#if hasPassword}
  <SettingsModule
    title="Change Password"
    editable={true}
    saveButtonTitle="Change Password"
    successTitle="Credentials Updated"
    formTarget="/account/api?/updatePassword"
    saveButtonClass="btn-gradient-electric"
    fields={[
      {
        id: "newPassword1",
        label: "New Password",
        initialValue: "",
        inputType: "password",
      },
      {
        id: "newPassword2",
        label: "Confirm New Password",
        initialValue: "",
        inputType: "password",
      },
      {
        id: "currentPassword",
        label: "Current Password",
        initialValue: "",
        inputType: "password",
      },
    ]}
  />
{:else}
  <div class="card p-6 pb-7 mt-8 flex flex-col md:flex-row shadow-sm max-w-md">
    <div class="flex flex-col gap-y-4">
      {#if usingOAuth}
        <div class="font-bold">Set Your Password</div>
        <div>
          You're using a social login (like Google or GitHub). You can set a
          password here to enable email/password login as an alternative.
        </div>
      {:else}
        <div class="font-bold">Reset via Email</div>
      {/if}
      <div>
        Click below to send a secure password reset link to {user?.email}.
      </div>

      <form
        method="POST"
        action="?/requestPasswordReset"
        use:enhance={(/* input */) => {
          // start pending state immediately
          isLoading = true

          // Type the result handler param to avoid implicit-any on `update`
          return async ({
            update,
          }: {
            update: (options?: {
              reset?: boolean
              invalidateAll?: boolean
            }) => Promise<void>
          }) => {
            await update()
            isLoading = false
          }
        }}
        aria-busy={isLoading}
      >
        <button
          type="submit"
          class="btn btn-primary btn-wide {form?.success
            ? ''
            : 'btn-gradient-electric'}"
          disabled={isLoading}
          aria-disabled={isLoading}
        >
          {#if isLoading}
            <span class="loading loading-spinner" aria-hidden="true"></span>
            Sending...
          {:else if form?.success}
            Resend Email
          {:else}
            Send Password Reset Email
          {/if}
        </button>
      </form>

      {#if form?.success}
        <div class="alert alert-success" role="status" aria-live="polite">
          Transmission sent! Check your inbox for the secure link.
        </div>
      {/if}
      {#if form?.error}
        <div class="alert alert-error" role="alert">
          {form.error}
        </div>
      {/if}
    </div>
  </div>
{/if}
