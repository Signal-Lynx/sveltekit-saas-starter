<!-- src/routes/(admin)/account/(menu)/settings/settings_module.svelte -->
<script lang="ts">
  import { applyAction, enhance } from "$app/forms"
  import { page } from "$app/stores"
  import type { SubmitFunction } from "@sveltejs/kit"
  import { goto } from "$app/navigation"
  import { tick } from "svelte"

  // Narrow, local-friendly type guards instead of relying on external ambient types
  type LiveForm = { errorFields?: string[]; errorMessage?: string } | undefined

  const fieldError = (liveForm: LiveForm, name: string) => {
    const errors = liveForm?.errorFields ?? []
    return errors.includes(name)
  }

  type ButtonState = "idle" | "loading" | "success"
  let buttonState = $state<ButtonState>("idle")

  // Track visibility for password fields by their ID
  // Linter fix: use const because we only mutate properties, not the variable itself
  const showPasswords = $state<Record<string, boolean>>({})

  type Field = {
    inputType?: string
    id: string
    label?: string
    initialValue: string | boolean
    placeholder?: string
    maxlength?: number
  }

  interface Props {
    editable?: boolean
    dangerous?: boolean
    title?: string
    message?: string
    fields: Field[]
    formTarget?: string
    editButtonTitle?: string | null
    editLink?: string | null
    saveButtonTitle?: string
    saveButtonClass?: string
    editButtonClass?: string
    successTitle?: string
  }

  const {
    editable = false,
    dangerous = false,
    title = "",
    message = "",
    fields,
    formTarget = "",
    editButtonTitle = null,
    editLink = null,
    saveButtonTitle = "Save",
    saveButtonClass = "",
    editButtonClass = "",
    successTitle = "Saved!",
  }: Props = $props()

  // Ensure the signature matches SvelteKit's SubmitFunction exactly
  const handleSubmit: SubmitFunction = (_input) => {
    buttonState = "loading"

    return async ({ result, update }) => {
      // 1) Follow server-side redirects from actions (e.g., updatePassword throws redirect)
      if (result.type === "redirect") {
        await goto(result.location, { replaceState: true, invalidateAll: true })
        buttonState = "idle"
        return
      }

      // 2) Keep form values / validation messages in sync without full reset
      await update({ reset: false })

      // 3) Apply action state for success/failure
      if (result.type === "success" || result.type === "failure") {
        await applyAction(result)
      }

      if (result.type === "failure") {
        // Focus the first errored field for better UX (best-effort)
        await tick()
        const firstErrorId = (
          result as unknown as { data?: { errorFields?: string[] } }
        )?.data?.errorFields?.[0]
        if (firstErrorId) {
          const el = document.getElementById(
            firstErrorId,
          ) as HTMLInputElement | null
          el?.focus()
        }
        buttonState = "idle"
        return
      }

      if (result.type === "success") {
        // For "normal" settings forms, keep existing redirect behavior
        if (!formTarget?.includes("toggleEmailSubscription")) {
          buttonState = "success"
          await goto("/account/settings?pw=updated", { invalidateAll: true })
          buttonState = "idle"
          return
        }

        // Email subscription toggle:
        // - switch to loading immediately (no delay)
        // - HARD reload so SSR + props are fresh (prevents stale initialValue)
        buttonState = "loading"
        await tick()
        // location.replace avoids adding another entry to history
        location.replace($page.url.href)
        return
      }

      // Any other outcome (e.g., error)
      buttonState = "idle"
    }
  }

  // Small helpers
  const inputAriaInvalid = (id: string) =>
    fieldError($page?.form, id) ? "true" : "false"
  const inputAutocomplete = (id: string, inputType?: string) => {
    if (inputType === "password" || /password/i.test(id)) return "new-password"
    if (/email/i.test(id)) return "email"
    if (/name/i.test(id)) return "name"
    if (/company/i.test(id)) return "organization"
    return "on"
  }
</script>

<!-- Root card -->
<div class="card bg-base-200 shadow-xl mt-8 max-w-xl">
  <div class="card-body flex-col md:flex-row">
    {#if title}
      <div class="w-full md:w-48 md:pr-8 flex-none mb-4 md:mb-0">
        <h2 class="card-title text-secondary">{title}</h2>
      </div>
    {/if}

    <div class="w-full">
      {#if message}
        <div
          class="mb-6 {dangerous ? 'alert alert-warning' : ''}"
          role="status"
          aria-live="polite"
        >
          {#if dangerous}
            <svg
              xmlns="http://www.w.org/2000/svg"
              class="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              /></svg
            >
          {/if}
          <span>{message}</span>
        </div>
      {/if}

      <form
        id="settings-form"
        class="form-widget flex flex-col"
        method="POST"
        action={formTarget}
        aria-busy={buttonState === "loading" ? "true" : "false"}
        novalidate
        use:enhance={handleSubmit}
      >
        {#each fields as field}
          <div class="form-control">
            {#if field.label}
              <label for={field.id} class="label">
                <span class="label-text">{field.label}</span>
              </label>
            {/if}

            {#if editable}
              {#if (field.inputType ?? "text") === "checkbox"}
                <input
                  id={field.id}
                  name={field.id}
                  type="checkbox"
                  disabled={!editable || buttonState === "loading"}
                  class="checkbox {fieldError($page?.form, field.id)
                    ? 'checkbox-error'
                    : ''}"
                  checked={($page.form
                    ? ($page.form[field.id] as unknown as boolean)
                    : (field.initialValue as boolean)) ?? false}
                  aria-invalid={inputAriaInvalid(field.id)}
                />
              {:else if field.inputType === "password"}
                <div class="relative w-full max-w-xs">
                  <input
                    id={field.id}
                    name={field.id}
                    type={showPasswords[field.id] ? "text" : "password"}
                    disabled={!editable || buttonState === "loading"}
                    placeholder={field.placeholder ?? field.label ?? ""}
                    class="input input-bordered w-full pr-12 {fieldError(
                      $page?.form,
                      field.id,
                    )
                      ? 'input-error'
                      : ''}"
                    value={$page.form
                      ? ($page.form[field.id] as string)
                      : field.initialValue}
                    maxlength={field.maxlength ?? undefined}
                    aria-invalid={inputAriaInvalid(field.id)}
                    autocomplete={inputAutocomplete(field.id, field.inputType)}
                  />
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs absolute right-2 top-3"
                    onclick={() =>
                      (showPasswords[field.id] = !showPasswords[field.id])}
                    aria-label={showPasswords[field.id]
                      ? "Hide password"
                      : "Show password"}
                  >
                    {showPasswords[field.id] ? "Hide" : "Show"}
                  </button>
                </div>
              {:else}
                <input
                  id={field.id}
                  name={field.id}
                  type={field.inputType ?? "text"}
                  disabled={!editable || buttonState === "loading"}
                  placeholder={field.placeholder ?? field.label ?? ""}
                  class="input input-bordered w-full max-w-xs {fieldError(
                    $page?.form,
                    field.id,
                  )
                    ? 'input-error'
                    : ''}"
                  value={$page.form
                    ? ($page.form[field.id] as string | boolean)
                    : field.initialValue}
                  maxlength={field.maxlength ?? undefined}
                  aria-invalid={inputAriaInvalid(field.id)}
                  autocomplete={inputAutocomplete(field.id, field.inputType)}
                />
              {/if}
            {:else}
              <div
                class="text-base-content/90 font-semibold min-h-[3rem] flex items-center"
              >
                {typeof field.initialValue === "boolean"
                  ? field.initialValue
                    ? "Yes"
                    : "No"
                  : field.initialValue}
              </div>
            {/if}
          </div>
        {/each}

        {#if $page?.form?.errorMessage}
          <p
            class="text-error text-sm font-bold mt-1"
            role="alert"
            aria-live="assertive"
          >
            {$page.form.errorMessage}
          </p>
        {/if}

        <div class="card-actions justify-end mt-4">
          {#if editable}
            <button
              type="submit"
              class="btn min-w-[145px] {dangerous
                ? 'btn-error'
                : 'btn-primary'} {saveButtonClass} {buttonState === 'success'
                ? 'btn-success'
                : ''}"
              disabled={buttonState === "loading"}
            >
              {#if buttonState === "loading"}
                <span class="loading loading-spinner"></span>
                Saving...
              {:else if buttonState === "success"}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  /></svg
                >
                {successTitle}
              {:else}
                {saveButtonTitle}
              {/if}
            </button>
          {:else if editButtonTitle && editLink}
            <a
              href={editLink}
              class="btn btn-sm {dangerous
                ? 'btn-error'
                : 'btn-primary'} {editButtonClass}"
              role="button">{editButtonTitle}</a
            >
          {/if}
        </div>
      </form>
    </div>
  </div>
</div>
