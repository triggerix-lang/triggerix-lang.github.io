<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  json: unknown[] | null
}>()

const open = ref(false)

function toggle() {
  open.value = !open.value
}
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
    <div class="flex justify-center pointer-events-auto">
      <button
        type="button"
        class="px-4 py-1.5 rounded-t-md bg-#1a1a1a border border-b-0 border-#2a2a2a text-xs text-#aaa hover:text-#4fc3f7 transition-colors flex items-center gap-2 cursor-pointer"
        @click="toggle"
      >
        <span class="i-mdi-code-json text-base" />
        Rules JSON
        <span :class="open ? 'i-mdi-chevron-down' : 'i-mdi-chevron-up'" class="text-base" />
      </button>
    </div>
    <transition
      enter-active-class="transition-transform duration-300 ease-out"
      leave-active-class="transition-transform duration-200 ease-in"
      enter-from-class="translate-y-full"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="open"
        class="pointer-events-auto bg-#0f0f0f border-t border-#2a2a2a max-h-60vh overflow-auto"
      >
        <pre
          class="p-4 text-xs leading-relaxed text-#e0e0e0 font-mono whitespace-pre-wrap break-all"
          >{{ json && json.length > 0 ? JSON.stringify(json, null, 2) : '// 暂无规则' }}</pre
        >
      </div>
    </transition>
  </div>
</template>
