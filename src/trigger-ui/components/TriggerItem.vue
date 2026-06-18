<script setup lang="ts">
import type {
  Segment,
  SlotValueEntry,
  ToolDescriptor,
  War3Editor
} from 'triggerix-editor-preset-war3'
import type { SlotSegment } from '../composables/useTriggerEditor'
import SegmentRenderer from './SegmentRenderer.vue'

defineProps<{
  segments: Segment[]
  /**
   * Map of `slotKey -> SlotValueEntry` for this item's slots. Forwarded to
   * `SegmentRenderer` so it can resolve fill state and composite-tool
   * display text.
   */
  slotEntries?: Record<string, SlotValueEntry>
  index: number
  type: 'event' | 'condition' | 'action'
  getToolDescriptors: (segment: SlotSegment) => ToolDescriptor[]
  editor?: War3Editor | null
  /**
   * When true, the whole item becomes a single clickable unit and slot
   * segments are rendered as plain text. The delete button is always
   * available; clicks on it are stopped from bubbling to the container.
   */
  readonly?: boolean
}>()

const emit = defineEmits<{
  delete: [index: number]
  slotClick: [segment: SlotSegment]
  click: []
}>()
</script>

<template>
  <div
    class="group flex items-center gap-2 px-2 py-1.5 rounded transition-colors duration-150 relative"
    :class="readonly ? 'hover:bg-white/5 cursor-pointer' : 'hover:bg-#1c2333'"
    @click="readonly && emit('click')"
  >
    <div class="flex-1 font-mono text-[0.82rem] leading-relaxed text-#c9d1d9">
      <SegmentRenderer
        :segments="segments"
        :slot-entries="slotEntries"
        :get-tool-descriptors="getToolDescriptors"
        :editor="editor"
        :readonly="readonly"
        :item-context="{ kind: type, index }"
        @slot-click="(seg: SlotSegment) => emit('slotClick', seg)"
      />
    </div>
    <button
      type="button"
      title="删除"
      aria-label="删除"
      class="opacity-0 group-hover:opacity-100 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border-none bg-#f44336/10 text-#f44336 hover:bg-#f44336/20 transition-all duration-150 cursor-pointer"
      @click.stop="emit('delete', index)"
    >
      <span class="i-mdi-trash-can-outline text-[14px]" aria-hidden="true" />
    </button>
  </div>
</template>
