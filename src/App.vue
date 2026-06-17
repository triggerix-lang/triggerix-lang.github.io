<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { onBeforeUnmount, useTemplateRef, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import CodeViewer from './components/code-viewer/CodeViewer.vue'
import { useCodePanel } from './composables/useCodePanel'

const demos = [
  { to: '/demo/button-click', label: '按钮点击' },
  { to: '/demo/input-focus', label: '输入聚焦' },
  { to: '/demo/button-modify-input', label: '按钮改值' },
  { to: '/demo/carousel-switch', label: '轮播切换' },
  { to: '/demo/carousel-linkage', label: '轮播联动' }
]

const { files, rulesJson, visible, hidePanel } = useCodePanel()

// 离开 demo 路由时隐藏面板（首页/未匹配路由）。
const route = useRoute()
watch(
  () => route.path,
  (path) => {
    if (!path.startsWith('/demo/')) {
      hidePanel()
    }
  }
)

// 抽屉容器（main 区域内，参与 flex 布局）
const containerRef = useTemplateRef<HTMLElement>('container')

function getContainerHeight() {
  return containerRef.value?.clientHeight ?? window.innerHeight
}

// 抽屉高度（像素），默认 30vh，持久化到 localStorage
const drawerHeight = useLocalStorage('demo-drawer-height', Math.round(window.innerHeight * 0.3))

// 拖拽逻辑
let isDragging = false
let startY = 0
let startHeight = 0

function clampHeight(h: number) {
  const available = getContainerHeight()
  const minH = Math.round(available * 0.2)
  const maxH = Math.round(available * 0.6)
  return Math.max(minH, Math.min(maxH, h))
}

function onDragMove(e: MouseEvent) {
  if (!isDragging) return
  const delta = startY - e.clientY
  drawerHeight.value = clampHeight(startHeight + delta)
}

function onDragEnd() {
  if (!isDragging) return
  isDragging = false
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
}

function onDragStart(e: MouseEvent) {
  isDragging = true
  startY = e.clientY
  startHeight = drawerHeight.value
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'row-resize'
  e.preventDefault()
}

onBeforeUnmount(() => {
  if (isDragging) onDragEnd()
})
</script>

<template>
  <div class="h-screen flex flex-col bg-#121212 text-#e0e0e0 overflow-hidden">
    <header class="px-8 py-4 border-b border-#2a2a2a bg-#1a1a1a flex items-center gap-6">
      <RouterLink to="/" class="text-primary font-semibold tracking-wide no-underline">
        Triggerix
      </RouterLink>
      <nav class="flex gap-5 text-sm">
        <RouterLink
          to="/"
          class="text-#aaa no-underline transition-colors hover:text-primary"
          exact-active-class="text-primary-3"
        >
          首页
        </RouterLink>
        <RouterLink
          v-for="d in demos"
          :key="d.to"
          :to="d.to"
          class="text-#aaa no-underline transition-colors hover:text-primary"
          active-class="text-primary-3"
        >
          {{ d.label }}
        </RouterLink>
      </nav>
    </header>
    <div ref="container" class="flex-1 min-h-0 flex flex-col">
      <main class="flex-1 min-h-0 flex flex-col">
        <RouterView />
      </main>

      <!-- 持久化底部面板：v-show 保证 DOM 不销毁，monaco-editor 实例长存 -->
      <div
        v-show="visible"
        class="shrink-0 border-t border-#2a2a2a flex flex-col"
        :style="{ height: `${drawerHeight}px` }"
      >
        <div
          class="h-2 cursor-row-resize flex items-center justify-center bg-#161616 hover:bg-#1a2030 transition-colors shrink-0 select-none"
          @mousedown="onDragStart"
        >
          <div class="w-8 h-0.5 rounded bg-#555" />
        </div>
        <div class="flex-1 min-h-0">
          <CodeViewer :files="files" :rules-json="rulesJson" />
        </div>
      </div>
    </div>
  </div>
</template>
