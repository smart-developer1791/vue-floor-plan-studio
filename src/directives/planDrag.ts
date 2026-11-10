import type { ObjectDirective } from 'vue'

export interface DragBinding {
  x: number
  y: number
  disabled: boolean
  cellSize: () => number
  select: () => void
  preview: (x: number, y: number) => void
  commit: (x: number, y: number) => void
  cancel: () => void
}
interface DragState {
  binding: DragBinding
  dispose: () => void
}
const states = new WeakMap<HTMLElement, DragState>()

export const vPlanDrag: ObjectDirective<HTMLElement, DragBinding> = {
  mounted(element, binding) {
    const state: DragState = { binding: binding.value, dispose: () => {} }
    let pointer: number | null = null
    let origin = { x: 0, y: 0, clientX: 0, clientY: 0, size: 1 }
    let target = { x: 0, y: 0 }
    let moved = false
    function cancel() {
      if (pointer === null) return
      const id = pointer
      pointer = null
      if (element.hasPointerCapture(id)) element.releasePointerCapture(id)
      state.binding.cancel()
    }
    function down(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0 || pointer !== null) return
      element.focus({ preventScroll: true })
      state.binding.select()
      if (state.binding.disabled) return
      const size = state.binding.cellSize()
      if (!Number.isFinite(size) || size <= 0) return
      origin = {
        x: state.binding.x,
        y: state.binding.y,
        clientX: event.clientX,
        clientY: event.clientY,
        size,
      }
      target = { x: origin.x, y: origin.y }
      pointer = event.pointerId
      moved = false
      element.setPointerCapture(pointer)
    }
    function move(event: PointerEvent) {
      if (pointer !== event.pointerId) return
      const dx = event.clientX - origin.clientX,
        dy = event.clientY - origin.clientY
      if (!moved && Math.hypot(dx, dy) < 4) return
      moved = true
      target = {
        x: origin.x + Math.round(dx / origin.size),
        y: origin.y + Math.round(dy / origin.size),
      }
      state.binding.preview(target.x, target.y)
    }
    function up(event: PointerEvent) {
      if (pointer !== event.pointerId) return
      const id = pointer
      pointer = null
      if (element.hasPointerCapture(id)) element.releasePointerCapture(id)
      if (moved) state.binding.commit(target.x, target.y)
      else state.binding.cancel()
    }
    function lost(event: PointerEvent) {
      if (event.pointerId === pointer) cancel()
    }
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape') cancel()
    }
    element.addEventListener('pointerdown', down)
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', up)
    element.addEventListener('pointercancel', lost)
    element.addEventListener('lostpointercapture', lost)
    window.addEventListener('keydown', key)
    state.dispose = () => {
      cancel()
      element.removeEventListener('pointerdown', down)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', up)
      element.removeEventListener('pointercancel', lost)
      element.removeEventListener('lostpointercapture', lost)
      window.removeEventListener('keydown', key)
    }
    states.set(element, state)
  },
  updated(element, binding) {
    const state = states.get(element)
    if (state) state.binding = binding.value
  },
  beforeUnmount(element) {
    states.get(element)?.dispose()
    states.delete(element)
  },
}
