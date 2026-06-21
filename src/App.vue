<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { defineAsyncComponent, onBeforeUnmount, useTemplateRef, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import NavDropdown from './components/NavDropdown.vue'
import { useCodePanel } from './composables/useCodePanel'

// Monaco is ~2MB of WebAssembly + JS. Defer the import until the viewer is
// actually mounted (i.e. the right-hand drawer is open on a demo route) so
// the homepage, ai-app and any non-demo navigation don't pay the cost.
const CodeViewer = defineAsyncComponent(() => import('./components/code-viewer/CodeViewer.vue'))

const demos = [
  { to: '/demo/button-click', label: '按钮点击' },
  { to: '/demo/input-focus', label: '输入聚焦' },
  { to: '/demo/button-modify-input', label: '按钮改值' },
  { to: '/demo/carousel-switch', label: '轮播切换' },
  { to: '/demo/carousel-linkage', label: '轮播联动' }
]

const { files, triggersJson, visible } = useCodePanel()

// 离开 demo 路由时隐藏面板（首页/未匹配路由）
const route = useRoute()
watch(
  () => route.path,
  (path) => {
    if (!path.startsWith('/demo/')) {
      visible.value = false
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
          exact-active-class="text-primary"
        >
          首页
        </RouterLink>
        <NavDropdown label="触发器">
          <RouterLink
            v-for="d in demos"
            :key="d.to"
            :to="d.to"
            class="block px-4 py-2 text-#aaa text-sm no-underline transition-colors hover:bg-#2a2a2a hover:text-primary"
            active-class="text-primary"
          >
            {{ d.label }}
          </RouterLink>
        </NavDropdown>
        <RouterLink
          to="/ai-app"
          class="text-#aaa no-underline transition-colors hover:text-primary"
          active-class="text-primary"
        >
          AI 应用
        </RouterLink>
      </nav>
    </header>
    <div ref="container" class="flex-1 min-h-0 flex flex-col">
      <main class="flex-1 min-h-0 flex flex-col">
        <RouterView />
      </main>

      <!-- 底部代码面板：v-if 让 Monaco 仅在用户打开面板时才加载，
           避免首页 / ai-app 等无关路由背上 ~2MB 的 monaco 包。
           关闭面板后编辑器实例会销毁，再次打开会重新初始化。 -->
      <div
        v-if="visible"
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
          <CodeViewer :files="files" :triggers-json="triggersJson" />
        </div>
      </div>
    </div>
  </div>
</template>
