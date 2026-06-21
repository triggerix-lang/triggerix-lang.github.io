<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  id: string
  label: string
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  trigger: [eventType: string, source: string, payload?: Record<string, unknown>]
}>()

const inputRef = ref<HTMLInputElement | null>(null)

function handleFocus() {
  emit('trigger', 'input_focus', props.id)
}

function handleBlur() {
  emit('trigger', 'input_blur', props.id, { value: props.modelValue })
}

function handleInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  emit('update:modelValue', value)
  emit('trigger', 'input_change', props.id, { value })
}

function setValue(val: string) {
  emit('update:modelValue', val)
}

defineExpose({ setValue, focus: () => inputRef.value?.focus() })
</script>

<template>
  <label class="block">
    <span class="block text-xs font-mono uppercase tracking-widest text-#7a8599 mb-1.5">
      {{ label }}
      <span class="text-#3d4f6a">#{{ id }}</span>
    </span>
    <input
      ref="inputRef"
      :value="modelValue"
      type="text"
      class="w-full px-3 py-2 rounded bg-#0c0e14 border border-#2a3348 text-#e6edf3 text-sm font-mono placeholder:text-#3d4f6a outline-none transition-all duration-150 focus:border-#4fc3f7 focus:shadow-[0_0_0_3px_rgba(79,195,247,0.12)] hover:border-#3d4f6a"
      @focus="handleFocus"
      @blur="handleBlur"
      @input="handleInput"
    />
  </label>
</template>
