<script setup lang="ts">
const props = defineProps<{
  id: string
  label: string
}>()

const emit = defineEmits<{
  trigger: [eventType: string, source: string, payload?: Record<string, unknown>]
}>()

function handleClick() {
  emit('trigger', 'button_click', props.id)
}
</script>

<template>
  <button
    type="button"
    class="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded bg-gradient-to-b from-#1f2a3d to-#161c2a border border-#3d4f6a hover:border-#5fb3a1 text-#e6edf3 text-sm font-medium tracking-wide shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_4px_12px_rgba(0,0,0,0.4)] hover:shadow-[0_0_0_1px_rgba(95,179,161,0.3),0_4px_18px_rgba(95,179,161,0.18)] active:translate-y-px transition-all duration-150 cursor-pointer select-none"
    @click="handleClick"
  >
    <span
      class="w-1.5 h-1.5 rounded-full bg-#5fb3a1 shadow-[0_0_6px_rgba(95,179,161,0.8)] group-hover:bg-#80cbc4 group-hover:shadow-[0_0_10px_rgba(128,203,196,0.9)]"
    />
    <span>{{ label }}</span>
    <span class="ml-1 font-mono text-#7a8599 text-xs">#{{ id }}</span>
  </button>
</template>
