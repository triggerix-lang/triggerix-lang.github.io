<script setup lang="ts">
import type { Segment, ToolDescriptor } from 'triggerix-ui-preset-war3'
import type { SlotSegment } from '../composables/useTriggerEditor'
import SegmentRenderer from './SegmentRenderer.vue'

defineProps<{
  segments: Segment[]
  index: number
  type: 'event' | 'condition' | 'action'
  getToolDescriptors: (segment: SlotSegment) => ToolDescriptor[]
}>()

const emit = defineEmits<{
  delete: [index: number]
  slotFill: [slotKey: string, tool: string, value: unknown]
}>()
</script>

<template>
  <div
    class="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-#1c2333 transition-colors duration-150 relative"
  >
    <div class="flex-1 font-mono text-[0.82rem] leading-relaxed text-#c9d1d9">
      <SegmentRenderer
        :segments="segments"
        :get-tool-descriptors="getToolDescriptors"
        @slot-fill="(key: string, tool: string, val: unknown) => emit('slotFill', key, tool, val)"
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
