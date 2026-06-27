<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import NavDropdown from './NavDropdown.vue'

const demos = [
  { to: '/demo/button-click', label: '按钮点击' },
  { to: '/demo/input-focus', label: '输入聚焦' },
  { to: '/demo/button-modify-input', label: '按钮改值' },
  { to: '/demo/carousel-switch', label: '轮播切换' },
  { to: '/demo/carousel-linkage', label: '轮播联动' }
]

// 一级菜单：新增菜单只需要在这里加一条，激活态由 isBaseActive 自动按 base 路径匹配
type NavMenu =
  | { kind: 'link'; to: string; label: string }
  | { kind: 'dropdown'; base: string; label: string; children: { to: string; label: string }[] }

const menus: NavMenu[] = [
  { kind: 'link', to: '/', label: '首页' },
  { kind: 'dropdown', base: '/demo', label: '触发器', children: demos },
  { kind: 'link', to: '/ai-app', label: 'AI 应用' }
]

const route = useRoute()
// 通用路径匹配：完全等于 base，或 base/xxx 子路径（避免 /ai 误匹配 /ai-app）
function isBaseActive(base: string) {
  return route.path === base || route.path.startsWith(base + '/')
}
</script>

<template>
  <header class="px-8 py-4 border-b border-#2a2a2a bg-#1a1a1a flex items-center gap-6">
    <RouterLink to="/" class="text-primary font-semibold tracking-wide no-underline">
      Triggerix
    </RouterLink>
    <nav class="flex gap-5 text-sm">
      <template v-for="menu in menus" :key="menu.label">
        <RouterLink
          v-if="menu.kind === 'link'"
          :to="menu.to"
          class="text-#aaa no-underline transition-colors hover:text-primary"
          :class="{ 'text-primary': isBaseActive(menu.to) }"
        >
          {{ menu.label }}
        </RouterLink>
        <NavDropdown v-else :label="menu.label" :active="isBaseActive(menu.base)">
          <RouterLink
            v-for="c in menu.children"
            :key="c.to"
            :to="c.to"
            class="block px-4 py-2 text-#aaa text-sm no-underline transition-colors hover:bg-#2a2a2a hover:text-primary"
            active-class="!text-primary bg-#2a2a2a"
          >
            {{ c.label }}
          </RouterLink>
        </NavDropdown>
      </template>
    </nav>
  </header>
</template>
