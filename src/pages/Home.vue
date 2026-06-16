<script setup lang="ts">
import { RouterLink } from 'vue-router'

interface Scenario {
  to: string
  index: string
  title: string
  subtitle: string
  desc: string
  difficulty: number
  accent: string
  glow: string
  tags: string[]
  preview: string
}

const scenarios: Scenario[] = [
  {
    to: '/demo/button-click',
    index: '01',
    title: '按钮点击',
    subtitle: 'Button · Click',
    desc: '最朴素的事件→动作链路。点击按钮即触发消息显示，是理解触发器最直接的入口。',
    difficulty: 1,
    accent: '#5fb3a1',
    glow: 'rgba(95,179,161,0.35)',
    tags: ['button_click', 'show_message'],
    preview: 'when  button_click(confirm)\n→ show_message("Hello")'
  },
  {
    to: '/demo/input-focus',
    index: '02',
    title: '输入框焦点',
    subtitle: 'Input · Focus',
    desc: '聚焦与失焦事件分别绑定显示与隐藏动作，演示同一组件两个事件源的协作。',
    difficulty: 2,
    accent: '#4fc3f7',
    glow: 'rgba(79,195,247,0.32)',
    tags: ['input_focus', 'show_tip', 'hide_tip'],
    preview: 'when  input_focus(username)\n→ show_tip("请输入用户名")'
  },
  {
    to: '/demo/button-modify-input',
    index: '03',
    title: '按钮修改输入框',
    subtitle: 'Button · Patch Input',
    desc: '动作携带参数：按钮点击后将预置值或页面值（document.title 等）写入目标输入框。',
    difficulty: 3,
    accent: '#c9a84c',
    glow: 'rgba(201,168,76,0.32)',
    tags: ['button_click', 'set_input_value', 'value_source'],
    preview: 'when  button_click(fill)\n→ set_input_value(target, $title)'
  },
  {
    to: '/demo/carousel-switch',
    index: '04',
    title: '轮播切换',
    subtitle: 'Carousel · Switch',
    desc: '事件携带索引参数，多动作同时执行——切换至特定页时同步弹出提示并改变背景。',
    difficulty: 4,
    accent: '#9d7cd8',
    glow: 'rgba(157,124,216,0.32)',
    tags: ['carousel_switch', 'show_message', 'change_bg_color'],
    preview: 'when  carousel_switch(main, 3)\n→ show_message + change_bg'
  },
  {
    to: '/demo/carousel-linkage',
    index: '05',
    title: '轮播联动',
    subtitle: 'Carousel · Linkage',
    desc: '组件之间的真实联动：主轮播切换驱动副轮播跟随。展示触发器在跨组件编排中的能力。',
    difficulty: 5,
    accent: '#f0707c',
    glow: 'rgba(240,112,124,0.32)',
    tags: ['carousel_switch', 'set_carousel_index'],
    preview: 'when  carousel_switch(left, n)\n→ set_carousel_index(right, n)'
  }
]
</script>

<template>
  <div class="relative min-h-full overflow-x-hidden bg-#0a0c11 text-#e6edf3">
    <!-- decorative grid background -->
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.06]"
      :style="{
        backgroundImage:
          'linear-gradient(#5fb3a1 1px, transparent 1px), linear-gradient(90deg, #5fb3a1 1px, transparent 1px)',
        backgroundSize: '64px 64px'
      }"
    />
    <div
      class="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
      :style="{ background: 'radial-gradient(closest-side, #c9a84c, transparent 70%)' }"
    />

    <div class="relative mx-auto max-w-6xl px-8 pt-16 pb-24">
      <!-- HERO -->
      <header class="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
        <div class="flex flex-col">
          <div
            class="mb-6 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.4em] text-#7a8599"
          >
            <span class="h-px w-10 bg-#3d4f6a" />
            <span>v0.0.0 · trigger rule engine</span>
          </div>
          <h1
            class="font-['Cinzel'] text-7xl font-700 leading-[0.95] tracking-tight text-#e6edf3 lg:text-8xl"
            :style="{ textShadow: '0 0 32px rgba(201,168,76,0.18)' }"
          >
            Triggerix
          </h1>
          <div class="mt-5 flex items-center gap-3 font-mono text-sm text-#9aa6b8">
            <span class="text-#c9a84c">EVENT</span>
            <span class="text-#3d4f6a">/</span>
            <span class="text-#c9a84c">CONDITION</span>
            <span class="text-#3d4f6a">/</span>
            <span class="text-#c9a84c">ACTION</span>
          </div>
          <p class="mt-6 max-w-xl text-base leading-relaxed text-#aab3c4">
            事件-条件-动作 触发器规则引擎。
            <br />
            可视化、可序列化、可扩展，把 if-this-then-that 的开发体验带回前端编排现场。
          </p>

          <div class="mt-10 flex flex-wrap items-center gap-3">
            <RouterLink
              to="/demo/button-click"
              class="group inline-flex items-center gap-2 rounded bg-gradient-to-b from-#c9a84c to-#a8862e px-5 py-2.5 text-sm font-medium text-#1a1408 no-underline shadow-[0_4px_16px_rgba(201,168,76,0.3)] transition-all hover:shadow-[0_4px_24px_rgba(201,168,76,0.5)]"
            >
              <span class="i-mdi-flash text-base" />
              <span>开启第一个 Demo</span>
              <span class="font-mono opacity-70 transition-transform group-hover:translate-x-0.5"
                >→</span
              >
            </RouterLink>
            <a
              href="https://github.com/triggerix-lang"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center gap-2 rounded border border-#2a3348 px-5 py-2.5 text-sm text-#9aa6b8 no-underline transition-colors hover:border-#5fb3a1 hover:text-#e6edf3"
            >
              <span class="i-mdi-github text-base" />
              <span>GitHub</span>
            </a>
          </div>
        </div>

        <!-- right: rule preview card -->
        <div class="relative">
          <div
            class="absolute -inset-px rounded-md opacity-60 blur-md"
            :style="{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.4), transparent 60%)'
            }"
          />
          <div
            class="relative rounded-md border border-#2a3348 bg-#0c0e14 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          >
            <div class="mb-3 flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-#f0707c" />
              <span class="h-2.5 w-2.5 rounded-full bg-#c9a84c" />
              <span class="h-2.5 w-2.5 rounded-full bg-#5fb3a1" />
              <span class="ml-3 font-mono text-[11px] uppercase tracking-widest text-#7a8599"
                >rule.json</span
              >
            </div>
            <pre
              class="overflow-x-auto font-mono text-[12.5px] leading-relaxed text-#aab3c4"
            ><span class="text-#7a8599">// id</span> <span class="text-#5fb3a1">"demo-rule"</span>
<span class="text-#9d7cd8">event</span>:    <span class="text-#c9a84c">button_click</span>(button=<span class="text-#5fb3a1">confirm_btn</span>)
<span class="text-#9d7cd8">when</span>:     <span class="text-#7a8599">— always —</span>
<span class="text-#9d7cd8">do</span>:
  <span class="text-#4fc3f7">→</span> <span class="text-#c9a84c">show_message</span>(message=<span class="text-#5fb3a1">"Hello Triggerix!"</span>)</pre>
            <div
              class="mt-4 flex items-center gap-2 border-t border-#1f2735 pt-3 font-mono text-[11px] text-#7a8599"
            >
              <span class="i-mdi-check-circle text-sm text-#5fb3a1" />
              <span>已加载 · 监听中</span>
            </div>
          </div>
        </div>
      </header>

      <!-- divider -->
      <div class="mt-20 flex items-center gap-4">
        <div class="font-['Cinzel'] text-xs uppercase tracking-[0.4em] text-#c9a84c">scenarios</div>
        <div class="h-px flex-1 bg-gradient-to-r from-#c9a84c/40 via-#2a3348 to-transparent" />
        <div class="font-mono text-xs text-#7a8599">{{ scenarios.length }} demos</div>
      </div>
      <p class="mt-3 max-w-2xl text-sm leading-relaxed text-#7a8599">
        从最简单的"按一下"到跨组件联动，五个递进式场景验证触发器引擎在真实交互中的表达力。
      </p>

      <!-- SCENARIO GRID -->
      <div class="mt-10 grid gap-5 md:grid-cols-2">
        <RouterLink
          v-for="(s, i) in scenarios"
          :key="s.to"
          :to="s.to"
          class="group relative block overflow-hidden rounded-md border border-#1f2735 bg-#0e1119 p-6 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-#3d4f6a hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          :class="{ 'md:col-span-2': i === scenarios.length - 1 }"
        >
          <!-- accent bar -->
          <div
            class="absolute left-0 top-0 h-full w-[3px] opacity-50 transition-opacity group-hover:opacity-100"
            :style="{ background: s.accent }"
          />
          <!-- corner glow on hover -->
          <div
            class="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
            :style="{ background: s.glow }"
          />

          <div class="flex items-start justify-between">
            <div class="flex items-baseline gap-3">
              <span class="font-mono text-xs tracking-widest" :style="{ color: s.accent }"
                >#{{ s.index }}</span
              >
              <span class="font-mono text-[11px] uppercase tracking-[0.3em] text-#7a8599">{{
                s.subtitle
              }}</span>
            </div>
            <div class="flex gap-0.5" :title="`难度 ${s.difficulty} / 5`">
              <span
                v-for="n in 5"
                :key="n"
                class="text-sm leading-none"
                :style="{ color: n <= s.difficulty ? s.accent : '#2a3348' }"
                >★</span
              >
            </div>
          </div>

          <h3 class="mt-4 font-['Cinzel'] text-2xl font-600 text-#e6edf3 transition-colors">
            {{ s.title }}
          </h3>
          <p class="mt-2 max-w-md text-sm leading-relaxed text-#9aa6b8">
            {{ s.desc }}
          </p>

          <div class="mt-5 flex flex-wrap items-center gap-2">
            <span
              v-for="t in s.tags"
              :key="t"
              class="rounded border border-#1f2735 bg-#0a0c11 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-#7a8599"
              >{{ t }}</span
            >
          </div>

          <div class="mt-5 rounded border border-#1f2735 bg-#0a0c11/60 p-3">
            <pre
              class="whitespace-pre-wrap break-all font-mono text-[11.5px] leading-snug text-#7a8599"
              >{{ s.preview }}</pre
            >
          </div>

          <div
            class="mt-5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest opacity-60 transition-all group-hover:gap-3 group-hover:opacity-100"
            :style="{ color: s.accent }"
          >
            <span>open scenario</span>
            <span class="transition-transform group-hover:translate-x-1">→</span>
          </div>
        </RouterLink>
      </div>

      <!-- footer note -->
      <div
        class="mt-20 flex items-center justify-between border-t border-#1f2735 pt-6 font-mono text-[11px] uppercase tracking-widest text-#3d4f6a"
      >
        <span>triggerix · event-driven runtime</span>
        <span>built with vue 3 · unocss</span>
      </div>
    </div>
  </div>
</template>
