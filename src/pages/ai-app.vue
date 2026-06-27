<script setup lang="ts">
/**
 * AI 餐饮点餐 app 编排层。
 *
 * 组合 useFoodApp（业务数据）+ buildAtomicTools（5 个 builder atomic + 5 个 domain 工具 +
 * **11 个业务 action 直调工具** + UIBuilder + systemPrompt）
 * + createBusinessHandlers（11 个业务 action handler）+ useChatSession（聊天 + 工具执行）
 * 渲染：PC 双栏（手机 + 聊天面板）/ 移动单栏（手机 + FAB 抽屉）
 *
 * 关键：业务 handler 池同时透传给 buildAtomicTools（包成 DomainTool 让 LLM 直接调）
 * 和 useChatSession（注册为 triggerix runtime action 让 UI 表单按钮触发）。
 */

import { ref, useTemplateRef } from 'vue'
import { useFoodApp } from '../composables/useFoodApp'
import { buildAtomicTools } from '../ai-app-shared/atomicTools'
import { createBusinessHandlers, type ToastTone } from '../ai-app-shared/businessHandlers'
import { useChatSession } from '../composables/useChatSession'
import { MENU_DATA, type MenuItem } from '../ai-app-shared/menuData'
import { COUPON_DATA, PAYMENT_METHODS } from '../ai-app-shared/couponData'
import AiChatPanel from './ai-app/components/AiChatPanel.vue'
import PhoneFrame from './ai-app/components/PhoneFrame.vue'
import type { PhoneTab } from './ai-app/components/PhoneTabbar.vue'
import MobileAiFab from './ai-app/components/MobileAiFab.vue'
import ToastHost from './ai-app/components/ToastHost.vue'
import HomeMenu from './ai-app/business/HomeMenu.vue'
import MyOrders from './ai-app/business/MyOrders.vue'
import Profile from './ai-app/business/Profile.vue'

// 业务数据
const foodApp = useFoodApp()
const phoneTab = ref<PhoneTab>('menu')

// 业务动态数据源（domain tool 的 handler 闭包捕获）
// gender 选项固定，与 useFoodApp 的 Gender 类型一致
const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'other', label: '保密' }
]
const TAB_OPTIONS = [
  { value: 'menu', label: '首页' },
  { value: 'orders', label: '订单' },
  { value: 'profile', label: '我的' }
]
// 默认偏好（与 useFoodApp 的枚举类型一致）
const DINING_MODE_OPTIONS = [
  { value: 'dine_in', label: '堂食' },
  { value: 'takeaway', label: '外带' },
  { value: 'delivery', label: '配送' }
]
const UTENSIL_COUNT_OPTIONS = [
  { value: '0', label: '0 份（无需餐具）' },
  { value: '1', label: '1 份' },
  { value: '2', label: '2 份' },
  { value: '3', label: '3 份' }
]
const DIETARY_PREFERENCE_OPTIONS = [
  { value: 'meat', label: '荤' },
  { value: 'vegetarian', label: '素' },
  { value: 'halal', label: '清真' },
  { value: 'unrestricted', label: '无忌口' }
]
const TASTE_PREFERENCE_OPTIONS = [
  { value: 'none', label: '不辣' },
  { value: 'mild', label: '微辣' },
  { value: 'medium', label: '中辣' }
]
const DIETARY_RESTRICTION_OPTIONS = [
  { value: 'none', label: '无' },
  { value: 'green_onion_garlic', label: '葱蒜' },
  { value: 'seafood', label: '海鲜' }
]

// Toast 主机 + pushToast 桥接
const toastRef = useTemplateRef<InstanceType<typeof ToastHost>>('toast')
function pushToast(message: string, tone: ToastTone = 'info') {
  toastRef.value?.push(message, tone)
}

// 业务 handler 池（声明在 buildAtomicTools 之前 —— 它要透传给后者，把业务 action 包成 DomainTool）
const handlers = createBusinessHandlers({ foodApp, phoneTab, pushToast })

// 原子工具集（5 个 addComponent / addTrigger / ... + 5 个 domain tool + 11 个业务 action 直调工具 + UIBuilder + systemPrompt）
// 业务 handler 池透传给 buildAtomicTools → 包成 DomainTool 让 LLM 直接调
const { toolDefinitions, builder, systemPrompt, executeCall } = buildAtomicTools({
  menu: () =>
    MENU_DATA.map((d: MenuItem) => ({
      value: d.id,
      label: d.name,
      price: d.price,
      category: d.category
    })),
  tabs: () => TAB_OPTIONS,
  options: (field: string) => {
    if (field === 'user.gender') return GENDER_OPTIONS
    if (field === 'user.defaultDiningMode') return DINING_MODE_OPTIONS
    if (field === 'user.defaultUtensilCount') return UTENSIL_COUNT_OPTIONS
    if (field === 'user.dietaryPreference') return DIETARY_PREFERENCE_OPTIONS
    if (field === 'user.tastePreference') return TASTE_PREFERENCE_OPTIONS
    if (field === 'user.dietaryRestriction') return DIETARY_RESTRICTION_OPTIONS
    return undefined
  },
  coupons: () =>
    COUPON_DATA.map((c) => ({
      value: c.id,
      label: c.label,
      minSpend: c.minSpend,
      description: c.description
    })),
  paymentMethods: () => [...PAYMENT_METHODS],
  // 业务 action 注册为可直调的 DomainTool（emit_event 由 useChatSession 特殊处理）
  businessHandlers: handlers,
  pushToast
})

// ChatPanel 暴露 bubbleElFor（AI 提交的 UI 挂到对应 assistant 消息气泡内）
const chatPanelRef = useTemplateRef<InstanceType<typeof AiChatPanel>>('chatPanel')
const modalSlot = ref<HTMLElement | null>(null) // 兜底
const getBubbleEl = (msgId: number): HTMLElement | null =>
  chatPanelRef.value?.bubbleElFor?.(msgId) ?? null

// Chat session
const { messages, thinking, error, send } = useChatSession({
  tools: toolDefinitions,
  systemPrompt,
  handlers,
  builder,
  executeCall,
  getBubbleEl,
  modalSlot,
  pushToast,
  // 解析 AI 在 addComponent 的 props 里写的 `$ref:user.nickname` 之类字符串
  // → 挂载时替换成当前 app 状态（foodApp.nickname.value 等）
  //
  // 兼容多种 path 格式（LLM 输出不稳定）：
  //   - "user.nickname" / "user.gender"        ← atomicTools prompt 推荐格式
  //   - "nickname" / "gender"                  ← LLM 经常省略 user. 前缀
  //   - "user.nickname.value" / "user.gender.value" ← LLM 看到 foodApp.xxx.value 误学
  // 取 path 最后一段作为 field 即可
  propRefResolver: (path: string) => {
    const field = path.split('.').pop()
    if (field === 'nickname') return foodApp.nickname.value
    if (field === 'gender') return foodApp.gender.value
    if (field === 'appliedCouponId') return foodApp.appliedCouponId.value
    if (field === 'defaultDiningMode') return foodApp.defaultDiningMode.value
    if (field === 'defaultUtensilCount') return foodApp.defaultUtensilCount.value
    if (field === 'defaultNotes') return foodApp.defaultNotes.value
    if (field === 'dietaryPreference') return foodApp.dietaryPreference.value
    if (field === 'tastePreference') return foodApp.tastePreference.value
    if (field === 'dietaryRestriction') return foodApp.dietaryRestriction.value
    return undefined
  }
})

// 移动端 FAB 抽屉
const mobileChatOpen = ref(false)

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info('[ai-app] system prompt length:', systemPrompt.length)
}
</script>

<template>
  <div class="ai-app">
    <!-- PC：双栏 -->
    <div class="ai-app-pc">
      <div class="ai-app-phone-wrap">
        <PhoneFrame ref="phoneFramePc" v-model:active="phoneTab">
          <HomeMenu v-if="phoneTab === 'menu'" />
          <MyOrders v-else-if="phoneTab === 'orders'" />
          <Profile v-else-if="phoneTab === 'profile'" />
        </PhoneFrame>
      </div>
      <div class="ai-app-chat-wrap">
        <AiChatPanel
          ref="chatPanel"
          :messages="messages"
          :thinking="thinking"
          :error="error"
          @send="send"
        />
      </div>
    </div>

    <!-- 移动端：手机 + FAB + 抽屉 -->
    <div class="ai-app-mobile">
      <div class="ai-app-phone-wrap-mobile">
        <PhoneFrame ref="phoneFrameMobile" v-model:active="phoneTab">
          <HomeMenu v-if="phoneTab === 'menu'" />
          <MyOrders v-else-if="phoneTab === 'orders'" />
          <Profile v-else-if="phoneTab === 'profile'" />
        </PhoneFrame>
      </div>
      <MobileAiFab v-model:open="mobileChatOpen" />
      <Transition name="chat-drawer">
        <div v-if="mobileChatOpen" class="ai-app-drawer">
          <div class="ai-app-drawer-header">
            <span class="ai-app-drawer-title">AI 助手</span>
            <button class="ai-app-drawer-close" @click="mobileChatOpen = false">✕</button>
          </div>
          <div class="ai-app-drawer-chat">
            <AiChatPanel
              ref="chatPanel"
              :messages="messages"
              :thinking="thinking"
              :error="error"
              @send="send"
            />
          </div>
        </div>
      </Transition>
    </div>

    <ToastHost ref="toast" />
  </div>
</template>

<style scoped lang="scss">
.ai-app {
  height: 100%;
  width: 100%;
  display: flex;
  background: #0a0c11;
}

/* PC：双栏 */
.ai-app-pc {
  display: none;
  width: 100%;
  height: 100%;
  padding: 24px;
  gap: 24px;
  align-items: center;
  justify-content: center;
}
.ai-app-phone-wrap {
  flex-shrink: 0;
  height: 100%;
  display: flex;
  align-items: center;
}
.ai-app-chat-wrap {
  flex: 1;
  height: 100%;
  max-height: 780px;
  max-width: 720px;
  border: 1px solid #2a3348;
  border-radius: 16px;
  overflow: hidden;
  background: #0c0e14;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* 移动端：单栏 */
.ai-app-mobile {
  display: flex;
  width: 100%;
  height: 100%;
  padding: 8px;
  align-items: center;
  justify-content: center;
}
.ai-app-phone-wrap-mobile {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 抽屉 */
.ai-app-drawer {
  position: fixed;
  inset: 0;
  background: #0a0c11;
  z-index: 200;
  display: flex;
  flex-direction: column;
}
.ai-app-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #2a3348;
  background: #0c0e14;
  flex-shrink: 0;
}
.ai-app-drawer-title {
  font-size: 14px;
  font-weight: 600;
  color: #e6edf3;
}
.ai-app-drawer-close {
  background: transparent;
  border: 0;
  color: #aab3c4;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.ai-app-drawer-close:hover {
  background: #2a3348;
}
.ai-app-drawer-chat {
  flex: 1;
  min-height: 0;
}

.chat-drawer-enter-active,
.chat-drawer-leave-active {
  transition:
    transform 0.25s,
    opacity 0.25s;
}
.chat-drawer-enter-from,
.chat-drawer-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* 响应式 */
@media (min-width: 768px) {
  .ai-app-pc {
    display: flex;
  }
  .ai-app-mobile {
    display: none;
  }
}
@media (max-width: 767px) {
  .ai-app-mobile {
    display: flex;
  }
  .ai-app-pc {
    display: none;
  }
}
</style>
