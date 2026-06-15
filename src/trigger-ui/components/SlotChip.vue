<script setup lang="ts">
import type { SlotSegment, ToolDescriptor } from 'triggerix-editor-vue'
import { ref } from 'vue'
import SlotPopover from './SlotPopover.vue'

defineProps<{
  segment: SlotSegment
  toolDescriptors: ToolDescriptor[]
}>()

const emit = defineEmits<{
  fill: [tool: string, value: unknown]
}>()

const popoverRef = ref<InstanceType<typeof SlotPopover> | null>(null)

const isFilled = (segment: SlotSegment) => segment.value != null && segment.value !== ''

function getDisplayText(segment: SlotSegment): string {
  const val = segment.value
  if (val == null || val === '') return segment.label
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  return String(val)
}

function handleClick() {
  popoverRef.value?.open()
}

function handleFill(tool: string, value: unknown) {
  emit('fill', tool, value)
}
</script>

<template>
  <span class="slot-chip-wrapper" style="position: relative; display: inline-block">
    <span
      class="slot-chip"
      :class="{
        'slot-chip--empty': !isFilled(segment),
        'slot-chip--filled': isFilled(segment)
      }"
      @click="handleClick"
    >
      <span v-if="!isFilled(segment)" class="slot-chip__bracket">[</span>
      {{ getDisplayText(segment) }}
      <span v-if="!isFilled(segment)" class="slot-chip__bracket">]</span>
    </span>
    <SlotPopover
      ref="popoverRef"
      :segment="segment"
      :tool-descriptors="toolDescriptors"
      @fill="handleFill"
    />
  </span>
</template>
