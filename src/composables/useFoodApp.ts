import { useLocalStorage } from '@vueuse/core'
import { MENU_DATA } from '../ai-app-shared/menuData'
import { COUPON_DATA, type Coupon } from '../ai-app-shared/couponData'

export interface OrderItem {
  dishId: string
  qty: number
  createdAt: number
}

export type Gender = 'male' | 'female' | 'other'

// ============================================================
// 默认偏好（AI 可改；非隐私、订单 / 菜单页可联动展示）
// ============================================================

/** 默认就餐方式 */
export type DiningMode = 'dine_in' | 'takeaway' | 'delivery'
/** 饮食偏好（荤/素/清真/无忌口） */
export type DietaryPreference = 'meat' | 'vegetarian' | 'halal' | 'unrestricted'
/** 口味辣度（不辣/微辣/中辣） */
export type TastePreference = 'none' | 'mild' | 'medium'
/** 饮食禁忌（无/葱蒜/海鲜） */
export type DietaryRestriction = 'none' | 'green_onion_garlic' | 'seafood'

// ============================================================
// 提交订单（订单状态机）
// ============================================================

export type OrderStatus = 'pending_payment' | 'paid' | 'cancelled'
export type PaymentMethod = 'wechat' | 'alipay' | 'card'

export interface SubmittedOrder {
  id: string
  items: OrderItem[]
  subtotal: number
  discount: number
  couponId: string | null
  total: number
  status: OrderStatus
  paymentMethod: PaymentMethod | null
  createdAt: number
  paidAt: number | null
}

/** 简单 setter 的结果类型（handler 拿到直接 toast） */
export interface OpResult {
  ok: boolean
  message?: string
  orderId?: string
}

/**
 * 餐饮 app 本地数据层
 * 全部基于 VueUse useLocalStorage，组件可直接读取响应式 ref
 *
 * 状态分两层：
 *  - orders: 当前购物车（add/remove/clear）
 *  - submittedOrders: 已提交订单（带 status 状态机：pending_payment → paid | cancelled）
 *  - appliedCouponId: 当前购物车上应用的优惠券（提交时快照到 SubmittedOrder）
 */
export function useFoodApp() {
  const orders = useLocalStorage<OrderItem[]>('ai-orders', [])
  const nickname = useLocalStorage<string>('ai-nickname', '游客')
  const gender = useLocalStorage<Gender>('ai-gender', 'other')
  const submittedOrders = useLocalStorage<SubmittedOrder[]>('ai-submitted-orders', [])
  const appliedCouponId = useLocalStorage<string | null>('ai-applied-coupon', null)
  // 默认偏好（UserInfo 展示 + AI 可改）
  const defaultDiningMode = useLocalStorage<DiningMode>('ai-default-dining-mode', 'delivery')
  const defaultUtensilCount = useLocalStorage<number>('ai-default-utensil-count', 1)
  const defaultNotes = useLocalStorage<string>('ai-default-notes', '')
  const dietaryPreference = useLocalStorage<DietaryPreference>(
    'ai-dietary-preference',
    'unrestricted'
  )
  const tastePreference = useLocalStorage<TastePreference>('ai-taste-preference', 'none')
  const dietaryRestriction = useLocalStorage<DietaryRestriction>('ai-dietary-restriction', 'none')

  // ============================================================
  // 购物车（cart）— 保持原状，与 add_to_order / remove_from_order / clear_orders 兼容
  // ============================================================

  function addOrder(dishId: string, qty = 1) {
    const existing = orders.value.find((o) => o.dishId === dishId)
    if (existing) {
      existing.qty += qty
    } else {
      orders.value.push({ dishId, qty, createdAt: Date.now() })
    }
    orders.value = [...orders.value] // 触发 ref 变化
  }

  function removeOrder(dishId: string) {
    orders.value = orders.value.filter((o) => o.dishId !== dishId)
  }

  function clearOrders() {
    orders.value = []
  }

  function setNickname(name: string) {
    nickname.value = name
  }

  function setGender(g: Gender) {
    gender.value = g
  }

  // ============================================================
  // 默认偏好 setter（被对应 business handler 调用）
  // ============================================================

  function setDefaultDiningMode(mode: DiningMode) {
    defaultDiningMode.value = mode
  }

  function setDefaultUtensilCount(count: number) {
    // 钳到 0-3
    defaultUtensilCount.value = Math.max(0, Math.min(3, Math.floor(count)))
  }

  function setDefaultNotes(notes: string) {
    defaultNotes.value = String(notes ?? '').trim()
  }

  function setDietaryPreference(pref: DietaryPreference) {
    dietaryPreference.value = pref
  }

  function setTastePreference(pref: TastePreference) {
    tastePreference.value = pref
  }

  function setDietaryRestriction(restriction: DietaryRestriction) {
    dietaryRestriction.value = restriction
  }

  // ============================================================
  // 购物车金额 / 优惠券折扣
  // ============================================================

  /** 当前购物车小计（元） */
  function getCartSubtotal(): number {
    return orders.value.reduce((sum, o) => {
      const dish = MENU_DATA.find((d) => d.id === o.dishId)
      return sum + (dish?.price ?? 0) * o.qty
    }, 0)
  }

  /** 当前购物车已应用的优惠券对象（无则 null） */
  function getAppliedCoupon(): Coupon | null {
    if (!appliedCouponId.value) return null
    return COUPON_DATA.find((c) => c.id === appliedCouponId.value) ?? null
  }

  /** 当前购物车应减免的金额 */
  function getCartDiscount(subtotal: number, coupon: Coupon | null): number {
    if (!coupon) return 0
    if (coupon.type === 'amount') return coupon.value
    return Math.round(subtotal * (1 - coupon.value))
  }

  // ============================================================
  // 订单状态机：submit / pay / cancel
  // ============================================================

  /** 购物车 → pending_payment 订单；清空购物车和优惠券 */
  function submitOrder(): OpResult {
    if (orders.value.length === 0) {
      return { ok: false, message: '购物车为空' }
    }
    const subtotal = getCartSubtotal()
    const coupon = getAppliedCoupon()
    if (coupon && subtotal < coupon.minSpend) {
      return {
        ok: false,
        message: `优惠券「${coupon.label}」需满${coupon.minSpend}元，当前${subtotal}元`
      }
    }
    const discount = getCartDiscount(subtotal, coupon)
    const order: SubmittedOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      items: orders.value.map((o) => ({ ...o })), // 快照购物车
      subtotal,
      discount,
      couponId: coupon?.id ?? null,
      total: Math.max(0, subtotal - discount),
      status: 'pending_payment',
      paymentMethod: null,
      createdAt: Date.now(),
      paidAt: null
    }
    submittedOrders.value = [order, ...submittedOrders.value]
    orders.value = []
    appliedCouponId.value = null
    return { ok: true, orderId: order.id }
  }

  /**
   * 支付订单。
   * - orderId 省略时取最新一笔 pending_payment
   * - method 必须是合法枚举
   */
  function payOrder(orderId: string | undefined, method: PaymentMethod): OpResult {
    if (!['wechat', 'alipay', 'card'].includes(method)) {
      return { ok: false, message: '无效的支付方式' }
    }
    const target = orderId
      ? submittedOrders.value.find((o) => o.id === orderId)
      : submittedOrders.value
          .filter((o) => o.status === 'pending_payment')
          .sort((a, b) => b.createdAt - a.createdAt)[0]
    if (!target) {
      return { ok: false, message: orderId ? `订单不存在：${orderId}` : '没有待支付订单' }
    }
    if (target.status === 'paid') {
      return { ok: false, message: '订单已支付' }
    }
    if (target.status === 'cancelled') {
      return { ok: false, message: '订单已取消，无法支付' }
    }
    target.status = 'paid'
    target.paymentMethod = method
    target.paidAt = Date.now()
    submittedOrders.value = [...submittedOrders.value] // 触发 ref
    return { ok: true }
  }

  /** 取消 pending_payment 订单 */
  function cancelOrder(orderId: string): OpResult {
    const target = submittedOrders.value.find((o) => o.id === orderId)
    if (!target) {
      return { ok: false, message: `订单不存在：${orderId}` }
    }
    if (target.status !== 'pending_payment') {
      return { ok: false, message: '只有待支付订单可以取消' }
    }
    target.status = 'cancelled'
    submittedOrders.value = [...submittedOrders.value]
    return { ok: true }
  }

  // ============================================================
  // 优惠券
  // ============================================================

  /** 应用优惠券到当前购物车 */
  function applyCoupon(couponId: string): OpResult {
    const coupon = COUPON_DATA.find((c) => c.id === couponId)
    if (!coupon) {
      return { ok: false, message: `未知优惠券：${couponId}` }
    }
    if (orders.value.length === 0) {
      return { ok: false, message: '购物车为空' }
    }
    const subtotal = getCartSubtotal()
    if (subtotal < coupon.minSpend) {
      return {
        ok: false,
        message: `「${coupon.label}」需满${coupon.minSpend}元，当前${subtotal}元`
      }
    }
    appliedCouponId.value = couponId
    return { ok: true }
  }

  /** 清除已应用的优惠券 */
  function clearCoupon(): OpResult {
    appliedCouponId.value = null
    return { ok: true }
  }

  return {
    // 状态
    orders,
    nickname,
    gender,
    submittedOrders,
    appliedCouponId,
    defaultDiningMode,
    defaultUtensilCount,
    defaultNotes,
    dietaryPreference,
    tastePreference,
    dietaryRestriction,
    // 购物车
    addOrder,
    removeOrder,
    clearOrders,
    setNickname,
    setGender,
    setDefaultDiningMode,
    setDefaultUtensilCount,
    setDefaultNotes,
    setDietaryPreference,
    setTastePreference,
    setDietaryRestriction,
    // 金额
    getCartSubtotal,
    getAppliedCoupon,
    getCartDiscount,
    // 订单状态机
    submitOrder,
    payOrder,
    cancelOrder,
    // 优惠券
    applyCoupon,
    clearCoupon
  }
}

/** useFoodApp 返回值类型（用于非 setup 上下文，例如 handler 工厂） */
export type FoodApp = ReturnType<typeof useFoodApp>
