<script setup lang="ts">
import ScrollView from '../../../components/ScrollView.vue'
import { MENU_BY_CATEGORY, MENU_DATA } from '../../../ai-app-shared/menuData'

const categories = Object.keys(MENU_BY_CATEGORY)
</script>

<template>
  <ScrollView class="home-menu">
    <div class="home-menu-inner">
      <div class="home-menu-header">
        <h2 class="home-menu-title">今日菜单</h2>
        <p class="home-menu-sub">共 {{ MENU_DATA.length }} 道菜 · 报菜名精选</p>
      </div>

      <div v-for="cat in categories" :key="cat" class="home-menu-section">
        <h3 class="home-menu-cat">
          {{ cat }}
        </h3>
        <ul class="home-menu-list">
          <li v-for="d in MENU_BY_CATEGORY[cat]" :key="d.id" class="home-menu-item">
            <div class="home-menu-item-name">
              {{ d.name }}
            </div>
            <div class="home-menu-item-price">¥{{ d.price }}</div>
          </li>
        </ul>
      </div>

      <p class="home-menu-hint">试试跟 AI 说「我想点一份蒸羊羔」或者「推荐几个菜」</p>
    </div>
  </ScrollView>
</template>

<style scoped lang="scss">
.home-menu {
  // 注意：不要在 ScrollView 上设置 padding，
  // 否则 OverlayScrollbars 会做 padding 补偿（负 margin），
  // 导致 viewport 溢出 scroll-view 边界被外层 overflow:hidden 裁剪。
  // padding 放在 .home-menu-inner 上，让 OS 不介入 padding 处理。
}
.home-menu-inner {
  padding: 16px;
  padding-bottom: 0;
}
.home-menu-header {
  margin-bottom: 12px;
}
.home-menu-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: #c9a84c;
  font-family: 'Cinzel', serif;
  letter-spacing: 0.04em;
}
.home-menu-sub {
  margin: 0;
  font-size: 12px;
  color: #7a8599;
}
.home-menu-section {
  margin-bottom: 18px;
}
.home-menu-cat {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #aab3c4;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  border-left: 2px solid #c9a84c;
  padding-left: 8px;
}
.home-menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.home-menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #0c0e14;
  border: 1px solid #1f2735;
  border-radius: 8px;
}
.home-menu-item-name {
  font-size: 13px;
  color: #e6edf3;
}
.home-menu-item-price {
  font-size: 13px;
  color: #c9a84c;
  font-weight: 600;
  font-family: ui-monospace, monospace;
}
.home-menu-hint {
  margin: 16px 0;
  padding: 12px;
  background: rgba(79, 195, 247, 0.06);
  border: 1px dashed rgba(79, 195, 247, 0.3);
  border-radius: 8px;
  font-size: 12px;
  color: #7a8599;
  text-align: center;
  line-height: 1.6;
}
</style>
