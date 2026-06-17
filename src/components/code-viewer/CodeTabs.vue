<script setup lang="ts">
interface Tab {
  filename: string
}

defineProps<{
  tabs: Tab[]
  active: number
  showJsonBtn?: boolean
  jsonActive?: boolean
}>()

defineEmits<{
  'update:active': [index: number]
  'toggle-json': []
}>()
</script>

<template>
  <div class="flex justify-between border-b border-#2a3348 bg-#0c0e14 overflow-x-auto">
    <div class="flex">
      <button
        v-for="(tab, i) in tabs"
        :key="tab.filename"
        type="button"
        class="px-4 py-2.5 text-xs font-medium whitespace-nowrap cursor-pointer border-b-2 transition-colors duration-150 bg-transparent"
        :class="
          !jsonActive && i === active
            ? 'border-#c9a84c text-#e6edf3'
            : 'border-transparent text-#7a8599 hover:text-#c9d1d9 hover:bg-#1a2030'
        "
        @click="$emit('update:active', i)"
      >
        {{ tab.filename }}
      </button>
    </div>
    <button
      v-if="showJsonBtn"
      type="button"
      class="px-3 py-2.5 text-base cursor-pointer transition-colors bg-transparent border-none"
      :class="jsonActive ? 'text-#c9a84c' : 'text-#7a8599 hover:text-#c9d1d9'"
      @click="$emit('toggle-json')"
    >
      <span class="i-lucide-file-json" />
    </button>
  </div>
</template>
