<script setup lang="ts">
import { computed } from 'vue'
import ScrollView from '../../../components/ScrollView.vue'
import { MENU_DATA } from '../../../ai-app-shared/menuData'
import { COUPON_DATA, PAYMENT_METHODS } from '../../../ai-app-shared/couponData'
import { useFoodApp, type OrderItem, type SubmittedOrder } from '../../../composables/useFoodApp'

const {
  orders,
  submittedOrders,
  appliedCouponId,
  getCartSubtotal,
  getAppliedCoupon,
  getCartDiscount
} = useFoodApp()

const dishMap = new Map(MENU_DATA.map((d) => [d.id, d]))

// ============================================================
// 购物车（cart）
// ============================================================

const enrichedCart = computed(() =>
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

const cartSubtotal = computed(() => getCartSubtotal())
const cartCoupon = computed(() => getAppliedCoupon())
const cartDiscount = computed(() => getCartDiscount(cartSubtotal.value, cartCoupon.value))
const cartTotal = computed(() => Math.max(0, cartSubtotal.value - cartDiscount.value))

// ============================================================
// 已提交订单（按 status 分组）
// ============================================================

const pendingOrders = computed(() =>
  submittedOrders.value
    .filter((o) => o.status === 'pending_payment')
    .sort((a, b) => b.createdAt - a.createdAt)
)

const paidOrders = computed(() =>
  submittedOrders.value
    .filter((o) => o.status === 'paid')
    .sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0))
)

const cancelledOrders = computed(() =>
  submittedOrders.value
    .filter((o) => o.status === 'cancelled')
    .sort((a, b) => b.createdAt - a.createdAt)
)

const latestPendingId = computed(() => pendingOrders.value[0]?.id ?? '')

// ============================================================
// 显示辅助
// ============================================================

const PAYMENT_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label])
)

function paymentLabel(method: string | null): string {
  if (!method) return '-'
  return PAYMENT_LABEL[method] ?? method
}

function couponLabel(id: string | null): string {
  if (!id) return ''
  return COUPON_DATA.find((c) => c.id === id)?.label ?? id
}

function shortOrderId(id: string): string {
  // order_${ts}_${rand4} → 取末 6 位
  return id.length > 10 ? id.slice(-6) : id
}

function enrichOrderItems(items: OrderItem[]) {
  return items.map((o) => {
    const dish = dishMap.get(o.dishId)
    return {
      ...o,
      name: dish?.name ?? o.dishId,
      price: dish?.price ?? 0
    }
  })
}

function formatTime(ts: number) {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function formatDateTime(ts: number) {
  const d = new Date(ts)
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${m}-${day} ${formatTime(ts)}`
}

function orderTotalLine(o: SubmittedOrder): string {
  if (o.discount > 0) return `已省 ¥${o.discount}`
  return ''
}

const isAllEmpty = computed(
  () =>
    enrichedCart.value.length === 0 &&
    pendingOrders.value.length === 0 &&
    paidOrders.value.length === 0 &&
    cancelledOrders.value.length === 0
)
</script>

<template>
  <ScrollView class="my-orders">
    <div class="my-orders-header">
      <h2 class="my-orders-title">我的订单</h2>
      <p class="my-orders-sub">购物车 · 待支付 · 已完成 · 已取消</p>
    </div>

    <!-- ============== 1. 购物车 ============== -->
    <section v-if="enrichedCart.length > 0" class="my-orders-section">
      <header class="section-header">
        <span class="section-title">购物车</span>
        <span class="section-count">{{ enrichedCart.length }} 项</span>
      </header>

      <ul class="my-orders-list">
        <li v-for="o in enrichedCart" :key="o.dishId" class="my-orders-item">
          <div class="my-orders-item-main">
            <div class="my-orders-item-name">{{ o.name }}</div>
            <div class="my-orders-item-meta">
              <span>× {{ o.qty }}</span>
              <span class="my-orders-dot">·</span>
              <span>{{ formatTime(o.createdAt) }}</span>
            </div>
          </div>
          <div class="my-orders-item-price">¥{{ o.price * o.qty }}</div>
        </li>
      </ul>

      <div v-if="cartCoupon" class="coupon-badge">
        <span class="i-mdi-ticket-percent-outline coupon-badge-icon" aria-hidden="true" />
        <span>已用 {{ cartCoupon.label }}</span>
        <span class="coupon-badge-discount">−¥{{ cartDiscount }}</span>
      </div>
      <div v-else class="coupon-empty">
        <span class="i-mdi-ticket-percent-outline coupon-badge-icon" aria-hidden="true" />
        <span>未使用优惠券 — 试试跟 AI 说「用满100减10券」</span>
      </div>

      <div class="cart-totals">
        <div class="cart-totals-row">
          <span>小计</span>
          <span class="cart-totals-num">¥{{ cartSubtotal }}</span>
        </div>
        <div v-if="cartDiscount > 0" class="cart-totals-row cart-totals-discount">
          <span>优惠</span>
          <span class="cart-totals-num">−¥{{ cartDiscount }}</span>
        </div>
        <div class="cart-totals-row cart-totals-final">
          <span>合计</span>
          <span class="cart-totals-num">¥{{ cartTotal }}</span>
        </div>
      </div>

      <p class="section-hint">试试跟 AI 说「提交订单」</p>
    </section>

    <!-- ============== 2. 待支付 ============== -->
    <section v-if="pendingOrders.length > 0" class="my-orders-section">
      <header class="section-header">
        <span class="section-title section-title-pending">待支付</span>
        <span class="section-count">{{ pendingOrders.length }} 笔</span>
      </header>

      <article v-for="o in pendingOrders" :key="o.id" class="order-card order-card-pending">
        <div class="order-card-head">
          <span class="order-id">#{{ shortOrderId(o.id) }}</span>
          <span class="order-time">{{ formatDateTime(o.createdAt) }}</span>
        </div>
        <ul class="order-card-items">
          <li v-for="(it, idx) in enrichOrderItems(o.items)" :key="idx">
            <span class="order-item-name">{{ it.name }}</span>
            <span class="order-item-meta">× {{ it.qty }}</span>
            <span class="order-item-price">¥{{ it.price * it.qty }}</span>
          </li>
        </ul>
        <div v-if="o.couponId" class="order-card-coupon">
          <span class="i-mdi-ticket-percent-outline" aria-hidden="true" />
          <span>{{ couponLabel(o.couponId) }} −¥{{ o.discount }}</span>
        </div>
        <div class="order-card-foot">
          <span class="order-total-label">合计</span>
          <span class="order-total">¥{{ o.total }}</span>
          <span v-if="orderTotalLine(o)" class="order-saved">{{ orderTotalLine(o) }}</span>
        </div>
      </article>

      <p class="section-hint">
        试试跟 AI 说「用微信支付订单 #{{ shortOrderId(latestPendingId) }}」或「用支付宝支付」
      </p>
    </section>

    <!-- ============== 3. 已完成 ============== -->
    <section v-if="paidOrders.length > 0" class="my-orders-section">
      <header class="section-header">
        <span class="section-title section-title-paid">已完成</span>
        <span class="section-count">{{ paidOrders.length }} 笔</span>
      </header>

      <article v-for="o in paidOrders" :key="o.id" class="order-card order-card-paid">
        <div class="order-card-head">
          <span class="order-id">#{{ shortOrderId(o.id) }}</span>
          <span class="order-pay-method">
            <span class="i-mdi-check-circle-outline" aria-hidden="true" />
            <span>{{ paymentLabel(o.paymentMethod) }}</span>
          </span>
        </div>
        <ul class="order-card-items">
          <li v-for="(it, idx) in enrichOrderItems(o.items)" :key="idx">
            <span class="order-item-name">{{ it.name }}</span>
            <span class="order-item-meta">× {{ it.qty }}</span>
            <span class="order-item-price">¥{{ it.price * it.qty }}</span>
          </li>
        </ul>
        <div v-if="o.couponId" class="order-card-coupon">
          <span class="i-mdi-ticket-percent-outline" aria-hidden="true" />
          <span>{{ couponLabel(o.couponId) }} −¥{{ o.discount }}</span>
        </div>
        <div class="order-card-foot">
          <span class="order-time-pay">{{ o.paidAt ? formatDateTime(o.paidAt) : '' }}</span>
          <span class="order-total">¥{{ o.total }}</span>
        </div>
      </article>
    </section>

    <!-- ============== 4. 已取消（折叠） ============== -->
    <details v-if="cancelledOrders.length > 0" class="my-orders-cancelled">
      <summary class="section-header section-header-toggle">
        <span class="section-title section-title-cancelled">已取消</span>
        <span class="section-count">{{ cancelledOrders.length }} 笔</span>
      </summary>
      <article v-for="o in cancelledOrders" :key="o.id" class="order-card order-card-cancelled">
        <div class="order-card-head">
          <span class="order-id">#{{ shortOrderId(o.id) }}</span>
          <span class="order-time">{{ formatDateTime(o.createdAt) }}</span>
        </div>
        <ul class="order-card-items">
          <li v-for="(it, idx) in enrichOrderItems(o.items)" :key="idx">
            <span class="order-item-name">{{ it.name }}</span>
            <span class="order-item-meta">× {{ it.qty }}</span>
          </li>
        </ul>
        <div class="order-card-foot">
          <span class="order-total-label">原价</span>
          <span class="order-total">¥{{ o.total }}</span>
        </div>
      </article>
    </details>

    <!-- ============== 全空 ============== -->
    <div v-if="isAllEmpty" class="my-orders-empty">
      <span class="i-mdi-silverware-clean empty-icon" aria-hidden="true" />
      <p>暂无订单</p>
      <p class="empty-hint">去首页选菜，或者跟 AI 说「点一份蒸羊羔」</p>
    </div>
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

// ===== section =====
.my-orders-section {
  margin-bottom: 18px;
}
.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0 2px;
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #e6edf3;
}
.section-title-pending {
  color: #f0b85e;
}
.section-title-paid {
  color: #5fb3a1;
}
.section-title-cancelled {
  color: #7a8599;
}
.section-count {
  font-size: 11px;
  color: #7a8599;
  font-family: ui-monospace, monospace;
}
.section-hint {
  margin: 8px 2px 0;
  padding: 8px 10px;
  background: rgba(79, 195, 247, 0.06);
  border: 1px dashed rgba(79, 195, 247, 0.3);
  border-radius: 6px;
  font-size: 11px;
  color: #7a8599;
  text-align: center;
  line-height: 1.5;
}

// ===== cart item（沿用旧样式） =====
.my-orders-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.my-orders-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
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

// ===== coupon badge =====
.coupon-badge,
.coupon-empty {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
}
.coupon-badge {
  background: rgba(201, 168, 76, 0.1);
  border: 1px solid rgba(201, 168, 76, 0.3);
  color: #f0d28c;
}
.coupon-empty {
  background: rgba(122, 133, 153, 0.06);
  border: 1px dashed #2a3348;
  color: #7a8599;
}
.coupon-badge-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
.coupon-badge-discount {
  margin-left: auto;
  font-family: ui-monospace, monospace;
  font-weight: 600;
  color: #c9a84c;
}

// ===== cart totals =====
.cart-totals {
  margin-top: 8px;
  padding: 10px 12px;
  background: #0c0e14;
  border: 1px solid #1f2735;
  border-radius: 8px;
}
.cart-totals-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #aab3c4;
  padding: 2px 0;
}
.cart-totals-discount {
  color: #c9a84c;
}
.cart-totals-final {
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px dashed #2a3348;
  font-size: 14px;
  font-weight: 600;
  color: #e6edf3;
}
.cart-totals-num {
  font-family: ui-monospace, monospace;
}

// ===== order card（已提交订单） =====
.order-card {
  padding: 12px;
  background: #0c0e14;
  border: 1px solid #1f2735;
  border-radius: 8px;
  margin-bottom: 8px;
}
.order-card-pending {
  border-color: rgba(240, 184, 94, 0.3);
}
.order-card-paid {
  border-color: rgba(95, 179, 161, 0.3);
}
.order-card-cancelled {
  border-color: #1f2735;
  opacity: 0.6;
}
.order-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px dashed #1f2735;
}
.order-id {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: #c9a84c;
  font-weight: 600;
}
.order-time {
  font-size: 11px;
  color: #7a8599;
}
.order-pay-method {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #5fb3a1;
}
.order-pay-method .i-mdi-check-circle-outline {
  width: 14px;
  height: 14px;
}
.order-card-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.order-card-items li {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
  color: #c9d1d9;
}
.order-item-name {
  flex: 1;
  min-width: 0;
}
.order-item-meta {
  color: #7a8599;
  font-size: 11px;
}
.order-item-price {
  font-family: ui-monospace, monospace;
  color: #aab3c4;
  min-width: 50px;
  text-align: right;
}
.order-card-cancelled .order-item-price {
  display: none;
}
.order-card-coupon {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #1f2735;
  font-size: 11px;
  color: #f0d28c;
}
.order-card-coupon .i-mdi-ticket-percent-outline {
  width: 12px;
  height: 12px;
}
.order-card-foot {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #1f2735;
  font-size: 13px;
}
.order-total-label {
  color: #7a8599;
  font-size: 11px;
}
.order-total {
  margin-left: auto;
  font-family: ui-monospace, monospace;
  font-size: 15px;
  font-weight: 700;
  color: #c9a84c;
}
.order-saved {
  font-size: 11px;
  color: #5fb3a1;
  font-family: ui-monospace, monospace;
}
.order-time-pay {
  color: #7a8599;
  font-size: 11px;
  flex: 1;
}

// ===== cancelled <details> =====
.my-orders-cancelled {
  margin-bottom: 18px;
  summary {
    list-style: none;
    cursor: pointer;
    user-select: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary::after {
    content: ' ›';
    color: #4f5b6e;
    font-size: 14px;
  }
  details[open] summary::after {
    content: ' ‹';
  }
}
.section-header-toggle {
  cursor: pointer;
}

// ===== empty =====
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
</style>
