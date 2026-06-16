<script setup lang="ts">
import type { ItemDescriptor, ToolDescriptor } from 'triggerix-ui-preset-war3'
import { ref } from 'vue'
import type { SlotSegment } from '../composables/useTriggerEditor'
import TriggerItem from './TriggerItem.vue'

const props = defineProps<{
  title: string
  type: 'event' | 'condition' | 'action'
  items: (ItemDescriptor | null)[]
  getAvailableTypes: () => { type: string; template: string }[]
  maxItems?: number
  getToolDescriptors: (segment: SlotSegment) => ToolDescriptor[]
}>()

const emit = defineEmits<{
  add: [type: string]
  delete: [index: number]
  slotFill: [index: number, slotKey: string, tool: string, value: unknown]
}>()

const showTypePicker = ref(false)
const typeOptions = ref<{ type: string; template: string }[]>([])

const sectionMeta = {
  event: {
    icon: '⚡',
    text: 'text-#d4a05c',
    bg: 'bg-#d4a05c/15',
    glow: 'shadow-[0_0_4px_rgba(212,160,92,0.2)]'
  },
  condition: {
    icon: '◆',
    text: 'text-#9d7cd8',
    bg: 'bg-#9d7cd8/15',
    glow: 'shadow-[0_0_4px_rgba(157,124,216,0.2)]'
  },
  action: {
    icon: '▶',
    text: 'text-#5fb3a1',
    bg: 'bg-#5fb3a1/15',
    glow: 'shadow-[0_0_4px_rgba(95,179,161,0.2)]'
  }
} as const

function toggleTypePicker() {
  if (props.maxItems && props.items.length >= props.maxItems) return
  if (!showTypePicker.value) {
    typeOptions.value = props.getAvailableTypes()
  }
  showTypePicker.value = !showTypePicker.value
}

function pickType(type: string) {
  emit('add', type)
  showTypePicker.value = false
}

function canAdd() {
  if (props.maxItems && props.items.length >= props.maxItems) return false
  return true
}
</script>

<template>
  <div class="px-4 py-3 border-b border-#2a3348 last:border-b-0">
    <div class="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/5">
      <span
        class="w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold flex-shrink-0"
        :class="[sectionMeta[type].bg, sectionMeta[type].text, sectionMeta[type].glow]"
      >
        {{ sectionMeta[type].icon }}
      </span>
      <span
        class="font-serif text-[0.7rem] font-semibold uppercase tracking-[0.12em]"
        :class="sectionMeta[type].text"
      >
        {{ title }}
      </span>
    </div>

    <div class="flex flex-col gap-0.5">
      <template v-if="items.length === 0">
        <div class="text-xs italic text-#7a8599 py-1">无</div>
      </template>
      <TriggerItem
        v-for="(item, i) in items"
        v-else
        :key="i"
        :segments="item?.segments ?? []"
        :index="i"
        :type="type"
        :get-tool-descriptors="getToolDescriptors"
        @delete="(idx: number) => emit('delete', idx)"
        @slot-fill="
          (key: string, tool: string, val: unknown) => emit('slotFill', i, key, tool, val)
        "
      />
    </div>

    <button
      v-if="canAdd()"
      type="button"
      class="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded bg-transparent border border-dashed border-#3d4f6a text-xs text-#7a8599 hover:border-#7a8599 hover:text-#c9d1d9 hover:bg-#222b3d transition-all duration-150 cursor-pointer"
      @click="toggleTypePicker"
    >
      <span class="text-sm leading-none">+</span>
      添加
    </button>

    <div
      v-if="showTypePicker"
      class="mt-1.5 rounded overflow-hidden bg-#222b3d border border-#3d4f6a"
    >
      <button
        v-for="t in typeOptions"
        :key="t.type"
        type="button"
        class="block w-full px-3 py-1.5 bg-transparent border-none text-#c9d1d9 text-xs text-left cursor-pointer hover:bg-#4fc3f7/8 transition-colors duration-150"
        @click="pickType(t.type)"
      >
        {{ t.template.replace(/\$\{[^}]+\}/g, '___') }}
      </button>
    </div>
  </div>
</template>
