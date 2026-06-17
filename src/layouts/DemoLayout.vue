<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
    <div class="px-6 py-3 border-b border-#2a2a2a bg-#161616 shrink-0">
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
  </div>
</template>
