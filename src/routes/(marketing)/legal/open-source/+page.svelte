<script lang="ts">
  import ContentPage from "$lib/components/layout/ContentPage.svelte"
  import { WebsiteName } from "../../../../config"
</script>

<ContentPage title="Open-Source Notices">
  <p>
    {WebsiteName} is built with amazing open-source software. The following is a list
    of some key components and their licenses. Your rights under those licenses are
    not limited by our Terms of Service.
  </p>
  <ul>
    <li>
      <a
        href="https://github.com/sveltejs/kit/blob/master/LICENSE"
        target="_blank"
        rel="noopener noreferrer">SvelteKit</a
      > — MIT License
    </li>
    <li>
      <a
        href="https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE"
        target="_blank"
        rel="noopener noreferrer">Tailwind CSS</a
      > — MIT License
    </li>
    <li>
      <a
        href="https://github.com/saadeghi/daisyui/blob/master/LICENSE"
        target="_blank"
        rel="noopener noreferrer">daisyUI</a
      > — MIT License
    </li>
    <li>
      <a
        href="https://github.com/supabase/supabase/blob/master/LICENSE"
        target="_blank"
        rel="noopener noreferrer">Supabase</a
      > — Apache 2.0 License
    </li>
  </ul>
</ContentPage>
