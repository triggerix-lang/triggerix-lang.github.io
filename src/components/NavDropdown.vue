<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { ref } from 'vue'

defineProps<{
  label: string
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
let closeTimer: ReturnType<typeof setTimeout> | null = null

onClickOutside(dropdownRef, () => {
  isOpen.value = false
})

function onMouseEnter() {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  isOpen.value = true
}

function onMouseLeave() {
  closeTimer = setTimeout(() => {
    isOpen.value = false
  }, 150)
}
</script>

<template>
  <div
    ref="dropdownRef"
    class="relative inline-block"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div
      class="cursor-pointer flex items-center gap-1 text-#aaa no-underline transition-colors hover:text-primary"
    >
      <span>{{ label }}</span>
      <svg
        class="w-3 h-3 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute top-full left-0 mt-1 min-w-40 py-1 bg-#1e1e1e border border-#333 rounded-lg shadow-lg z-50"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>
