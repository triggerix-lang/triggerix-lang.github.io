<script setup lang="ts">
import type { SlotValueEntry } from 'triggerix-editor-vue'
import { computed } from 'vue'
import { useTriggerEditor } from '../composables/useTriggerEditor'
import TriggerSection from './TriggerSection.vue'
import '../styles/trigger.css'

const {
  editor,
  eventDescriptor,
  actionDescriptors,
  conditionDescriptors,
  getSlotToolDescriptors,
  setEvent,
  clearEvent,
  setEventSlot,
  addAction,
  removeAction,
  setActionSlot,
  addCondition,
  removeCondition,
  setConditionSlot
} = useTriggerEditor()

// Expose editor for parent to register definitions
defineExpose({ editor })

// Available types (read on-demand to avoid stale computed values when registries
// are populated after this component mounts)
function getAvailableEvents() {
  return editor.getAvailableEvents().map((e) => ({ type: e.type, template: e.template }))
}
function getAvailableActions() {
  return editor.getAvailableActions().map((a) => ({ type: a.type, template: a.template }))
}
function getAvailableConditions() {
  return editor.getAvailableConditions().map((c) => ({ type: c.type, template: c.template }))
}

// Event items (array of 0 or 1)
const eventItems = computed(() => {
  if (!eventDescriptor.value) return []
  return [eventDescriptor.value]
})

// Handlers
function handleAddEvent(type: string) {
  setEvent(type)
}

function handleDeleteEvent() {
  clearEvent()
}

function handleEventSlotFill(_index: number, slotKey: string, tool: string, value: unknown) {
  const entry: SlotValueEntry = { tool, value }
  setEventSlot(slotKey, entry)
}

function handleAddAction(type: string) {
  addAction(type)
}

function handleDeleteAction(index: number) {
  removeAction(index)
}

function handleActionSlotFill(index: number, slotKey: string, tool: string, value: unknown) {
  const entry: SlotValueEntry = { tool, value }
  setActionSlot(index, slotKey, entry)
}

function handleAddCondition(type: string) {
  addCondition(type)
}

function handleDeleteCondition(index: number) {
  removeCondition(index)
}

function handleConditionSlotFill(index: number, slotKey: string, tool: string, value: unknown) {
  const entry: SlotValueEntry = { tool, value }
  setConditionSlot(index, slotKey, entry)
}
</script>

<template>
  <div class="trigger-editor">
    <TriggerSection
      title="事件"
      type="event"
      :items="eventItems"
      :get-available-types="getAvailableEvents"
      :max-items="1"
      :get-tool-descriptors="getSlotToolDescriptors"
      @add="handleAddEvent"
      @delete="handleDeleteEvent"
      @slot-fill="handleEventSlotFill"
    />
    <TriggerSection
      title="条件"
      type="condition"
      :items="conditionDescriptors"
      :get-available-types="getAvailableConditions"
      :get-tool-descriptors="getSlotToolDescriptors"
      @add="handleAddCondition"
      @delete="handleDeleteCondition"
      @slot-fill="handleConditionSlotFill"
    />
    <TriggerSection
      title="动作"
      type="action"
      :items="actionDescriptors"
      :get-available-types="getAvailableActions"
      :get-tool-descriptors="getSlotToolDescriptors"
      @add="handleAddAction"
      @delete="handleDeleteAction"
      @slot-fill="handleActionSlotFill"
    />
  </div>
</template>
