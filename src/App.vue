<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <header class="app-header">
      <nav>
        <RouterLink to="/"> 首页 </RouterLink>
        <RouterLink to="/demo"> 演示 </RouterLink>
      </nav>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-header {
  padding: 1rem 2rem;
  border-bottom: 1px solid #2a2a2a;
  background: #1a1a1a;
}

.app-header nav {
  display: flex;
  gap: 1.5rem;
}

.app-header a {
  color: #aaa;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.app-header a:hover,
.app-header a.router-link-active {
  color: #4fc3f7;
}

.app-main {
  padding: 2rem;
}
</style>
