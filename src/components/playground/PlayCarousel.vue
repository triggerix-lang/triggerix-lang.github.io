<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  id: string
  items: string[]
  modelValue: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
  trigger: [eventType: string, source: string, payload?: Record<string, unknown>]
}>()

const current = computed(() => props.items[props.modelValue] ?? '')
const total = computed(() => props.items.length)

function go(delta: number) {
  if (total.value === 0) return
  const next = (props.modelValue + delta + total.value) % total.value
  emit('update:modelValue', next)
  emit('trigger', 'carousel_change', props.id, { index: next })
}

function setIndex(index: number) {
  if (index < 0 || index >= total.value) return
  if (index === props.modelValue) return
  emit('update:modelValue', index)
}

defineExpose({ setIndex })
</script>

<template>
  <div class="relative w-full max-w-sm">
    <div
      class="relative h-44 rounded-lg overflow-hidden bg-gradient-to-br from-#1c2333 via-#171d2a to-#0c0e14 border border-#2a3348 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <div class="absolute inset-0 flex items-center justify-center px-12">
        <transition
          mode="out-in"
          enter-active-class="transition duration-200"
          leave-active-class="transition duration-150"
          enter-from-class="opacity-0 translate-x-3"
          leave-to-class="opacity-0 -translate-x-3"
        >
          <div :key="modelValue" class="text-center text-#e6edf3 font-mono text-base px-4">
            {{ current }}
          </div>
        </transition>
      </div>

      <button
        type="button"
        class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-#0c0e14/70 border border-#2a3348 text-#9d7cd8 hover:bg-#0c0e14 hover:border-#9d7cd8 hover:text-#c4a8ff transition-all duration-150 cursor-pointer"
        @click="go(-1)"
      >
        ‹
      </button>

      <button
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-#0c0e14/70 border border-#2a3348 text-#9d7cd8 hover:bg-#0c0e14 hover:border-#9d7cd8 hover:text-#c4a8ff transition-all duration-150 cursor-pointer"
        @click="go(1)"
      >
        ›
      </button>

      <div class="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
        <span
          v-for="(_, i) in items"
          :key="i"
          class="w-1.5 h-1.5 rounded-full transition-all duration-150"
          :class="
            i === modelValue
              ? 'bg-#9d7cd8 shadow-[0_0_6px_rgba(157,124,216,0.8)] w-4'
              : 'bg-#3d4f6a'
          "
        />
      </div>
    </div>

    <div class="mt-2 flex items-center justify-between text-xs font-mono text-#7a8599">
      <span>#{{ id }}</span>
      <span>{{ modelValue + 1 }} / {{ total }}</span>
    </div>
  </div>
</template>
