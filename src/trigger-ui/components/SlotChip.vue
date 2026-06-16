<script setup lang="ts">
import type { ToolDescriptor } from 'triggerix-ui-preset-war3'
import { ref } from 'vue'
import type { SlotSegment } from '../composables/useTriggerEditor'
import SlotPopover from './SlotPopover.vue'

const props = defineProps<{
  segment: SlotSegment
  toolDescriptors: ToolDescriptor[]
}>()

const emit = defineEmits<{
  fill: [tool: string, value: unknown]
}>()

const popoverRef = ref<InstanceType<typeof SlotPopover> | null>(null)

function isFilled(): boolean {
  const v = props.segment.value
  return v !== null && v !== undefined && v !== ''
}

function getDisplayText(): string {
  const v = props.segment.value
  if (v === null || v === undefined || v === '') return props.segment.label
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return String(v)
}

function handleClick() {
  popoverRef.value?.open()
}

function handleFill(tool: string, value: unknown) {
  emit('fill', tool, value)
}
</script>

<template>
  <span class="relative inline-block">
    <span
      class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-sm font-mono text-[0.82rem] cursor-pointer border transition-all duration-150"
      :class="
        isFilled()
          ? 'text-#80cbc4 bg-#80cbc4/8 border-#80cbc4/15 hover:bg-#80cbc4/14 hover:border-#80cbc4/30 hover:shadow-[0_0_8px_rgba(128,203,196,0.12)]'
          : 'text-#4fc3f7 bg-#4fc3f7/8 border-#4fc3f7/15 border-dashed hover:bg-#4fc3f7/14 hover:border-#4fc3f7/30 hover:shadow-[0_0_8px_rgba(79,195,247,0.12)]'
      "
      @click="handleClick"
    >
      <span v-if="!isFilled()" class="opacity-50">[</span>
      {{ getDisplayText() }}
      <span v-if="!isFilled()" class="opacity-50">]</span>
    </span>
    <SlotPopover
      ref="popoverRef"
      :segment="segment"
      :tool-descriptors="toolDescriptors"
      @fill="handleFill"
    />
  </span>
</template>
