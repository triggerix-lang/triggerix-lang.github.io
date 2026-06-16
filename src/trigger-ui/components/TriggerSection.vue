<script setup lang="ts">
import type {
  ItemDescriptor,
  SlotValueEntry,
  ToolDescriptor,
  War3Editor
} from 'triggerix-ui-preset-war3'
import { computed } from 'vue'
import type { SlotSegment } from '../composables/useTriggerEditor'
import TriggerItem from './TriggerItem.vue'

interface AvailableType {
  type: string
  label: string
}

const props = defineProps<{
  title: string
  type: 'event' | 'condition' | 'action'
  items: (ItemDescriptor | null)[]
  /**
   * Parallel array of slot value maps for each item. `slotEntriesList[i]`
   * corresponds to `items[i]`. Forwarded to each `TriggerItem` so it can
   * resolve composite-tool display text via `resolveSlotDisplayText`.
   */
  slotEntriesList?: (Record<string, SlotValueEntry> | undefined)[]
  availableTypes: AvailableType[]
  maxItems?: number
  getToolDescriptors: (segment: SlotSegment) => ToolDescriptor[]
  editor?: War3Editor | null
  readonly?: boolean
}>()

const emit = defineEmits<{
  add: [type: 'event' | 'condition' | 'action']
  delete: [index: number]
  slotClick: [itemIndex: number, segment: SlotSegment]
  editItem: [index: number]
}>()

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

const canAdd = computed(() => {
  if (props.maxItems && props.items.length >= props.maxItems) return false
  return props.availableTypes.length > 0
})

function handleAdd() {
  emit('add', props.type)
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
        :slot-entries="slotEntriesList?.[i]"
        :index="i"
        :type="type"
        :get-tool-descriptors="getToolDescriptors"
        :editor="editor"
        :readonly="readonly"
        @delete="(idx: number) => emit('delete', idx)"
        @slot-click="(seg: SlotSegment) => emit('slotClick', i, seg)"
        @click="() => emit('editItem', i)"
      />
    </div>

    <button
      v-if="canAdd"
      type="button"
      class="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded bg-transparent border border-dashed border-#3d4f6a text-xs text-#7a8599 hover:border-#7a8599 hover:text-#c9d1d9 hover:bg-#222b3d transition-all duration-150 cursor-pointer"
      @click="handleAdd"
    >
      <span class="text-sm leading-none">+</span>
      添加
    </button>
  </div>
</template>
