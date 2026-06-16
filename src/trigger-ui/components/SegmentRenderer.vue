<script setup lang="ts">
import type { Segment, ToolDescriptor } from 'triggerix-ui-preset-war3'
import type { SlotSegment } from '../composables/useTriggerEditor'
import SlotChip from './SlotChip.vue'

defineProps<{
  segments: Segment[]
  getToolDescriptors: (segment: SlotSegment) => ToolDescriptor[]
}>()

const emit = defineEmits<{
  slotFill: [slotKey: string, tool: string, value: unknown]
}>()

function handleSlotFill(slotKey: string, tool: string, value: unknown) {
  emit('slotFill', slotKey, tool, value)
}
</script>

<template>
  <span class="inline">
    <template v-for="(seg, i) in segments" :key="i">
      <span v-if="seg.type === 'text'" class="text-#c9d1d9 whitespace-pre-wrap">{{
        seg.content
      }}</span>
      <SlotChip
        v-else-if="seg.type === 'slot'"
        :segment="seg as SlotSegment"
        :tool-descriptors="getToolDescriptors(seg as SlotSegment)"
        @fill="
          (tool: string, value: unknown) => handleSlotFill((seg as SlotSegment).key, tool, value)
        "
      />
    </template>
  </span>
</template>
