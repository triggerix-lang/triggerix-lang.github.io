<script setup lang="ts">
import type { Segment, SlotSegment, ToolDescriptor } from 'triggerix-editor-vue'
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
  <div class="trigger-item">
    <div class="trigger-item__content">
      <SegmentRenderer
        :segments="segments"
        :get-tool-descriptors="getToolDescriptors"
        @slot-fill="(key: string, tool: string, val: unknown) => emit('slotFill', key, tool, val)"
      />
    </div>
    <button class="trigger-item__delete" title="删除" @click="emit('delete', index)">✕</button>
  </div>
</template>
