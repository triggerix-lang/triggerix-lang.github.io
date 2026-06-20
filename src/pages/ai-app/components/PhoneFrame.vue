<script setup lang="ts">
/**
 * 手机外框。
 *
 * 内部结构：
 *  - phone-screen：承载主内容（HomeMenu / MyOrders / Profile）
 *  - phone-modal-slot：AI 异步工具的 UI 模板挂载点（绝对定位覆盖在内容之上）
 *  - phone-tabbar：底部 tab 栏
 *
 * 通过 defineExpose 暴露 modalSlot，让 useChatSession 能拿到这个 DOM 引用。
 */

import { useTemplateRef } from 'vue'
import type { PhoneTab } from './PhoneTabbar.vue'
import PhoneTabbar from './PhoneTabbar.vue'

defineProps<{
  active: PhoneTab
}>()

defineEmits<{
  (e: 'update:active', value: PhoneTab): void
}>()

const modalSlot = useTemplateRef<HTMLElement>('modalSlot')
defineExpose({ modalSlot })
</script>

<template>
  <div class="phone-frame">
    <div class="phone-screen">
      <slot />
      <!-- 异步工具挂载点：绝对定位铺满 phone-screen，覆盖在内容之上 -->
      <div ref="modalSlot" class="phone-modal-slot" />
    </div>
    <PhoneTabbar :active="active" @update:active="(v) => $emit('update:active', v)" />
  </div>
</template>

<style scoped lang="scss">
.phone-frame {
  width: 390px;
  height: 100%;
  max-height: 780px;
  border-radius: 24px;
  border: 1px solid #2a3348;
  background: #0a0c11;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
}
.phone-screen {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
.phone-modal-slot {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  // 子节点（mountNative 出来的 UI 模板）需要可交互，所以把 pointer-events 重新打开
  &:deep(> *) {
    pointer-events: auto;
  }
}
</style>
