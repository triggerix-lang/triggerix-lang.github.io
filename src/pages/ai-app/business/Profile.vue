<script setup lang="ts">
import { computed } from 'vue'
import ScrollView from '../../../components/ScrollView.vue'
import { useFoodApp } from '../../../composables/useFoodApp'

const { nickname, gender } = useFoodApp()

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
</script>

<template>
  <ScrollView class="profile">
    <div class="profile-header">
      <div class="profile-avatar">
        {{ initial }}
      </div>
      <div class="profile-name">
        <div class="profile-name-text">
          {{ nickname }}
        </div>
        <div class="profile-gender">
          <span class="profile-gender-icon" :class="genderIcon" aria-hidden="true" />
          <span>{{ genderLabel }}</span>
        </div>
      </div>
    </div>

    <div class="profile-stats">
      <div class="profile-stat">
        <div class="profile-stat-num">
          {{ 0 }}
        </div>
        <div class="profile-stat-label">历史订单</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-num">
          {{ 0 }}
        </div>
        <div class="profile-stat-label">收藏菜品</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-num">0</div>
        <div class="profile-stat-label">积分</div>
      </div>
    </div>

    <ul class="profile-list">
      <li class="profile-list-item">
        <span class="profile-list-icon i-mdi-receipt-text-outline" aria-hidden="true" />
        <span>我的订单</span>
        <span class="profile-arrow">›</span>
      </li>
      <li class="profile-list-item">
        <span class="profile-list-icon i-mdi-ticket-percent-outline" aria-hidden="true" />
        <span>优惠券</span>
        <span class="profile-arrow">›</span>
      </li>
      <li class="profile-list-item">
        <span class="profile-list-icon i-mdi-map-marker-outline" aria-hidden="true" />
        <span>收货地址</span>
        <span class="profile-arrow">›</span>
      </li>
      <li class="profile-list-item">
        <span class="profile-list-icon i-mdi-cog-outline" aria-hidden="true" />
        <span>设置</span>
        <span class="profile-arrow">›</span>
      </li>
    </ul>

    <p class="profile-hint">试试跟 AI 说「把昵称改成小明」或「设置性别为女」</p>
  </ScrollView>
</template>

<style scoped lang="scss">
.profile {
  padding: 16px;
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  background: linear-gradient(135deg, rgba(201, 168, 76, 0.1), rgba(201, 168, 76, 0.02));
  border: 1px solid rgba(201, 168, 76, 0.3);
  border-radius: 12px;
  margin-bottom: 14px;
}
.profile-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(180deg, #c9a84c, #a8862e);
  color: #1a1408;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  font-family: 'Cinzel', serif;
}
.profile-name {
  flex: 1;
}
.profile-name-text {
  font-size: 16px;
  font-weight: 600;
  color: #e6edf3;
  margin-bottom: 4px;
}
.profile-gender {
  font-size: 12px;
  color: #aab3c4;
  display: flex;
  align-items: center;
  gap: 4px;
}
.profile-gender-icon {
  width: 14px;
  height: 14px;
  color: #c9a84c;
  flex-shrink: 0;
}
.profile-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.profile-stat {
  flex: 1;
  padding: 12px;
  background: #0c0e14;
  border: 1px solid #1f2735;
  border-radius: 8px;
  text-align: center;
}
.profile-stat-num {
  font-size: 18px;
  font-weight: 700;
  color: #c9a84c;
  font-family: ui-monospace, monospace;
}
.profile-stat-label {
  font-size: 11px;
  color: #7a8599;
  margin-top: 2px;
}
.profile-list {
  list-style: none;
  padding: 0;
  margin: 0;
  background: #0c0e14;
  border: 1px solid #1f2735;
  border-radius: 8px;
  overflow: hidden;
}
.profile-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  font-size: 13px;
  color: #e6edf3;
  border-bottom: 1px solid #1f2735;
}
.profile-list-item:last-child {
  border-bottom: 0;
}
.profile-arrow {
  margin-left: auto;
  color: #4f5b6e;
}
.profile-list-icon {
  width: 18px;
  height: 18px;
  color: #aab3c4;
  flex-shrink: 0;
}
.profile-hint {
  margin: 14px 0 0;
  padding: 10px;
  background: rgba(79, 195, 247, 0.06);
  border: 1px dashed rgba(79, 195, 247, 0.3);
  border-radius: 8px;
  font-size: 11px;
  color: #7a8599;
  text-align: center;
  line-height: 1.6;
}
</style>
