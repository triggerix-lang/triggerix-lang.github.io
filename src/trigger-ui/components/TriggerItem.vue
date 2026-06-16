<script setup lang="ts">
import type { Segment, SlotValueEntry, ToolDescriptor, War3Editor } from 'triggerix-ui-preset-war3'
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
   * When true, the whole item becomes a single clickable unit.
   * Slot chips are rendered as plain text and the container emits `click`.
   * Delete button is hidden in this mode for cleaner display semantics.
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
    v-if="readonly"
    class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer transition-colors duration-150"
    @click="emit('click')"
  >
    <div class="flex-1 font-mono text-[0.82rem] leading-relaxed text-#c9d1d9">
      <SegmentRenderer
        :segments="segments"
        :slot-entries="slotEntries"
        :get-tool-descriptors="getToolDescriptors"
        :editor="editor"
        :readonly="true"
        :item-context="{ kind: type, index }"
      />
    </div>
  </div>
  <div
    v-else
    class="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-#1c2333 transition-colors duration-150 relative"
  >
    <div class="flex-1 font-mono text-[0.82rem] leading-relaxed text-#c9d1d9">
      <SegmentRenderer
        :segments="segments"
        :slot-entries="slotEntries"
        :get-tool-descriptors="getToolDescriptors"
        :editor="editor"
        @slot-click="(seg: SlotSegment) => emit('slotClick', seg)"
      />
    </div>
    <button
      type="button"
      title="删除"
      class="opacity-0 group-hover:opacity-100 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border-none bg-#f44336/10 text-#f44336 text-[0.7rem] hover:bg-#f44336/20 transition-all duration-150 cursor-pointer"
      @click="emit('delete', index)"
    >
      ✕
    </button>
  </div>
</template>
