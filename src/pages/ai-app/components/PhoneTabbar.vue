<script setup lang="ts">
import { computed } from 'vue'

export type PhoneTab = 'menu' | 'orders' | 'profile'

const props = defineProps<{
  active: PhoneTab
}>()

const emit = defineEmits<{
  (e: 'update:active', value: PhoneTab): void
}>()

const tabs = [
  { id: 'menu' as const, label: '首页', icon: 'i-mdi-home-variant-outline' },
  { id: 'orders' as const, label: '订单', icon: 'i-mdi-receipt-text-outline' },
  { id: 'profile' as const, label: '我的', icon: 'i-mdi-account-circle-outline' }
]

function setActive(id: PhoneTab) {
  if (id !== props.active) emit('update:active', id)
}

const computedActive = computed(() => props.active)
</script>

<template>
  <nav class="phone-tabbar">
    <button
      v-for="t in tabs"
      :key="t.id"
      class="phone-tab"
      :class="{ 'phone-tab-active': t.id === computedActive }"
      @click="setActive(t.id)"
    >
      <span class="phone-tab-icon" :class="t.icon" aria-hidden="true" />
      <span class="phone-tab-label">{{ t.label }}</span>
    </button>
  </nav>
</template>

<style scoped lang="scss">
.phone-tabbar {
  display: flex;
  border-top: 1px solid #2a3348;
  background: #0c0e14;
  padding: 6px 0 calc(6px + env(safe-area-inset-bottom, 0));
  flex-shrink: 0;
}
.phone-tab {
  flex: 1;
  background: transparent;
  border: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  cursor: pointer;
  color: #7a8599;
  font-size: 11px;
  transition: color 0.15s;
}
.phone-tab-active {
  color: #c9a84c;
}
.phone-tab-icon {
  width: 20px;
  height: 20px;
  line-height: 1;
}
.phone-tab-label {
  font-size: 10px;
  letter-spacing: 0.04em;
}
</style>
