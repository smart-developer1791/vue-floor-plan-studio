<script setup lang="ts">
defineProps<{ title: string; subtitle: string; code: string }>()
</script>
<template>
  <header
    class="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-5 md:px-8"
  >
    <a
      href="/"
      class="flex min-w-0 items-center gap-3 text-ink no-underline"
      aria-label="Workspace home"
    >
      <span
        class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent font-display text-sm font-bold tracking-wide text-on-accent"
        >{{ code }}</span
      >
      <span
        ><span class="block font-display text-lg font-semibold leading-tight">{{ title }}</span
        ><span class="mt-1 block text-xs text-muted">{{ subtitle }}</span></span
      >
    </a>
    <div class="flex flex-wrap items-center gap-2"><slot /></div>
  </header>
</template>
