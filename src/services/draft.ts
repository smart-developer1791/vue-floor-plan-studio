import { ref, watch, type Ref } from 'vue'

export function useDraft<T>(key: string, initial: T, parse: (value: unknown) => T) {
  const storageStatus = ref('Local draft ready')
  let value = parse(initial)
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      value = parse(JSON.parse(stored))
      storageStatus.value = 'Saved on this device'
    }
  } catch {
    storageStatus.value = 'Draft unavailable; sample restored'
  }
  const draft = ref(value) as Ref<T>
  watch(
    draft,
    (next) => {
      let valid: T
      try {
        valid = parse(next)
      } catch {
        storageStatus.value = 'Fix draft errors; last valid save kept'
        return
      }
      try {
        localStorage.setItem(key, JSON.stringify(valid))
        storageStatus.value = 'Saved on this device'
      } catch {
        storageStatus.value = 'Storage unavailable; export to keep your work'
      }
    },
    { deep: true },
  )
  return { draft, storageStatus }
}
