import { useLocalStorage } from '@vueuse/core'

export interface OrderItem {
  dishId: string
  qty: number
  createdAt: number
}

export type Gender = 'male' | 'female' | 'other'

/**
 * 餐饮 app 本地数据层
 * 全部基于 VueUse useLocalStorage，组件可直接读取响应式 ref
 */
export function useFoodApp() {
  const orders = useLocalStorage<OrderItem[]>('ai-orders', [])
  const nickname = useLocalStorage<string>('ai-nickname', '游客')
  const gender = useLocalStorage<Gender>('ai-gender', 'other')

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

  return {
    orders,
    nickname,
    gender,
    addOrder,
    removeOrder,
    clearOrders,
    setNickname,
    setGender
  }
}

/** useFoodApp 返回值类型（用于非 setup 上下文，例如 handler 工厂） */
export type FoodApp = ReturnType<typeof useFoodApp>
