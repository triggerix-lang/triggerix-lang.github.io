<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

const demos = [
  { to: '/demo/button-click', label: '按钮点击' },
  { to: '/demo/input-focus', label: '输入聚焦' },
  { to: '/demo/button-modify-input', label: '按钮改值' },
  { to: '/demo/carousel-switch', label: '轮播切换' },
  { to: '/demo/carousel-linkage', label: '轮播联动' }
]
</script>

<template>
  <div class="h-screen flex flex-col bg-#121212 text-#e0e0e0 overflow-hidden">
    <header class="px-8 py-4 border-b border-#2a2a2a bg-#1a1a1a flex items-center gap-6">
      <RouterLink to="/" class="text-#4fc3f7 font-semibold tracking-wide no-underline">
        Triggerix
      </RouterLink>
      <nav class="flex gap-5 text-sm">
        <RouterLink
          to="/"
          class="text-#aaa no-underline transition-colors hover:text-#4fc3f7"
          active-class="text-#4fc3f7"
        >
          首页
        </RouterLink>
        <RouterLink
          v-for="d in demos"
          :key="d.to"
          :to="d.to"
          class="text-#aaa no-underline transition-colors hover:text-#4fc3f7"
          active-class="text-#4fc3f7"
        >
          {{ d.label }}
        </RouterLink>
      </nav>
    </header>
    <main class="flex-1 min-h-0 flex flex-col">
      <RouterView />
    </main>
  </div>
</template>
