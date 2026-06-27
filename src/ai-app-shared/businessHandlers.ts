import type { Ref } from 'vue'
import type {
  DiningMode,
  DietaryPreference,
  DietaryRestriction,
  FoodApp,
  PaymentMethod,
  TastePreference
} from '../composables/useFoodApp'
import { MENU_DATA } from './menuData'

// ============================================================
// 共享类型
// ============================================================

export type ToastTone = 'info' | 'success' | 'warn' | 'error'
export type PhoneTab = 'menu' | 'orders' | 'profile'

export interface ToolResult {
  ok: boolean
  message?: string
  data?: unknown
}

/**
 * 业务 action handler 的 ctx（由 useChatSession 注入）。
 * 原子工具模式下不再用 mountTemplate / unmountTemplate —— UI 模板由 UIBuilder
 * 一次性 mount 到 assistant 气泡；用户点击模板里的按钮后，triggerix runtime
 * 派发到本 ctx 调同名 action。
 */
export interface ToolCtx {
  msgId: number
  pushToast: (message: string, tone?: ToastTone) => void
}

export type ToolHandler<TArgs = any> = (args: TArgs, ctx: ToolCtx) => Promise<ToolResult>

// ============================================================
// Handler 工厂
// ============================================================

export interface CreateHandlersOptions {
  foodApp: FoodApp
  phoneTab: Ref<PhoneTab>
  pushToast: (message: string, tone?: ToastTone) => void
}

/**
 * 创建 12 个业务 action handler（同步动作，无 UI 模板）：
 *  - 2 个基础用户 action（update_nickname / set_gender）
 *  - 6 个默认偏好 action（update_default_* / update_dietary_* / update_taste_*）
 *  - 3 个订单 CRUD + tab（add_to_order / remove_from_order / clear_orders / switch_tab）
 *  - 5 个订单状态机 + 优惠券（submit_order / pay_order / cancel_order / apply_coupon / clear_coupon）
 *
 * 移除 show_* 异步工具：UI 模板改由 UIBuilder 原子化构造后直接 mount，
 * 模板里的 button.click trigger 通过 triggerix runtime 派发到同名 action。
 *
 * 注意：`emit_event` 不在此处注册 —— useChatSession 内部已经注册了
 * 特殊版本（识别 `event === "editor.cancelled"` → 卸载模板），业务 handler
 * 再注册同名 action 会被 runtime 的 Map.set 覆盖，导致卸载失效。
 */
export function createBusinessHandlers(opts: CreateHandlersOptions): Map<string, ToolHandler> {
  const { foodApp, phoneTab, pushToast } = opts
  const handlers = new Map<string, ToolHandler>()

  handlers.set('update_nickname', async ({ nickname }: { nickname: string }) => {
    const name = String(nickname ?? '').trim()
    if (!name) {
      pushToast('昵称不能为空', 'error')
      return { ok: false, message: '昵称不能为空' }
    }
    foodApp.setNickname(name)
    pushToast(`昵称已更新：${name}`, 'success')
    return { ok: true, message: '已更新' }
  })

  handlers.set('set_gender', async ({ gender }: { gender: 'male' | 'female' | 'other' }) => {
    if (!['male', 'female', 'other'].includes(gender)) {
      pushToast('无效的性别', 'error')
      return { ok: false, message: '无效 gender' }
    }
    foodApp.setGender(gender)
    const label = gender === 'male' ? '男' : gender === 'female' ? '女' : '保密'
    pushToast(`性别已更新：${label}`, 'success')
    return { ok: true }
  })

  // ============================================================
  // 默认偏好（6 个）—— 与 set_gender 同模式：validate → setFoodApp → toast
  // ============================================================

  const DINING_LABEL: Record<DiningMode, string> = {
    dine_in: '堂食',
    takeaway: '外带',
    delivery: '配送'
  }

  const DIETARY_PREF_LABEL: Record<DietaryPreference, string> = {
    meat: '荤',
    vegetarian: '素',
    halal: '清真',
    unrestricted: '无忌口'
  }

  const TASTE_PREF_LABEL: Record<TastePreference, string> = {
    none: '不辣',
    mild: '微辣',
    medium: '中辣'
  }

  const DIETARY_RESTRICTION_LABEL: Record<DietaryRestriction, string> = {
    none: '无',
    green_onion_garlic: '葱蒜',
    seafood: '海鲜'
  }

  handlers.set('update_default_dining_mode', async ({ mode }: { mode: DiningMode }) => {
    if (!['dine_in', 'takeaway', 'delivery'].includes(mode)) {
      pushToast('无效的就餐方式', 'error')
      return { ok: false, message: '无效 mode' }
    }
    foodApp.setDefaultDiningMode(mode)
    pushToast(`默认就餐方式已更新：${DINING_LABEL[mode]}`, 'success')
    return { ok: true }
  })

  handlers.set('update_default_utensil_count', async ({ count }: { count: number | string }) => {
    const n = Number(count)
    if (!Number.isInteger(n) || n < 0 || n > 3) {
      pushToast('餐具数量必须是 0-3 之间的整数', 'error')
      return { ok: false, message: '无效 count' }
    }
    foodApp.setDefaultUtensilCount(n)
    pushToast(`默认餐具数量已更新：${n} 份`, 'success')
    return { ok: true }
  })

  handlers.set('update_default_notes', async ({ notes }: { notes: string }) => {
    const text = String(notes ?? '').trim()
    if (!text) {
      pushToast('备注不能为空', 'error')
      return { ok: false, message: '备注不能为空' }
    }
    foodApp.setDefaultNotes(text)
    pushToast(`默认备注已更新：${text}`, 'success')
    return { ok: true }
  })

  handlers.set(
    'update_dietary_preference',
    async ({ preference }: { preference: DietaryPreference }) => {
      if (!['meat', 'vegetarian', 'halal', 'unrestricted'].includes(preference)) {
        pushToast('无效的饮食偏好', 'error')
        return { ok: false, message: '无效 preference' }
      }
      foodApp.setDietaryPreference(preference)
      pushToast(`饮食偏好已更新：${DIETARY_PREF_LABEL[preference]}`, 'success')
      return { ok: true }
    }
  )

  handlers.set(
    'update_taste_preference',
    async ({ preference }: { preference: TastePreference }) => {
      if (!['none', 'mild', 'medium'].includes(preference)) {
        pushToast('无效的口味偏好', 'error')
        return { ok: false, message: '无效 preference' }
      }
      foodApp.setTastePreference(preference)
      pushToast(`口味偏好已更新：${TASTE_PREF_LABEL[preference]}`, 'success')
      return { ok: true }
    }
  )

  handlers.set(
    'update_dietary_restriction',
    async ({ restriction }: { restriction: DietaryRestriction }) => {
      if (!['none', 'green_onion_garlic', 'seafood'].includes(restriction)) {
        pushToast('无效的饮食禁忌', 'error')
        return { ok: false, message: '无效 restriction' }
      }
      foodApp.setDietaryRestriction(restriction)
      pushToast(`饮食禁忌已更新：${DIETARY_RESTRICTION_LABEL[restriction]}`, 'success')
      return { ok: true }
    }
  )

  handlers.set('add_to_order', async ({ dish_id, qty = 1 }: { dish_id: string; qty?: number }) => {
    const dish = MENU_DATA.find((d) => d.id === dish_id)
    if (!dish) {
      pushToast(`未知菜品：${dish_id}`, 'error')
      return { ok: false, message: `未知菜品：${dish_id}` }
    }
    const n = Number(qty) || 1
    foodApp.addOrder(dish_id, n)
    pushToast(`已加入订单：${dish.name} × ${n}`, 'success')
    return { ok: true }
  })

  handlers.set('remove_from_order', async ({ dish_id }: { dish_id: string }) => {
    const dish = MENU_DATA.find((d) => d.id === dish_id)
    foodApp.removeOrder(dish_id)
    pushToast(`已取消：${dish?.name ?? dish_id}`, 'warn')
    return { ok: true }
  })

  handlers.set('clear_orders', async () => {
    foodApp.clearOrders()
    pushToast('订单已清空', 'success')
    return { ok: true }
  })

  handlers.set('switch_tab', async ({ tab }: { tab: PhoneTab }) => {
    if (!['menu', 'orders', 'profile'].includes(tab)) {
      pushToast('无效的 tab', 'error')
      return { ok: false, message: '无效 tab' }
    }
    phoneTab.value = tab
    const label = tab === 'menu' ? '首页' : tab === 'orders' ? '订单' : '我的'
    pushToast(`已切换到${label}`, 'info')
    return { ok: true }
  })

  // ============================================================
  // 订单状态机 + 优惠券（5 个）
  // ============================================================

  handlers.set('submit_order', async () => {
    const r = foodApp.submitOrder()
    if (!r.ok) {
      pushToast(r.message ?? '提交失败', 'error')
      return { ok: false, message: r.message }
    }
    pushToast('订单已提交，请支付', 'success')
    return { ok: true, message: '已提交', data: { order_id: r.orderId } }
  })

  handlers.set('pay_order', async ({ order_id, method }: { order_id?: string; method: string }) => {
    const r = foodApp.payOrder(order_id, method as PaymentMethod)
    if (!r.ok) {
      pushToast(r.message ?? '支付失败', 'error')
      return { ok: false, message: r.message }
    }
    const labelMap: Record<PaymentMethod, string> = {
      wechat: '微信支付',
      alipay: '支付宝',
      card: '银行卡'
    }
    pushToast(`支付成功（${labelMap[method as PaymentMethod] ?? method}）`, 'success')
    return { ok: true }
  })

  handlers.set('cancel_order', async ({ order_id }: { order_id: string }) => {
    const r = foodApp.cancelOrder(order_id)
    if (!r.ok) {
      pushToast(r.message ?? '取消失败', 'error')
      return { ok: false, message: r.message }
    }
    pushToast('订单已取消', 'warn')
    return { ok: true }
  })

  handlers.set('apply_coupon', async ({ coupon_id }: { coupon_id: string }) => {
    const r = foodApp.applyCoupon(coupon_id)
    if (!r.ok) {
      pushToast(r.message ?? '优惠券应用失败', 'error')
      return { ok: false, message: r.message }
    }
    pushToast('优惠券已应用', 'success')
    return { ok: true }
  })

  handlers.set('clear_coupon', async () => {
    foodApp.clearCoupon()
    pushToast('优惠券已清除', 'info')
    return { ok: true }
  })

  return handlers
}
