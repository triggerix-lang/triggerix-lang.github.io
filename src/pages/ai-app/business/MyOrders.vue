<script setup lang="ts">
import { computed } from 'vue'
import ScrollView from '../../../components/ScrollView.vue'
import { MENU_DATA } from '../../../ai-app-shared/menuData'
import { useFoodApp } from '../../../composables/useFoodApp'

const { orders } = useFoodApp()

const dishMap = new Map(MENU_DATA.map((d) => [d.id, d]))

const enrichedOrders = computed(() =>
  orders.value
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((o) => {
      const dish = dishMap.get(o.dishId)
      return {
        ...o,
        name: dish?.name ?? o.dishId,
        price: dish?.price ?? 0
      }
    })
)

const totalPrice = computed(() => enrichedOrders.value.reduce((s, o) => s + o.price * o.qty, 0))

function formatTime(ts: number) {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<template>
  <ScrollView class="my-orders">
    <div class="my-orders-header">
      <h2 class="my-orders-title">我的订单</h2>
      <p class="my-orders-sub">共 {{ enrichedOrders.length }} 项 · 合计 ¥{{ totalPrice }}</p>
    </div>

    <div v-if="enrichedOrders.length === 0" class="my-orders-empty">
      <span class="i-mdi-silverware-clean empty-icon" aria-hidden="true" />
      <p>暂无订单</p>
      <p class="empty-hint">去首页选菜，或者跟 AI 说「点一份蒸羊羔」</p>
    </div>

    <ul v-else class="my-orders-list">
      <li v-for="o in enrichedOrders" :key="o.dishId" class="my-orders-item">
        <div class="my-orders-item-main">
          <div class="my-orders-item-name">
            {{ o.name }}
          </div>
          <div class="my-orders-item-meta">
            <span>× {{ o.qty }}</span>
            <span class="my-orders-dot">·</span>
            <span>{{ formatTime(o.createdAt) }}</span>
          </div>
        </div>
        <div class="my-orders-item-price">¥{{ o.price * o.qty }}</div>
      </li>
    </ul>
  </ScrollView>
</template>

<style scoped lang="scss">
.my-orders {
  padding: 16px;
}
.my-orders-header {
  margin-bottom: 12px;
}
.my-orders-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: #c9a84c;
  font-family: 'Cinzel', serif;
  letter-spacing: 0.04em;
}
.my-orders-sub {
  margin: 0;
  font-size: 12px;
  color: #7a8599;
}
.my-orders-empty {
  margin-top: 60px;
  text-align: center;
  color: #7a8599;
}
.empty-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  opacity: 0.6;
  color: #7a8599;
  display: block;
}
.empty-hint {
  font-size: 11px;
  color: #4f5b6e;
  margin-top: 4px;
}
.my-orders-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.my-orders-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: #0c0e14;
  border: 1px solid #1f2735;
  border-radius: 8px;
}
.my-orders-item-main {
  flex: 1;
  min-width: 0;
}
.my-orders-item-name {
  font-size: 14px;
  color: #e6edf3;
  font-weight: 500;
  margin-bottom: 4px;
}
.my-orders-item-meta {
  font-size: 11px;
  color: #7a8599;
  display: flex;
  gap: 4px;
}
.my-orders-dot {
  color: #3d4f6a;
}
.my-orders-item-price {
  font-size: 14px;
  color: #c9a84c;
  font-weight: 600;
  font-family: ui-monospace, monospace;
}
</style>
