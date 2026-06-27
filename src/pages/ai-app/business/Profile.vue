<script setup lang="ts">
import { computed, ref } from 'vue'
import ScrollView from '../../../components/ScrollView.vue'
import UserInfo from './UserInfo.vue'
import { useFoodApp } from '../../../composables/useFoodApp'

type ProfileView = 'main' | 'detail'

const { nickname, gender } = useFoodApp()
const view = ref<ProfileView>('main')

const genderLabel = computed(() => {
  switch (gender.value) {
    case 'male':
      return '男'
    case 'female':
      return '女'
    case 'other':
      return '保密'
    default:
      return '-'
  }
})

const genderIcon = computed(() => {
  switch (gender.value) {
    case 'male':
      return 'i-mdi-gender-male'
    case 'female':
      return 'i-mdi-gender-female'
    default:
      return 'i-mdi-gender-transgender'
  }
})

const initial = computed(() => nickname.value.slice(0, 1).toUpperCase())

function openDetail() {
  view.value = 'detail'
}

const stats = [
  { label: '历史订单', value: 0 },
  { label: '收藏菜品', value: 0 },
  { label: '积分', value: 0 }
]

const menuItems = [
  { icon: 'i-mdi-receipt-text-outline', label: '我的订单' },
  { icon: 'i-mdi-ticket-percent-outline', label: '优惠券' },
  { icon: 'i-mdi-map-marker-outline', label: '收货地址' },
  { icon: 'i-mdi-cog-outline', label: '设置' }
]
</script>

<template>
  <ScrollView class="p-4">
    <Transition name="profile-flip" mode="out-in">
      <div v-if="view === 'main'" key="main">
        <button
          type="button"
          aria-label="查看个人信息"
          class="profile-header mb-3.5 flex w-full cursor-pointer items-center gap-3.5 rounded-xl border border-[rgba(201,168,76,0.3)] bg-[linear-gradient(135deg,rgba(201,168,76,0.1),rgba(201,168,76,0.02))] p-3 text-left font-[inherit] text-[inherit] transition-[border-color,background,transform] duration-150 hover:border-[rgba(201,168,76,0.55)] hover:bg-[linear-gradient(135deg,rgba(201,168,76,0.16),rgba(201,168,76,0.04))] active:scale-[0.99]"
          @click="openDetail"
        >
          <div
            class="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#c9a84c,#a8862e)] font-['Cinzel',serif] text-[22px] font-bold text-[#1a1408]"
          >
            {{ initial }}
          </div>
          <div class="flex-1">
            <div class="mb-1 text-base font-semibold text-[#e6edf3]">
              {{ nickname }}
            </div>
            <div class="flex items-center gap-1 text-xs text-[#aab3c4]">
              <span
                :class="[genderIcon, 'h-3.5 w-3.5 shrink-0 text-[#c9a84c]']"
                aria-hidden="true"
              />
              <span>{{ genderLabel }}</span>
            </div>
          </div>
          <span
            class="profile-header-arrow i-mdi-chevron-right h-5 w-5 shrink-0 text-[#4f5b6e] transition-[color,transform] duration-150"
            aria-hidden="true"
          />
        </button>

        <div class="mb-4 flex gap-2">
          <div
            v-for="s in stats"
            :key="s.label"
            class="flex-1 rounded-lg border border-[#1f2735] bg-[#0c0e14] p-3 text-center"
          >
            <div class="font-mono text-[18px] font-bold text-[#c9a84c]">{{ s.value }}</div>
            <div class="mt-0.5 text-[11px] text-[#7a8599]">{{ s.label }}</div>
          </div>
        </div>

        <ul
          class="m-0 list-none overflow-hidden rounded-lg border border-[#1f2735] bg-[#0c0e14] p-0"
        >
          <li
            v-for="i in menuItems"
            :key="i.label"
            class="flex items-center gap-3 border-b border-[#1f2735] py-3 px-3.5 text-[13px] text-[#e6edf3] last:border-b-0"
          >
            <span
              :class="[i.icon, 'h-[18px] w-[18px] shrink-0 text-[#aab3c4]']"
              aria-hidden="true"
            />
            <span>{{ i.label }}</span>
            <span class="ml-auto text-[#4f5b6e]">›</span>
          </li>
        </ul>

        <p
          class="mt-3.5 rounded-lg border border-dashed border-[rgba(79,195,247,0.3)] bg-[rgba(79,195,247,0.06)] p-2.5 text-center text-[11px] leading-[1.6] text-[#7a8599]"
        >
          试试跟 AI 说「把昵称改成小明」或「设置性别为女」
        </p>
      </div>

      <UserInfo v-else key="detail" @back="view = 'main'" />
    </Transition>
  </ScrollView>
</template>

<style scoped lang="scss">
/* 父 hover 联动子箭头 —— UnoCSS utility-first 表达不了「父:hover → 子」跨元素选择器 */
.profile-header:hover .profile-header-arrow {
  color: #c9a84c;
  transform: translateX(2px);
}

/* 主视图 ↔ 详情视图的水平翻转（Vue <Transition> 钩子） */
.profile-flip-enter-active,
.profile-flip-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.profile-flip-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
.profile-flip-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
</style>
