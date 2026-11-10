<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppDialog from './components/AppDialog.vue'
import AppIcon from './components/AppIcon.vue'
import DataExchange from './components/DataExchange.vue'
import FloorCanvas from './components/FloorCanvas.vue'
import StudioHeader from './components/StudioHeader.vue'
import {
  addItem,
  changeItem,
  exportPlan,
  exportSvg,
  importPlan,
  kinds,
  parsePlan,
  planMarker,
  sample,
  tones,
  type Furniture,
  type Kind,
  type Plan,
} from './domain/plan'
import { useDraft } from './services/draft'
import { clone, download } from './services/files'

const { draft: plan, storageStatus } = useDraft(
  'vue-floor-plan-studio:v1',
  clone(sample),
  parsePlan,
)
const selected = ref(plan.value.items[0]?.id ?? '')
const piece = ref<Furniture | null>(null)
const roomName = ref(plan.value.name)
const roomWidth = ref(plan.value.width)
const roomHeight = ref(plan.value.height)
const newKind = ref<Kind>('desk')
const message = ref('Your room is ready. Choose a piece to make it yours.')
const failure = ref(false)
const importOpen = ref(false),
  importText = ref(''),
  importError = ref(''),
  restoreOpen = ref(false),
  removeOpen = ref(false),
  guideOpen = ref(false)
watch(
  [plan, selected],
  () => {
    piece.value = clone(plan.value.items.find((item) => item.id === selected.value) ?? null)
    roomName.value = plan.value.name
    roomWidth.value = plan.value.width
    roomHeight.value = plan.value.height
  },
  { immediate: true },
)
const marker = computed(() => planMarker(plan.value))
const occupied = computed(() =>
  Math.round(
    (plan.value.items.reduce((sum, item) => sum + item.width * item.height, 0) /
      (plan.value.width * plan.value.height)) *
      100,
  ),
)
function update(next: () => Plan, success: string) {
  try {
    plan.value = parsePlan(next())
    message.value = success
    failure.value = false
    return true
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'The change could not be applied.'
    failure.value = true
    return false
  }
}
function move(id: string, x: number, y: number) {
  const item = plan.value.items.find((item) => item.id === id)
  if (!item || item.locked) return
  update(() => changeItem(plan.value, id, { x, y }), 'Position updated. The room has no overlaps.')
}
function add() {
  if (update(() => addItem(plan.value, newKind.value), 'A new piece found a free spot.'))
    selected.value = plan.value.items.at(-1)!.id
}
function applyPiece() {
  if (piece.value)
    update(() => changeItem(plan.value, selected.value, piece.value!), 'Furniture details saved.')
}
function rotate() {
  const current = plan.value.items.find((item) => item.id === selected.value)
  if (current && !current.locked)
    update(
      () => changeItem(plan.value, current.id, { width: current.height, height: current.width }),
      'Piece rotated a quarter turn.',
    )
}
function remove() {
  if (
    update(
      () => ({
        ...plan.value,
        items: plan.value.items.filter((item) => item.id !== selected.value),
      }),
      'Furniture removed.',
    )
  )
    selected.value = plan.value.items[0]?.id ?? ''
  removeOpen.value = false
}
function openImport() {
  importText.value = exportPlan(plan.value)
  importError.value = ''
  importOpen.value = true
}
function applyImport() {
  try {
    const next = importPlan(importText.value)
    plan.value = next
    selected.value = next.items[0]?.id ?? ''
    importOpen.value = false
    message.value = 'Workspace imported and checked for overlaps.'
    failure.value = false
  } catch (error) {
    importError.value = error instanceof Error ? error.message : 'Invalid workspace.'
  }
}
function restore() {
  plan.value = clone(sample)
  selected.value = plan.value.items[0]!.id
  restoreOpen.value = false
  message.value = 'The original studio is restored.'
  failure.value = false
}
</script>
<template>
  <div class="mx-auto max-w-[1600px]" data-project="vue-floor-plan-studio">
    <StudioHeader title="Floor Plan Studio" subtitle="Small spaces, considered layouts" code="FP">
      <button class="bg-surface hover:bg-soft" @click="openImport">
        <AppIcon name="upload" />Import
      </button>
      <button
        class="bg-surface hover:bg-soft"
        @click="download(`${marker}.json`, exportPlan(plan))"
      >
        <AppIcon name="download" />JSON
      </button>
      <button
        class="border-accent! bg-accent text-on-accent hover:brightness-110"
        @click="download(`${marker}.svg`, exportSvg(plan), 'image/svg+xml')"
      >
        <AppIcon name="download" />Export SVG
      </button>
    </StudioHeader>
    <main class="px-5 py-8 md:px-8">
      <div class="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div class="max-w-xl">
          <p class="mb-3 text-xs font-bold uppercase tracking-[.18em] text-accent">
            Room notes / 01
          </p>
          <h1 class="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            A little space.<br />A lot of possibility.
          </h1>
          <p class="mt-4 leading-relaxed text-muted">
            Arrange your everyday essentials, leave a little breathing room, and take your plan with
            you.
          </p>
        </div>
        <div class="flex gap-6 rounded-xl border border-line bg-surface px-5 py-4">
          <div>
            <span class="block font-display text-2xl font-semibold">{{ plan.items.length }}</span
            ><span class="text-xs text-muted">pieces</span>
          </div>
          <div>
            <span class="block font-display text-2xl font-semibold">{{ occupied }}%</span
            ><span class="text-xs text-muted">occupied</span>
          </div>
          <div>
            <span class="block font-display text-2xl font-semibold">{{
              (plan.width * plan.height * 0.0625).toFixed(1)
            }}</span
            ><span class="text-xs text-muted">square meters</span>
          </div>
        </div>
      </div>
      <div
        class="grid items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)_280px]"
        data-ui="workspace"
      >
        <aside class="min-w-0 rounded-2xl border border-line bg-surface p-5">
          <h2 class="text-lg font-semibold">The room</h2>
          <p class="mt-1 mb-5 text-xs text-muted">Dimensions use a 25 cm grid.</p>
          <form
            class="space-y-4"
            @submit.prevent="
              update(
                () => ({ ...plan, name: roomName, width: roomWidth, height: roomHeight }),
                'Room dimensions saved.',
              )
            "
          >
            <label>Room name<input v-model="roomName" maxlength="80" required /></label>
            <div class="grid grid-cols-2 gap-3">
              <label
                >Width (cells)<input
                  v-model.number="roomWidth"
                  type="number"
                  min="12"
                  max="40"
                  required /></label
              ><label
                >Depth (cells)<input
                  v-model.number="roomHeight"
                  type="number"
                  min="12"
                  max="40"
                  required
              /></label>
            </div>
            <button class="w-full bg-soft text-accent hover:bg-accent/10" type="submit">
              Apply room
            </button>
          </form>
          <hr class="my-5 border-line" />
          <h3 class="mb-4 text-sm font-semibold">Bring something in</h3>
          <label
            >Furniture type<select v-model="newKind">
              <option v-for="kind in kinds" :key="kind" :value="kind">
                {{ kind[0]!.toUpperCase() + kind.slice(1) }}
              </option>
            </select></label
          ><button
            class="mt-3 w-full bg-accent text-on-accent hover:brightness-110"
            :disabled="plan.items.length >= 30"
            @click="add"
          >
            <AppIcon name="plus" />Add furniture
          </button>
          <button
            class="mt-5 w-full border-0! text-muted hover:bg-soft"
            @click="restoreOpen = true"
          >
            <AppIcon name="reset" />Restore sample
          </button>
        </aside>
        <section
          class="min-w-0 rounded-2xl border border-line bg-surface p-4 sm:p-5"
          aria-label="Plan canvas"
        >
          <div class="mb-4 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <h2 class="truncate text-lg font-semibold">{{ plan.name }}</h2>
              <p class="mt-1 text-xs text-muted">
                {{ plan.width * 25 }} × {{ plan.height * 25 }} cm · Top view
              </p>
            </div>
            <span
              class="shrink-0 rounded-full bg-soft px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent"
              >Grid / 25 cm</span
            >
          </div>
          <FloorCanvas :plan="plan" :selected="selected" @select="selected = $event" @move="move" />
          <div class="mt-3 flex items-start gap-2 rounded-lg bg-soft p-3">
            <AppIcon :name="failure ? 'info' : 'check'" />
            <p
              class="min-h-10 text-xs leading-relaxed"
              :class="failure ? 'text-danger' : 'text-muted'"
              role="status"
              data-ui="status"
            >
              {{ message }}
            </p>
          </div>
        </section>
        <aside class="min-w-0 rounded-2xl border border-line bg-surface p-5">
          <h2 class="text-lg font-semibold">A closer look</h2>
          <p class="mt-1 text-xs text-muted">Select a piece on the plan or below.</p>
          <label class="mt-5"
            >Selected furniture<select v-model="selected" :disabled="!plan.items.length">
              <option v-if="!plan.items.length" value="">No furniture yet</option>
              <option v-for="item in plan.items" :key="item.id" :value="item.id">
                {{ item.label }}
              </option>
            </select></label
          >
          <div class="mt-5 min-h-[330px]">
            <form v-if="piece" class="space-y-4" @submit.prevent="applyPiece">
              <label>Piece label<input v-model="piece.label" maxlength="45" required /></label>
              <div class="grid grid-cols-2 gap-3">
                <label
                  >X (cells)<input
                    v-model.number="piece.x"
                    type="number"
                    min="0"
                    max="39"
                    required
                    :disabled="piece.locked" /></label
                ><label
                  >Y (cells)<input
                    v-model.number="piece.y"
                    type="number"
                    min="0"
                    max="39"
                    required
                    :disabled="piece.locked" /></label
                ><label
                  >Width (cells)<input
                    v-model.number="piece.width"
                    type="number"
                    min="1"
                    max="12"
                    required
                    :disabled="piece.locked" /></label
                ><label
                  >Depth (cells)<input
                    v-model.number="piece.height"
                    type="number"
                    min="1"
                    max="12"
                    required
                    :disabled="piece.locked"
                /></label>
              </div>
              <label
                >Material tone<select v-model="piece.tone">
                  <option v-for="tone in tones" :key="tone" :value="tone">{{ tone }}</option>
                </select></label
              >
              <label class="flex items-center gap-2"
                ><input v-model="piece.locked" type="checkbox" />Lock position and size</label
              >
              <button type="submit" class="w-full bg-soft text-accent hover:bg-accent/10">
                Apply furniture
              </button>
            </form>
            <p v-else class="rounded-xl bg-soft p-4 text-sm leading-relaxed text-muted">
              An empty room is a good place to start. Add a piece from the furniture menu.
            </p>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-2">
            <button class="hover:bg-soft" :disabled="!piece || piece.locked" @click="rotate">
              <AppIcon name="rotate" />Rotate</button
            ><button
              class="text-danger hover:bg-danger/5"
              :disabled="!piece"
              @click="removeOpen = true"
            >
              <AppIcon name="trash" />Remove
            </button>
          </div>
        </aside>
      </div>
    </main>
    <footer
      class="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-5 text-xs text-muted md:px-8"
    >
      <span>Made with Vue · <span class="text-accent">CodeSculptor</span></span
      ><span role="status">{{ storageStatus }}</span
      ><button
        class="min-h-8! border-0! px-0! text-xs! text-accent hover:underline"
        @click="guideOpen = true"
      >
        {{ marker }} <AppIcon name="info" />
      </button>
    </footer>
    <DataExchange
      v-model="importOpen"
      v-model:text="importText"
      :error="importError"
      @apply="applyImport"
    />
    <AppDialog v-model="restoreOpen" title="Restore the sample room?"
      ><p class="leading-relaxed text-muted">
        This replaces your local plan with the original creative studio. Export your current
        workspace first if you want to keep it.
      </p>
      <div class="mt-6 flex justify-end gap-2">
        <button @click="restoreOpen = false">Cancel</button
        ><button class="bg-accent text-on-accent" @click="restore">Restore sample</button>
      </div></AppDialog
    >
    <AppDialog v-model="removeOpen" title="Remove this piece?"
      ><p class="leading-relaxed text-muted">
        Remove {{ piece?.label ?? 'the selected piece' }} from this room?
      </p>
      <div class="mt-6 flex justify-end gap-2">
        <button @click="removeOpen = false">Cancel</button
        ><button class="bg-danger text-white" @click="remove">Remove furniture</button>
      </div></AppDialog
    >
    <AppDialog v-model="guideOpen" title="About this workspace"
      ><p class="leading-relaxed text-muted">
        The FP marker identifies this exact validated plan. It is included in JSON provenance, SVG
        metadata, and filenames. It is an identity aid, not a security signature.
      </p>
      <p class="mt-4 leading-relaxed text-muted">
        Pointer dragging uses a Vue directive that tracks binding updates and releases listeners
        when furniture leaves the page. Invalid moves preserve the last valid plan. This is a layout
        sketch; door clearances and construction measurements are not modeled.
      </p>
      <a class="mt-5 inline-block text-accent underline" href="/sample-workspace.json" download
        >Download the sample workspace</a
      ></AppDialog
    >
  </div>
</template>
