<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

const message = ref('')
const visible = ref(false)
const tone = ref<'info' | 'success' | 'warn'>('info')
let timer: number | null = null

function push(msg: string, t: 'info' | 'success' | 'warn' = 'info', duration = 2200) {
  message.value = msg
  tone.value = t
  visible.value = true
  if (timer) window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    visible.value = false
  }, duration)
}

defineExpose({ push })

onUnmounted(() => {
  if (timer) window.clearTimeout(timer)
})
</script>

<template>
  <transition
    enter-active-class="transition-all duration-200 ease-out"
    leave-active-class="transition-all duration-150 ease-in"
    enter-from-class="opacity-0 translate-y-2"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
      v-if="visible"
      class="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 pointer-events-none flex items-center gap-2.5 rounded-md border bg-#0c0e14/95 px-4 py-2.5 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      :class="{
        'border-#3d4f6a': tone === 'info',
        'border-#5fb3a1/60': tone === 'success',
        'border-#c9a84c/60': tone === 'warn'
      }"
    >
      <span
        class="h-1.5 w-1.5 rounded-full"
        :class="{
          'bg-#4fc3f7 shadow-[0_0_8px_rgba(79,195,247,0.8)]': tone === 'info',
          'bg-#5fb3a1 shadow-[0_0_8px_rgba(95,179,161,0.8)]': tone === 'success',
          'bg-#c9a84c shadow-[0_0_8px_rgba(201,168,76,0.8)]': tone === 'warn'
        }"
      />
      <span class="font-mono text-sm text-#e6edf3">{{ message }}</span>
    </div>
  </transition>
</template>
