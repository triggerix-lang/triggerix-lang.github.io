<script setup lang="ts">
import type { ToolDescriptor } from 'triggerix-ui-preset-war3'
import { computed, ref } from 'vue'
import type { SlotSegment } from '../composables/useTriggerEditor'
import ToolInput from './ToolInput.vue'

const props = defineProps<{
  segment: SlotSegment
  toolDescriptors: ToolDescriptor[]
}>()

const emit = defineEmits<{
  fill: [tool: string, value: unknown]
}>()

const showPopover = ref(false)
const selectedTool = ref<ToolDescriptor | null>(null)

const hasMultipleTools = computed(() => props.toolDescriptors.length > 1)

function open() {
  showPopover.value = true
  if (props.toolDescriptors.length === 1) {
    selectedTool.value = props.toolDescriptors[0]
  } else {
    selectedTool.value = null
  }
}

function close() {
  showPopover.value = false
  selectedTool.value = null
}

function selectTool(tool: ToolDescriptor) {
  selectedTool.value = tool
}

function handleConfirm(value: unknown) {
  if (selectedTool.value) {
    emit('fill', selectedTool.value.name, value)
  }
  close()
}

defineExpose({ open })
</script>

<template>
  <template v-if="showPopover">
    <div class="fixed inset-0 z-[999]" @click="close" />
    <div
      class="absolute z-[1000] left-0 top-full mt-1 min-w-[200px] max-w-[320px] rounded-md p-2 bg-#1a2030 border border-#2f3d54 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_2px_8px_rgba(0,0,0,0.3)] animate-[popover-enter_0.12s_ease-out]"
    >
      <div class="px-1.5 pt-1 pb-1.5 text-[0.7rem] uppercase tracking-wider text-#7a8599">
        {{ segment.label }}
      </div>

      <div v-if="hasMultipleTools && !selectedTool" class="flex flex-col gap-0.5 mb-1.5">
        <button
          v-for="tool in toolDescriptors"
          :key="tool.name"
          type="button"
          class="block w-full px-2 py-1.5 rounded bg-transparent border border-transparent text-#c9d1d9 text-xs text-left cursor-pointer hover:bg-#222b3d hover:border-#3d4f6a transition-all duration-150"
          @click="selectTool(tool)"
        >
          {{ tool.label }}
        </button>
      </div>

      <template v-if="selectedTool">
        <div v-if="hasMultipleTools" class="mb-1">
          <button
            type="button"
            class="block w-full px-2 py-1.5 rounded bg-#222b3d border border-#4fc3f7 text-#4fc3f7 text-xs text-left cursor-pointer transition-all duration-150"
            @click="selectedTool = null"
          >
            ← {{ selectedTool.label }}
          </button>
        </div>
        <ToolInput :descriptor="selectedTool" @confirm="handleConfirm" />
      </template>
    </div>
  </template>
</template>

<style>
@keyframes popover-enter {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
