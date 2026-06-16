<script setup lang="ts">
interface Tab {
  id: string
  name: string
}

defineProps<{
  tabs: Tab[]
  active: number
}>()

defineEmits<{
  'update:active': [index: number]
}>()
</script>

<template>
  <div class="flex border-b border-#2a3348 bg-#0c0e14 overflow-x-auto">
    <button
      v-for="(tab, i) in tabs"
      :key="tab.id"
      type="button"
      class="px-4 py-2.5 text-xs font-medium whitespace-nowrap cursor-pointer border-b-2 transition-colors duration-150 bg-transparent"
      :class="
        i === active
          ? 'border-#c9a84c text-#e6edf3'
          : 'border-transparent text-#7a8599 hover:text-#c9d1d9 hover:bg-#1a2030'
      "
      @click="$emit('update:active', i)"
    >
      {{ tab.name }}
    </button>
  </div>
</template>
