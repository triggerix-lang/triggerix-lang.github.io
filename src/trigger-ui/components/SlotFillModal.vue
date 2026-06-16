<script setup lang="ts">
import {
  type CompositeToolDescriptor,
  type LeafToolDescriptor,
  type Segment,
  type SlotDef,
  type SlotValueEntry,
  type ToolDescriptor,
  type War3Editor
} from 'triggerix-ui-preset-war3'
import { computed, ref, watch } from 'vue'
import type { SlotSegment } from '../composables/useTriggerEditor'
import Modal from './Modal.vue'
import SegmentRenderer from './SegmentRenderer.vue'

const props = defineProps<{
  open: boolean
  segment: SlotSegment | null
  toolDescriptors: ToolDescriptor[]
  currentValue?: SlotValueEntry | null
  /**
   * Editor instance — required when any of the available tools is a
   * composite tool. Used to (1) recompute composite preview segments
   * with the locally-edited subSlotValues, and (2) resolve nested
   * tool descriptors for child slots.
   */
  editor?: War3Editor | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [entry: SlotValueEntry]
}>()

const openModel = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v)
})

const selectedTool = ref<ToolDescriptor | null>(null)

// Leaf-tool inputs
const textValue = ref('')
const numberValue = ref<number | null>(null)
const selectValue = ref<string | null>(null)

// Composite-tool sub-slot values
const subSlotValues = ref<Record<string, SlotValueEntry>>({})

const isLeaf = computed<LeafToolDescriptor | null>(() =>
  selectedTool.value?.type === 'leaf' ? selectedTool.value : null
)
const isComposite = computed<CompositeToolDescriptor | null>(() =>
  selectedTool.value?.type === 'composite' ? selectedTool.value : null
)

const inputType = computed(() => isLeaf.value?.input.type)

const selectOptions = computed(() => {
  if (!isLeaf.value || isLeaf.value.input.type !== 'select') return []
  return isLeaf.value.input.options ?? []
})

// Recompute composite preview segments with the current subSlotValues so
// that filled child slots render their resolved labels.
const compositeSegments = computed<Segment[]>(() => {
  const composite = isComposite.value
  if (!composite) return []
  if (props.editor) {
    const descriptor = props.editor.getToolDescriptor(composite.name, subSlotValues.value)
    if (descriptor && descriptor.type === 'composite') return descriptor.segments
  }
  return composite.segments
})

function pickToolByName(name: string | null): ToolDescriptor | null {
  if (!name) return null
  return props.toolDescriptors.find((t) => t.name === name) ?? null
}

function reset() {
  // Restore from currentValue, otherwise fall back to single-tool auto-pick.
  const currentTool = pickToolByName(props.currentValue?.tool ?? null)
  if (currentTool) {
    selectedTool.value = currentTool
  } else if (props.toolDescriptors.length === 1) {
    selectedTool.value = props.toolDescriptors[0] ?? null
  } else {
    selectedTool.value = null
  }

  const v = props.currentValue?.value
  textValue.value = typeof v === 'string' ? v : ''
  numberValue.value = typeof v === 'number' ? v : null
  selectValue.value = typeof v === 'string' ? v : null
  subSlotValues.value = { ...props.currentValue?.subSlots }
}

watch(
  () => props.open,
  (v) => {
    if (v) reset()
  }
)

function backToToolList() {
  selectedTool.value = null
  textValue.value = ''
  numberValue.value = null
  selectValue.value = null
  subSlotValues.value = {}
}

function pickTool(tool: ToolDescriptor) {
  selectedTool.value = tool
  textValue.value = ''
  numberValue.value = null
  selectValue.value = null
  subSlotValues.value = {}
}

const canConfirm = computed(() => {
  if (!selectedTool.value) return false
  if (selectedTool.value.type === 'leaf') {
    switch (selectedTool.value.input.type) {
      case 'text':
        return textValue.value.length > 0
      case 'number':
        return numberValue.value !== null && !Number.isNaN(numberValue.value)
      case 'select':
        return selectValue.value !== null
    }
    return false
  }
  if (selectedTool.value.type === 'composite') {
    // Require every slot in the composite tool to be filled.
    for (const seg of compositeSegments.value) {
      if (seg.type === 'slot') {
        const entry = subSlotValues.value[seg.key]
        const filled =
          entry &&
          (entry.value !== undefined || (entry.subSlots && Object.keys(entry.subSlots).length > 0))
        if (!filled) return false
      }
    }
    return true
  }
  return false
})

function close() {
  emit('update:open', false)
}

function confirm() {
  if (!selectedTool.value || !canConfirm.value) return
  if (selectedTool.value.type === 'leaf') {
    let value: unknown = null
    switch (selectedTool.value.input.type) {
      case 'text':
        value = textValue.value
        break
      case 'number':
        value = numberValue.value
        break
      case 'select':
        value = selectValue.value
        break
    }
    emit('confirm', { tool: selectedTool.value.name, value })
  } else {
    // composite: forward the structured sub-slot tree.
    emit('confirm', {
      tool: selectedTool.value.name,
      value: undefined,
      subSlots: { ...subSlotValues.value }
    })
  }
  emit('update:open', false)
}

const showToolPicker = computed(
  () => props.toolDescriptors.length > 1 && selectedTool.value === null
)

// --- Nested slot fill (for composite tools) -------------------------------
const nestedOpen = ref(false)
const nestedSegment = ref<SlotSegment | null>(null)
const nestedTools = ref<ToolDescriptor[]>([])
const nestedCurrent = ref<SlotValueEntry | null>(null)

function getSubSlotTools(seg: SlotSegment): ToolDescriptor[] {
  if (!props.editor) return []
  return props.editor.getSlotTools({ label: seg.label, tools: seg.tools } as SlotDef)
}

function handleSubSlotClick(seg: SlotSegment) {
  nestedSegment.value = seg
  nestedTools.value = getSubSlotTools(seg)
  nestedCurrent.value = subSlotValues.value[seg.key] ?? null
  nestedOpen.value = true
}

function handleNestedConfirm(entry: SlotValueEntry) {
  if (!nestedSegment.value) return
  subSlotValues.value = { ...subSlotValues.value, [nestedSegment.value.key]: entry }
}
</script>

<template>
  <Modal v-model:open="openModel" :mask-closable="true">
    <div
      class="-mx-5 -my-4 px-5 py-4 bg-#131722 text-#c9d1d9 border border-#2a3348 rounded-md font-sans"
    >
      <div class="flex items-center justify-between mb-3 pb-2 border-b border-#2a3348">
        <div class="flex items-center gap-2 min-w-0">
          <span
            class="inline-flex items-center justify-center w-5 h-5 rounded-sm bg-#4fc3f7/15 text-#4fc3f7 text-xs font-bold flex-shrink-0"
          >
            ◇
          </span>
          <div class="min-w-0">
            <div
              class="text-[0.65rem] uppercase tracking-[0.18em] text-#7a8599 font-semibold leading-none mb-0.5"
            >
              填充槽位
            </div>
            <div class="text-sm font-semibold text-#e6edf3 truncate">
              {{ segment?.label ?? '' }}
            </div>
          </div>
        </div>
        <button
          type="button"
          class="w-7 h-7 rounded text-#7a8599 hover:text-#c9d1d9 hover:bg-#222b3d border-0 bg-transparent cursor-pointer transition-colors text-base leading-none"
          @click="close"
        >
          ✕
        </button>
      </div>

      <!-- Tool picker -->
      <div v-if="showToolPicker" class="flex flex-col gap-1">
        <div class="text-[0.65rem] uppercase tracking-[0.14em] text-#7a8599 mb-1 font-semibold">
          选择填充方式
        </div>
        <button
          v-for="tool in toolDescriptors"
          :key="tool.name"
          type="button"
          class="w-full px-3 py-2.5 text-left rounded-sm bg-#1a2030 border border-#2f3d54 text-#c9d1d9 text-sm cursor-pointer hover:bg-#222b3d hover:border-#4fc3f7/50 hover:text-#e6edf3 transition-colors duration-150"
          @click="pickTool(tool)"
        >
          {{ tool.label }}
          <span
            v-if="tool.type === 'composite'"
            class="ml-1.5 text-[0.6rem] uppercase tracking-widest text-#9d7cd8/80"
          >
            composite
          </span>
        </button>
      </div>

      <!-- Tool input -->
      <div v-else-if="selectedTool" class="flex flex-col gap-2">
        <div
          v-if="toolDescriptors.length > 1"
          class="flex items-center justify-between text-[0.7rem] text-#7a8599"
        >
          <span class="text-#80cbc4">{{ selectedTool.label }}</span>
          <button
            type="button"
            class="text-#7a8599 hover:text-#4fc3f7 cursor-pointer bg-transparent border-0 p-0 text-[0.7rem]"
            @click="backToToolList"
          >
            ← 切换
          </button>
        </div>

        <!-- Leaf inputs -->
        <template v-if="selectedTool.type === 'leaf' && inputType === 'text'">
          <input
            v-model="textValue"
            type="text"
            :placeholder="isLeaf?.input.placeholder || '请输入...'"
            class="w-full px-3 py-2 rounded-sm bg-#0c0e14 border border-#3d4f6a text-#e6edf3 font-mono text-sm outline-none transition-colors duration-150 placeholder:text-#5a6478 focus:border-#4fc3f7 focus:shadow-[0_0_0_2px_rgba(79,195,247,0.12)]"
            @keydown.enter="confirm"
          />
        </template>

        <template v-else-if="selectedTool.type === 'leaf' && inputType === 'number'">
          <input
            v-model.number="numberValue"
            type="number"
            :placeholder="isLeaf?.input.placeholder || '请输入数字...'"
            class="w-full px-3 py-2 rounded-sm bg-#0c0e14 border border-#3d4f6a text-#e6edf3 font-mono text-sm outline-none transition-colors duration-150 placeholder:text-#5a6478 focus:border-#4fc3f7 focus:shadow-[0_0_0_2px_rgba(79,195,247,0.12)]"
            @keydown.enter="confirm"
          />
        </template>

        <template v-else-if="selectedTool.type === 'leaf' && inputType === 'select'">
          <div class="flex flex-col gap-1 max-h-[260px] overflow-y-auto pr-0.5">
            <button
              v-for="opt in selectOptions"
              :key="opt.value"
              type="button"
              class="w-full px-3 py-2 text-left rounded-sm bg-#1a2030 border text-sm cursor-pointer transition-colors duration-150"
              :class="
                selectValue === opt.value
                  ? 'border-#80cbc4 text-#80cbc4 bg-#80cbc4/8'
                  : 'border-#2f3d54 text-#c9d1d9 hover:bg-#222b3d hover:border-#4fc3f7/40'
              "
              @click="selectValue = opt.value"
            >
              {{ opt.label }}
            </button>
            <div
              v-if="selectOptions.length === 0"
              class="px-3 py-4 text-center text-xs text-#7a8599 italic"
            >
              暂无可选项
            </div>
          </div>
        </template>

        <!-- Composite preview -->
        <template v-else-if="selectedTool.type === 'composite'">
          <div
            class="px-3 py-2.5 rounded-sm bg-#0c0e14 border border-#9d7cd8/30 font-mono text-[0.85rem] leading-relaxed text-#c9d1d9"
          >
            <SegmentRenderer
              :segments="compositeSegments"
              :slot-entries="subSlotValues"
              :get-tool-descriptors="getSubSlotTools"
              :editor="editor"
              @slot-click="handleSubSlotClick"
            />
          </div>
          <div class="text-[0.7rem] text-#7a8599 italic">点击虚线占位填充子槽位。</div>
        </template>

        <template v-else>
          <div class="px-3 py-4 text-center text-xs text-#7a8599 italic">该工具暂不支持</div>
        </template>
      </div>

      <div v-else class="px-3 py-6 text-center text-xs text-#7a8599 italic">没有可用的填充方式</div>
    </div>

    <template #footer>
      <button
        type="button"
        class="px-4 py-1.5 rounded-sm bg-transparent border border-#3d4f6a text-#c9d1d9 text-xs cursor-pointer hover:bg-#222b3d hover:border-#7a8599 transition-colors duration-150"
        @click="close"
      >
        取消
      </button>
      <button
        type="button"
        :disabled="!canConfirm"
        class="px-4 py-1.5 rounded-sm border text-xs cursor-pointer transition-colors duration-150"
        :class="
          canConfirm
            ? 'bg-#4fc3f7/15 border-#4fc3f7/40 text-#4fc3f7 hover:bg-#4fc3f7/25 hover:border-#4fc3f7'
            : 'bg-#1a2030 border-#2f3d54 text-#5a6478 cursor-not-allowed'
        "
        @click="confirm"
      >
        确定
      </button>
    </template>
  </Modal>

  <!-- Recursive nested slot fill (only for composite tools) -->
  <SlotFillModal
    v-if="editor && nestedOpen"
    v-model:open="nestedOpen"
    :segment="nestedSegment"
    :tool-descriptors="nestedTools"
    :current-value="nestedCurrent"
    :editor="editor"
    @confirm="handleNestedConfirm"
  />
</template>
