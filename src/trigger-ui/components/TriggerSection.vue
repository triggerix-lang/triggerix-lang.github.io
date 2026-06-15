<script setup lang="ts">
import type { ItemDescriptor, SlotSegment, ToolDescriptor } from 'triggerix-editor-vue'
import { ref } from 'vue'
import TriggerItem from './TriggerItem.vue'

const props = defineProps<{
  title: string
  type: 'event' | 'condition' | 'action'
  items: (ItemDescriptor | undefined)[]
  getAvailableTypes: () => { type: string; template: string }[]
  maxItems?: number
  getToolDescriptors: (segment: SlotSegment) => ToolDescriptor[]
}>()

const emit = defineEmits<{
  add: [type: string]
  delete: [index: number]
  slotFill: [index: number, slotKey: string, tool: string, value: unknown]
}>()

const showTypePicker = ref(false)
const typeOptions = ref<{ type: string; template: string }[]>([])

const sectionIcon = {
  event: '⚡',
  condition: '◆',
  action: '▶'
}

function toggleTypePicker() {
  if (props.maxItems && props.items.length >= props.maxItems) return
  if (!showTypePicker.value) {
    typeOptions.value = props.getAvailableTypes()
  }
  showTypePicker.value = !showTypePicker.value
}

function pickType(type: string) {
  emit('add', type)
  showTypePicker.value = false
}

function canAdd() {
  if (props.maxItems && props.items.length >= props.maxItems) return false
  return true
}
</script>

<template>
  <div class="trigger-section" :class="`trigger-section--${type}`">
    <div class="trigger-section__header">
      <span class="trigger-section__icon">{{ sectionIcon[type] }}</span>
      <span class="trigger-section__title">{{ title }}</span>
    </div>

    <div class="trigger-section__items">
      <template v-if="items.length === 0">
        <div class="trigger-section__empty">无</div>
      </template>
      <TriggerItem
        v-for="(item, i) in items"
        v-else
        :key="i"
        :segments="item?.segments ?? []"
        :index="i"
        :type="type"
        :get-tool-descriptors="getToolDescriptors"
        @delete="(idx: number) => emit('delete', idx)"
        @slot-fill="
          (key: string, tool: string, val: unknown) => emit('slotFill', i, key, tool, val)
        "
      />
    </div>

    <!-- Add button -->
    <button v-if="canAdd()" class="trigger-section__add" @click="toggleTypePicker">
      <span class="trigger-section__add-icon">+</span>
      添加
    </button>

    <!-- Type picker -->
    <div v-if="showTypePicker" class="trigger-section__type-picker">
      <button
        v-for="t in typeOptions"
        :key="t.type"
        class="trigger-section__type-option"
        @click="pickType(t.type)"
      >
        {{ t.template.replace(/\$\{[^}]+\}/g, '___') }}
      </button>
    </div>
  </div>
</template>
