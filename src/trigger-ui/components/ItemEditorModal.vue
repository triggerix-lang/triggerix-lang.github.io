<script setup lang="ts">
import {
  parseTemplate,
  type SlotDef,
  type SlotValueEntry,
  type ToolDescriptor,
  type War3Editor
} from 'triggerix-editor-preset-war3'
import { computed, ref, watch } from 'vue'
import type { SlotSegment } from '../composables/useTriggerEditor'
import Modal from './Modal.vue'
import SegmentRenderer from './SegmentRenderer.vue'
import SlotFillModal from './SlotFillModal.vue'

interface AvailableType {
  id: string
  label: string
}

const props = defineProps<{
  open: boolean
  type: 'event' | 'condition' | 'action'
  availableTypes: AvailableType[]
  editor: War3Editor
  editType?: string
  editSlotValues?: Record<string, SlotValueEntry>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [type: string, slotValues: Record<string, SlotValueEntry>]
}>()

const isEditMode = computed(() => props.editType !== undefined)

const openModel = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v)
})

const titleMap = {
  event: { add: '添加事件', edit: '编辑事件' },
  condition: { add: '添加条件', edit: '编辑条件' },
  action: { add: '添加动作', edit: '编辑动作' }
} as const

const accentMap = {
  event: { text: 'text-#d4a05c', bg: 'bg-#d4a05c/15', icon: '⚡' },
  condition: { text: 'text-#9d7cd8', bg: 'bg-#9d7cd8/15', icon: '◆' },
  action: { text: 'text-#5fb3a1', bg: 'bg-#5fb3a1/15', icon: '▶' }
} as const

const selectedType = ref<string | null>(null)
const slotValues = ref<Record<string, SlotValueEntry>>({})
let suppressTypeWatch = false

// Slot fill nested modal state
const fillModalOpen = ref(false)
const fillSegment = ref<SlotSegment | null>(null)
const fillTools = ref<ToolDescriptor[]>([])
const fillCurrentValue = ref<SlotValueEntry | null>(null)

watch(
  () => props.open,
  (v) => {
    if (v) {
      suppressTypeWatch = true
      if (props.editType !== undefined) {
        // Edit mode: prefill with existing values
        selectedType.value = props.editType
        slotValues.value = props.editSlotValues ? { ...props.editSlotValues } : {}
      } else {
        // Add mode: reset to defaults
        selectedType.value = props.availableTypes.length > 0 ? props.availableTypes[0].id : null
        slotValues.value = {}
      }
      fillModalOpen.value = false
      // Release suppression after current tick so the watcher sees the assignment
      // but skips clearing slot values
      Promise.resolve().then(() => {
        suppressTypeWatch = false
      })
    }
  }
)

watch(selectedType, () => {
  if (suppressTypeWatch) return
  slotValues.value = {}
})

function getDefByType(
  type: string
): { id: string; template: string; slots?: Record<string, SlotDef> } | undefined {
  switch (props.type) {
    case 'event':
      return props.editor.getAvailableEvents().find((d) => d.id === type)
    case 'condition':
      return props.editor.getAvailableConditions().find((d) => d.id === type)
    case 'action':
      return props.editor.getAvailableActions().find((d) => d.id === type)
  }
  return undefined
}

const selectedDef = computed(() => {
  if (!selectedType.value) return null
  return getDefByType(selectedType.value) ?? null
})

const previewSegments = computed(() => {
  if (!selectedDef.value) return []
  return parseTemplate(selectedDef.value.template, selectedDef.value.slots, slotValues.value)
})

function getSlotToolDescriptors(seg: SlotSegment): ToolDescriptor[] {
  return props.editor.getSlotTools({ label: seg.label, tools: seg.tools })
}

function handleSlotClick(seg: SlotSegment) {
  fillSegment.value = seg
  fillTools.value = getSlotToolDescriptors(seg)
  fillCurrentValue.value = slotValues.value[seg.key] ?? null
  fillModalOpen.value = true
}

function handleFillConfirm(entry: SlotValueEntry) {
  if (!fillSegment.value) return
  slotValues.value = { ...slotValues.value, [fillSegment.value.key]: entry }
}

function close() {
  emit('update:open', false)
}

function confirm() {
  if (!selectedType.value) return
  emit('confirm', selectedType.value, slotValues.value)
  emit('update:open', false)
}

const canConfirm = computed(() => selectedType.value !== null)

const titleText = computed(() => titleMap[props.type][isEditMode.value ? 'edit' : 'add'])
const headerLabel = computed(() => (isEditMode.value ? '编辑' : '新建'))
const accent = computed(() => accentMap[props.type])

const previewToolDescriptorsByKey = computed(() => {
  const map: Record<string, ToolDescriptor[]> = {}
  for (const seg of previewSegments.value) {
    if (seg.type === 'slot') {
      map[seg.key] = getSlotToolDescriptors(seg as SlotSegment)
    }
  }
  return map
})

function getToolsForSegment(seg: SlotSegment): ToolDescriptor[] {
  return previewToolDescriptorsByKey.value[seg.key] ?? []
}
</script>

<template>
  <Modal v-model:open="openModel" :mask-closable="true">
    <div
      class="-mx-5 -my-4 px-5 py-4 bg-#131722 text-#c9d1d9 border border-#2a3348 b-b-none rounded-t-md font-sans"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-3 pb-2 border-b border-#2a3348">
        <div class="flex items-center gap-2 min-w-0">
          <span
            class="inline-flex items-center justify-center w-5 h-5 rounded-sm text-xs font-bold flex-shrink-0"
            :class="[accent.bg, accent.text]"
          >
            {{ accent.icon }}
          </span>
          <div class="min-w-0">
            <div
              class="text-[0.65rem] uppercase tracking-[0.18em] text-#7a8599 font-semibold leading-none mb-0.5"
            >
              {{ headerLabel }}
            </div>
            <div class="text-sm font-semibold text-#e6edf3">
              {{ titleText }}
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

      <!-- Type selector -->
      <div class="mb-3">
        <div class="text-[0.65rem] uppercase tracking-[0.14em] text-#7a8599 mb-1.5 font-semibold">
          类型
        </div>
        <div
          v-if="availableTypes.length === 0"
          class="px-3 py-3 rounded-sm border border-#2f3d54 bg-#1a2030 text-xs text-#7a8599 italic"
        >
          暂无可用类型
        </div>
        <select
          v-else
          v-model="selectedType"
          class="w-full px-3 py-2 rounded-sm bg-#1a2030 border border-#2f3d54 text-sm text-#c9d1d9 outline-none focus:border-#3d4f6a appearance-none cursor-pointer"
        >
          <option v-for="t in availableTypes" :key="t.id" :value="t.id">
            {{ t.label }}
          </option>
        </select>
      </div>

      <!-- Preview -->
      <div v-if="selectedDef">
        <div class="text-[0.65rem] uppercase tracking-[0.14em] text-#7a8599 mb-1.5 font-semibold">
          配置
        </div>
        <div
          class="px-3 py-2.5 rounded-sm bg-#0c0e14 border border-#2f3d54 font-mono text-[0.85rem] leading-relaxed text-#c9d1d9"
        >
          <SegmentRenderer
            :segments="previewSegments"
            :slot-entries="slotValues"
            :get-tool-descriptors="getToolsForSegment"
            :editor="editor"
            @slot-click="handleSlotClick"
          />
        </div>
        <div class="mt-1.5 text-[0.7rem] text-#7a8599 italic">点击虚线占位以填充槽位。</div>
      </div>
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
            ? [accent.bg, accent.text, 'border-current hover:brightness-110']
            : 'bg-#1a2030 border-#2f3d54 text-#5a6478 cursor-not-allowed'
        "
        @click="confirm"
      >
        确定
      </button>
    </template>
  </Modal>

  <!-- Nested slot fill modal -->
  <SlotFillModal
    v-model:open="fillModalOpen"
    :segment="fillSegment"
    :tool-descriptors="fillTools"
    :current-value="fillCurrentValue"
    :editor="editor"
    @confirm="handleFillConfirm"
  />
</template>
