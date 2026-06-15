<script setup lang="ts">
import type { SlotSegment, ToolDescriptor } from 'triggerix-editor-vue'
import { computed, ref } from 'vue'
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
  // auto-select if only one tool
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
  <div v-if="showPopover" class="slot-popover-overlay" @click="close" />
  <div v-if="showPopover" class="slot-popover">
    <div class="slot-popover__title">
      {{ segment.label }}
    </div>

    <!-- Tool selector (if multiple tools) -->
    <div v-if="hasMultipleTools && !selectedTool" class="slot-popover__tools">
      <button
        v-for="tool in toolDescriptors"
        :key="tool.name"
        class="slot-popover__tool-btn"
        @click="selectTool(tool)"
      >
        {{ tool.label }}
      </button>
    </div>

    <!-- Tool input -->
    <template v-if="selectedTool">
      <div v-if="hasMultipleTools" style="margin-bottom: 0.3rem">
        <button
          class="slot-popover__tool-btn slot-popover__tool-btn--active"
          @click="selectedTool = null"
        >
          ← {{ selectedTool.label }}
        </button>
      </div>
      <ToolInput :descriptor="selectedTool" @confirm="handleConfirm" />
    </template>
  </div>
</template>
