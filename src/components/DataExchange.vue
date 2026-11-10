<script setup lang="ts">
import AppDialog from './AppDialog.vue'
import AppIcon from './AppIcon.vue'
defineProps<{ error: string }>()
const open = defineModel<boolean>({ required: true })
const text = defineModel<string>('text', { required: true })
defineEmits<{ apply: [] }>()
</script>
<template>
  <AppDialog v-model="open" title="Import workspace">
    <p class="mb-4 text-sm leading-relaxed text-muted">
      Paste an exported workspace or the bundled sample. Validation runs before your current
      workspace is replaced.
    </p>
    <label
      >Workspace JSON<textarea
        v-model="text"
        class="h-64 resize-y font-mono text-xs!"
        spellcheck="false"
        maxlength="120000"
      />
    </label>
    <p class="mt-3 min-h-10 text-xs leading-relaxed text-danger" role="alert">{{ error }}</p>
    <div class="mt-3 flex justify-end gap-2">
      <button class="hover:bg-soft" @click="open = false">Cancel</button
      ><button
        class="border-accent! bg-accent text-on-accent hover:brightness-110"
        @click="$emit('apply')"
      >
        <AppIcon name="upload" />Import workspace
      </button>
    </div>
  </AppDialog>
</template>
