<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, useId, useTemplateRef, watch } from 'vue'
import { palettes, placementError, type Furniture, type Plan } from '../domain/plan'
import { vPlanDrag } from '../directives/planDrag'

const props = defineProps<{ plan: Plan; selected: string }>()
const emit = defineEmits<{ select: [id: string]; move: [id: string, x: number, y: number] }>()
const frame = useTemplateRef<HTMLDivElement>('frame')
const room = useTemplateRef<HTMLDivElement>('room')
const dimensions = ref({ width: 0, height: 0 })
const ghost = ref<{ id: string; x: number; y: number } | null>(null)
const helpId = useId()
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry)
      dimensions.value = { width: entry.contentRect.width, height: entry.contentRect.height }
  })
  if (frame.value) observer.observe(frame.value)
})
onScopeDispose(() => observer?.disconnect())
watch(
  () => props.plan,
  () => {
    ghost.value = null
  },
)
const roomWidth = computed(() =>
  Math.max(
    0,
    Math.min(
      dimensions.value.width - 32,
      ((dimensions.value.height - 32) * props.plan.width) / props.plan.height,
    ),
  ),
)
const roomStyle = computed(() => ({
  width: `${roomWidth.value}px`,
  height: `${(roomWidth.value * props.plan.height) / props.plan.width}px`,
  backgroundSize: `${100 / props.plan.width}% ${100 / props.plan.height}%`,
}))
function current(item: Furniture) {
  return ghost.value?.id === item.id ? { ...item, x: ghost.value.x, y: ghost.value.y } : item
}
function style(item: Furniture) {
  const position = current(item)
  return {
    left: `${(position.x / props.plan.width) * 100}%`,
    top: `${(position.y / props.plan.height) * 100}%`,
    width: `${(item.width / props.plan.width) * 100}%`,
    height: `${(item.height / props.plan.height) * 100}%`,
    backgroundColor: palettes[item.tone].fill,
    color: palettes[item.tone].ink,
  }
}
function dragging(item: Furniture) {
  return {
    x: item.x,
    y: item.y,
    disabled: item.locked,
    cellSize: () => (room.value?.clientWidth ?? 0) / props.plan.width,
    select: () => emit('select', item.id),
    preview: (x: number, y: number) => {
      ghost.value = { id: item.id, x, y }
    },
    commit: (x: number, y: number) => {
      ghost.value = null
      emit('move', item.id, x, y)
    },
    cancel: () => {
      ghost.value = null
    },
  }
}
function keyboard(event: KeyboardEvent, item: Furniture) {
  const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[
    event.key
  ]
  if (!delta) return
  event.preventDefault()
  if (!item.locked)
    emit(
      'move',
      item.id,
      item.x + delta[0]! * (event.shiftKey ? 4 : 1),
      item.y + delta[1]! * (event.shiftKey ? 4 : 1),
    )
}
const ghostError = computed(() => {
  const item = props.plan.items.find((item) => item.id === ghost.value?.id)
  return item ? placementError(props.plan, current(item)) : ''
})
</script>
<template>
  <div
    ref="frame"
    class="flex h-[420px] items-center justify-center overflow-hidden rounded-xl border border-line bg-[#f4eee3] sm:h-[470px]"
    data-ui="canvas-frame"
  >
    <div
      ref="room"
      class="relative shrink-0 border-2 border-[#9c8974] bg-[#fcf8f0] bg-[linear-gradient(to_right,#cbbba75c_1px,transparent_1px),linear-gradient(to_bottom,#cbbba75c_1px,transparent_1px)]"
      :style="roomStyle"
      role="group"
      aria-label="Room furniture"
      :aria-describedby="helpId"
      data-ui="room"
    >
      <button
        v-for="item in plan.items"
        :key="item.id"
        v-plan-drag="dragging(item)"
        class="absolute min-h-0! touch-none select-none overflow-hidden border-2! p-1! text-[10px]! leading-tight transition-none!"
        :class="[
          selected === item.id
            ? 'z-10 border-accent! ring-2 ring-accent/25 ring-offset-1'
            : 'border-black/20! hover:border-accent!',
          item.kind === 'plant' ? 'rounded-full!' : 'rounded-md!',
          item.locked ? 'cursor-default!' : 'cursor-grab! active:cursor-grabbing!',
          ghost?.id === item.id && ghostError ? 'opacity-50 ring-danger!' : '',
        ]"
        :style="style(item)"
        :aria-label="`${item.label}, ${item.x * 25} by ${item.y * 25} centimeters${item.locked ? ', locked' : ''}`"
        :aria-pressed="selected === item.id"
        :data-piece="item.id"
        @click="emit('select', item.id)"
        @keydown="keyboard($event, item)"
      >
        <span v-if="item.width >= 4" class="pointer-events-none truncate">{{ item.label }}</span
        ><span v-else aria-hidden="true" class="pointer-events-none">{{
          item.kind === 'plant' ? '✳' : '▤'
        }}</span>
      </button>
      <span
        v-if="!plan.items.length"
        class="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted"
        >A fresh room. Add your first piece.</span
      >
    </div>
  </div>
  <p :id="helpId" class="mt-3 min-h-10 text-xs leading-relaxed text-muted">
    Drag to move. Focus a piece and use arrow keys to nudge; Shift moves four cells. Escape cancels
    a drag. <span v-if="ghostError" class="text-danger">{{ ghostError }}</span
    ><span v-else>Each square is 25 cm.</span>
  </p>
</template>
