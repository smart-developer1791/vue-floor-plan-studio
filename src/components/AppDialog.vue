<script setup lang="ts">
import { useId, useTemplateRef, watchEffect } from 'vue'
import AppIcon from './AppIcon.vue'
defineProps<{ title: string }>()
const open = defineModel<boolean>({ required: true })
const element = useTemplateRef<HTMLDialogElement>('dialog')
const titleId = useId()
watchEffect(
  () => {
    const dialog = element.value
    if (!dialog) return
    if (open.value && !dialog.open) dialog.showModal()
    else if (!open.value && dialog.open) dialog.close()
  },
  { flush: 'post' },
)
function syncClose() {
  // A close event queued before reopening must not reset the new open state.
  if (!element.value?.open) open.value = false
}
</script>
<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      :aria-labelledby="titleId"
      @close="syncClose"
      @click="$event.target === $event.currentTarget && (open = false)"
    >
      <header
        class="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4"
      >
        <h2 :id="titleId" class="text-xl font-semibold">{{ title }}</h2>
        <button
          class="size-10 shrink-0 bg-soft p-2 hover:bg-accent/10"
          aria-label="Close dialog"
          autofocus
          @click="open = false"
        >
          <AppIcon name="close" />
        </button>
      </header>
      <div class="overflow-y-auto p-5"><slot /></div>
    </dialog>
  </Teleport>
</template>
