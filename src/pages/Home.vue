<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="home">
    <h1>Triggerix Editor</h1>
    <p class="subtitle">基于 ECA（事件-条件-动作）模型的可视化规则编辑器</p>

    <section class="intro">
      <h2>什么是 Triggerix？</h2>
      <p>
        Triggerix
        是一个语言无关的触发器规则引擎，提供事件驱动的规则定义、可视化编辑和运行时执行能力。
        本站展示了基于 Vue 的编辑器实现，灵感来源于魔兽争霸地图编辑器的触发器系统。
      </p>
    </section>

    <section class="features">
      <h2>核心特性</h2>
      <ul>
        <li><strong>文本化交互</strong> — 事件、条件、动作以自然语言句子呈现，槽位可点击填写</li>
        <li><strong>类型安全</strong> — 基于 TypeScript 的完整类型推导</li>
        <li><strong>框架无关</strong> — 底层 headless 设计，UI 层可自由替换</li>
        <li><strong>可扩展</strong> — 自定义事件、条件、动作和工具</li>
      </ul>
    </section>

    <div class="cta">
      <RouterLink to="/demo" class="demo-link"> 查看演示 → </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.home {
  max-width: 700px;
  margin: 0 auto;
  padding: 3rem 1rem;
}

h1 {
  font-size: 2.5rem;
  color: #fff;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #888;
  font-size: 1.1rem;
  margin-bottom: 3rem;
}

section {
  margin-bottom: 2.5rem;
}

h2 {
  font-size: 1.3rem;
  color: #4fc3f7;
  margin-bottom: 0.8rem;
}

p {
  line-height: 1.7;
  color: #bbb;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  padding: 0.5rem 0;
  color: #bbb;
  line-height: 1.6;
}

li strong {
  color: #e0e0e0;
}

.cta {
  margin-top: 2rem;
}

.demo-link {
  display: inline-block;
  padding: 0.7rem 1.5rem;
  background: #4fc3f7;
  color: #121212;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
  transition: background 0.2s;
}

.demo-link:hover {
  background: #81d4fa;
}
</style>
