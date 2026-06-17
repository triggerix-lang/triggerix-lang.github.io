<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { computed, onBeforeUnmount, useTemplateRef } from 'vue'
import CodeViewer from '../components/code-viewer/CodeViewer.vue'
import JsonDrawer from '../components/JsonDrawer.vue'
import type { CodeFile } from '../definitions/code-snippets/types'

const props = defineProps<{
  title: string
  rulesJson?: unknown[] | null
  codeFiles?: CodeFile[]
}>()

const hasCode = computed(() => !!props.codeFiles?.length)

const containerRef = useTemplateRef<HTMLElement>('container')

// 获取容器实际可用高度
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
  <div ref="container" class="flex flex-col flex-1 min-h-0 overflow-hidden">
    <!-- 上方内容区：标题 + 左右两栏 -->
    <div class="flex flex-col flex-1 min-h-0">
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

    <!-- 底部抽屉：拖拽手柄 + CodeViewer -->
    <div
      v-if="hasCode"
      class="shrink-0 border-t border-#2a2a2a flex flex-col"
      :style="{ height: `${drawerHeight}px` }"
    >
      <!-- 拖拽手柄 -->
      <div
        class="h-2 cursor-row-resize flex items-center justify-center bg-#161616 hover:bg-#1a2030 transition-colors shrink-0 select-none"
        @mousedown="onDragStart"
      >
        <div class="w-8 h-0.5 rounded bg-#555" />
      </div>
      <!-- CodeViewer 占满剩余空间 -->
      <div class="flex-1 min-h-0">
        <CodeViewer :files="codeFiles!" />
      </div>
    </div>

    <JsonDrawer :json="rulesJson ?? null" />
  </div>
</template>
