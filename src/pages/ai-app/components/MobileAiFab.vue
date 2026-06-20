<script setup lang="ts">
defineProps<{
  open: boolean
}>()

defineEmits<{
  (e: 'update:open', value: boolean): void
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="fab">
      <button
        v-if="!open"
        class="fab-trigger"
        aria-label="打开 AI 助手"
        @click="$emit('update:open', true)"
      >
        <span class="i-mdi-robot fab-icon" aria-hidden="true" />
        <span class="fab-text">AI</span>
      </button>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.fab-trigger {
  position: fixed;
  right: 16px;
  bottom: calc(20px + env(safe-area-inset-bottom, 0));
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(180deg, #c9a84c, #a8862e);
  color: #1a1408;
  border: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(201, 168, 76, 0.45);
  z-index: 100;
  transition: transform 0.15s;
}
.fab-trigger:hover {
  transform: scale(1.05);
}
.fab-icon {
  width: 22px;
  height: 22px;
  line-height: 1;
}
.fab-text {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  margin-top: 2px;
}
.fab-enter-active,
.fab-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.fab-enter-from,
.fab-leave-to {
  opacity: 0;
  transform: scale(0.6);
}
</style>
