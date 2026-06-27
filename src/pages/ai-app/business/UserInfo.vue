<script setup lang="ts">
/**
 * 个人信息展示页（profile-header › 进入的一层）
 * 仅展示，无编辑能力
 */

import { computed } from 'vue'
import { useFoodApp } from '../../../composables/useFoodApp'

defineEmits<{
  (e: 'back'): void
}>()

const {
  nickname,
  gender,
  defaultDiningMode,
  defaultUtensilCount,
  defaultNotes,
  dietaryPreference,
  tastePreference,
  dietaryRestriction
} = useFoodApp()

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

const initial = computed(() => nickname.value.slice(0, 1).toUpperCase())

const DINING_LABEL: Record<string, string> = {
  dine_in: '堂食',
  takeaway: '外带',
  delivery: '配送'
}
const DIETARY_PREF_LABEL: Record<string, string> = {
  meat: '荤',
  vegetarian: '素',
  halal: '清真',
  unrestricted: '无忌口'
}
const TASTE_PREF_LABEL: Record<string, string> = {
  none: '不辣',
  mild: '微辣',
  medium: '中辣'
}
const DIETARY_RESTRICTION_LABEL: Record<string, string> = {
  none: '无',
  green_onion_garlic: '葱蒜',
  seafood: '海鲜'
}

const fields = computed(() => [
  { label: '昵称', value: nickname.value },
  { label: '性别', value: genderLabel.value },
  { label: '用户ID', value: 'guest_001' },
  { label: '默认就餐方式', value: DINING_LABEL[defaultDiningMode.value] ?? '-' },
  { label: '默认餐具数量', value: `${defaultUtensilCount.value} 份` },
  { label: '默认备注', value: defaultNotes.value || '（未设置）' },
  { label: '饮食偏好', value: DIETARY_PREF_LABEL[dietaryPreference.value] ?? '-' },
  { label: '口味偏好', value: TASTE_PREF_LABEL[tastePreference.value] ?? '-' },
  { label: '饮食禁忌', value: DIETARY_RESTRICTION_LABEL[dietaryRestriction.value] ?? '-' }
])
</script>

<template>
  <div class="p-4">
    <header class="mb-3.5 flex items-center gap-1">
      <button
        type="button"
        aria-label="返回"
        class="flex cursor-pointer items-center justify-center rounded border-0 bg-transparent px-2 py-1 text-[#aab3c4] transition-[background,color] duration-150 hover:bg-[#1f2735] hover:text-[#e6edf3]"
        @click="$emit('back')"
      >
        <span class="i-mdi-chevron-left h-5 w-5" aria-hidden="true" />
      </button>
      <h2 class="m-0 text-sm font-semibold text-[#e6edf3]">个人信息</h2>
    </header>

    <section
      class="mb-3.5 flex flex-col items-center rounded-xl border border-[rgba(201,168,76,0.3)] bg-[linear-gradient(135deg,rgba(201,168,76,0.1),rgba(201,168,76,0.02))] px-3 pt-6 pb-[18px]"
    >
      <div
        class="mb-2.5 flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(180deg,#c9a84c,#a8862e)] font-['Cinzel',serif] text-[28px] font-bold text-[#1a1408]"
      >
        {{ initial }}
      </div>
      <div class="text-base font-semibold text-[#e6edf3]">{{ nickname }}</div>
    </section>

    <ul class="m-0 list-none overflow-hidden rounded-lg border border-[#1f2735] bg-[#0c0e14] p-0">
      <li
        v-for="f in fields"
        :key="f.label"
        class="flex items-center justify-between border-b border-[#1f2735] py-3 px-3.5 text-[13px] last:border-b-0"
      >
        <span class="text-[#7a8599]">{{ f.label }}</span>
        <span class="font-mono font-semibold text-[#e6edf3]">{{ f.value }}</span>
      </li>
    </ul>
  </div>
</template>
