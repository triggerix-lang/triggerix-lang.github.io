import type { Ref } from 'vue'
import type { FoodApp } from '../composables/useFoodApp'
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
 * 创建 7 个业务 action handler（同步动作，无 UI 模板）。
 *
 * 移除 show_* 异步工具：UI 模板改由 UIBuilder 原子化构造后直接 mount，
 * 模板里的 button.click trigger 通过 triggerix runtime 派发到同名 action。
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

  handlers.set('emit_event', async ({ event }: { event: string }) => {
    // UI 模板里 cancel / 关闭 按钮触发；user code（useChatSession）订阅这个事件做 unmount
    pushToast('已关闭', 'info')
    return { ok: true, message: event }
  })

  return handlers
}
