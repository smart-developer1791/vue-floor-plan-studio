<script setup lang="ts">
defineProps<{
  name:
    | 'plus'
    | 'download'
    | 'upload'
    | 'reset'
    | 'close'
    | 'arrow'
    | 'check'
    | 'rotate'
    | 'trash'
    | 'info'
}>()
const paths = {
  plus: 'M12 5v14M5 12h14',
  download: 'M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4',
  upload: 'M12 16V4m-5 5 5-5 5 5M5 16v4h14v-4',
  reset: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
  close: 'm6 6 12 12M6 18 18 6',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  check: 'm5 12 4 4L19 6',
  rotate: 'M5 9a8 8 0 1 1 0 7M5 3v6h6',
  trash: 'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
  info: 'M12 11v6m0-10v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
}
</script>
<template>
  <svg
    class="size-4 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name]" />
  </svg>
</template>
