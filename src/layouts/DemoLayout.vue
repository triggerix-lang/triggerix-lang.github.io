<script setup lang="ts">
import JsonDrawer from '../components/JsonDrawer.vue'

defineProps<{
  title: string
  rulesJson?: unknown[] | null
}>()
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <div class="px-6 py-3 border-b border-#2a2a2a bg-#161616">
      <h2 class="text-base font-medium text-#e0e0e0">
        {{ title }}
      </h2>
    </div>
    <div class="flex-1 grid grid-cols-2 min-h-0">
      <section class="border-r border-#2a2a2a p-6 overflow-auto">
        <div class="text-xs uppercase tracking-widest text-#666 mb-3">Playground</div>
        <slot name="playground" />
      </section>
      <section class="p-6 overflow-auto">
        <div class="text-xs uppercase tracking-widest text-#666 mb-3">Editor</div>
        <slot name="editor" />
      </section>
    </div>
    <JsonDrawer :json="rulesJson ?? null" />
  </div>
</template>
