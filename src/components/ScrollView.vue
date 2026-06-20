<template>
  <OverlayScrollbarsComponent ref="osRef" defer class="scroll-view" :options="options">
    <slot />
  </OverlayScrollbarsComponent>
</template>

<script setup lang="ts">
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import 'overlayscrollbars/overlayscrollbars.css'
import { ref } from 'vue'

/**
 * 基于 OverlayScrollbars 的暗色滚动条容器（官方 Vue 3 包装）
 *
 * 关键（按 overlayscrollbars-vue 官方文档）：
 * 1. 使用官方 OverlayScrollbarsComponent 包装组件，而不是直接调用全局函数
 * 2. 加 defer 属性（官方强烈推荐），让初始化延后到浏览器空闲期，
 *    避免容器尚未 layout 完成时初始化导致尺寸错乱
 * 3. CSS 变量必须挂在 :deep(.os-scrollbar) 上 —— OS 在 .os-scrollbar
 *    选择器里把所有变量默认设成 none/0，handle 直接继承 none，
 *    所以我们必须同样挂在 .os-scrollbar 才能覆盖。
 * 4. theme 用 'os-theme-none' 移除默认 dark/light 主题的干扰。
 * 5. viewport 默认 height: auto，用 :deep() 强制 height: 100% 才能滚动。
 */
const osRef = ref<InstanceType<typeof OverlayScrollbarsComponent> | null>(null)

const options = {
  overflow: {
    x: 'hidden',
    y: 'scroll'
  },
  scrollbars: {
    theme: 'os-theme-none'
  }
}

defineExpose({
  /** 暴露根 DOM，方便外部读取 scrollTop / scrollHeight 等 */
  getEl: () => osRef.value?.getElement() ?? null
})
</script>

<style scoped lang="scss">
/**
 * OverlayScrollbars 主题：暗色 + 中性灰色 handle
 * 文档：https://kingsora.github.io/OverlayScrollbars/
 */
.scroll-view {
  height: 100%;
  width: 100%;

  // 关键：OS 默认把 viewport 设为 height: auto，导致 viewport 跟内容
  // 等高、永不溢出、不会触发滚动条。强制 height: 100% 让它被父容器约束。
  &:deep([data-overlayscrollbars-viewport]) {
    height: 100% !important;
  }

  // 颜色与尺寸变量必须挂在 .os-scrollbar 上（OS 在这里设了默认值 none/0，
  // handle 会继承 .os-scrollbar 上的值）。用 :deep() 才能匹配 OS 内部元素。
  &:deep(.os-scrollbar) {
    // 尺寸
    --os-size: 6px;
    --os-padding-perpendicular: 0;
    --os-padding-axis: 0;

    // track 完全透明
    --os-track-bg: transparent;
    --os-track-bg-hover: transparent;
    --os-track-bg-active: transparent;
    --os-track-border: none;
    --os-track-border-hover: none;
    --os-track-border-active: none;
    --os-track-border-radius: 0;

    // handle 颜色：中性灰色
    --os-handle-bg: rgba(180, 180, 190, 0.3);
    --os-handle-bg-hover: rgba(180, 180, 190, 0.6);
    --os-handle-bg-active: rgba(180, 180, 190, 0.85);
    --os-handle-border: none;
    --os-handle-border-hover: none;
    --os-handle-border-active: none;
    --os-handle-border-radius: 3px;

    // 隐藏水平滚动条
    --os-scrollbar-horizontal-size: 0;
  }
}
</style>
