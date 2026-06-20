<script setup lang="ts">
import { ref } from 'vue'

export type ToastTone = 'info' | 'success' | 'warn' | 'error'

export interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

const items = ref<ToastItem[]>([])
let seq = 0

function push(message: string, tone: ToastTone = 'info') {
  const id = ++seq
  items.value.push({ id, message, tone })
  setTimeout(() => {
    items.value = items.value.filter((t) => t.id !== id)
  }, 3200)
}

defineExpose({ push })
</script>

<template>
  <Teleport to="body">
    <div class="toast-host">
      <TransitionGroup name="toast">
        <div v-for="t in items" :key="t.id" class="toast" :class="`toast-${t.tone}`">
          {{ t.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.toast-host {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.toast {
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid;
  pointer-events: auto;
  min-width: 200px;
  max-width: 480px;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.toast-info {
  background: #0c0e14;
  color: #e6edf3;
  border-color: #2a3348;
}
.toast-success {
  background: rgba(95, 179, 161, 0.15);
  color: #b9e8dd;
  border-color: rgba(95, 179, 161, 0.45);
}
.toast-warn {
  background: rgba(240, 184, 76, 0.15);
  color: #f0d28c;
  border-color: rgba(240, 184, 76, 0.45);
}
.toast-error {
  background: rgba(240, 112, 124, 0.15);
  color: #f7b1b9;
  border-color: rgba(240, 112, 124, 0.45);
}
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
