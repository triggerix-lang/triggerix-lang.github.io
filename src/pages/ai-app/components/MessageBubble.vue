<script setup lang="ts">
import type { ToastTone } from './ToastHost.vue'

defineProps<{
  position?: 'left' | 'right'
  /** 占位符文本容器（用于 triggerix 组件挂载的 wrapperEl） */
  bgClass?: string
  avatarClass?: string
  showAvatar?: boolean
  /** 自定义气泡内容（prefixText + wrapperEl 容器 + suffixText） */
  tone?: ToastTone | 'default'
}>()
</script>

<template>
  <div
    class="msg-row"
    :class="{
      'msg-row-right': position === 'right',
      'msg-row-left': position !== 'right'
    }"
  >
    <div
      v-if="showAvatar !== false && position !== 'right'"
      class="msg-avatar"
      :class="avatarClass ?? 'msg-avatar-ai'"
    >
      <slot name="avatar">AI</slot>
    </div>

    <div
      class="msg-bubble"
      :class="[
        position === 'right' ? 'msg-bubble-right' : 'msg-bubble-left',
        bgClass ?? 'msg-bubble-default',
        tone === 'error'
          ? 'msg-bubble-error'
          : tone === 'warn'
            ? 'msg-bubble-warn'
            : tone === 'success'
              ? 'msg-bubble-success'
              : tone === 'info'
                ? 'msg-bubble-info'
                : ''
      ]"
    >
      <slot />
    </div>

    <div
      v-if="showAvatar !== false && position === 'right'"
      class="msg-avatar"
      :class="avatarClass ?? 'msg-avatar-user'"
    >
      <slot name="avatar">我</slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 8px 0;
  max-width: 92%;
}
.msg-row-right {
  margin-left: auto;
  flex-direction: row-reverse;
}
.msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 4px;
}
.msg-avatar-ai {
  background: linear-gradient(180deg, #c9a84c, #a8862e);
  color: #1a1408;
}
.msg-avatar-user {
  background: #2a3348;
  color: #e6edf3;
}
.msg-bubble {
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.55;
  word-break: break-word;
  white-space: pre-wrap;
}
.msg-bubble-left {
  border-top-left-radius: 4px;
}
.msg-bubble-right {
  border-top-right-radius: 4px;
}
.msg-bubble-default {
  background: #0c0e14;
  color: #e6edf3;
  border: 1px solid #2a3348;
}
.msg-bubble-info {
  background: #0c0e14;
  color: #e6edf3;
  border: 1px solid #2a3348;
}
.msg-bubble-success {
  background: rgba(95, 179, 161, 0.12);
  color: #b9e8dd;
  border: 1px solid rgba(95, 179, 161, 0.35);
}
.msg-bubble-warn {
  background: rgba(240, 184, 76, 0.12);
  color: #f0d28c;
  border: 1px solid rgba(240, 184, 76, 0.35);
}
.msg-bubble-error {
  background: rgba(240, 112, 124, 0.12);
  color: #f7b1b9;
  border: 1px solid rgba(240, 112, 124, 0.35);
}
</style>
