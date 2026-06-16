<script setup lang="ts">
import type { SlotValueEntry, War3Editor, War3EditorState } from 'triggerix-ui-preset-war3'
import { toRef } from 'vue'
import { useTriggerEditor } from '../composables/useTriggerEditor'
import TriggerSection from './TriggerSection.vue'

const props = defineProps<{
  editor: War3Editor
  state: War3EditorState
}>()

const stateRef = toRef(() => props.state)

const { eventDescriptor, actionDescriptors, conditionDescriptors, getSlotToolDescriptors } =
  useTriggerEditor(props.editor, stateRef)

function getAvailableEvents() {
  return props.editor.getAvailableEvents().map((e) => ({ type: e.type, template: e.template }))
}

function getAvailableActions() {
  return props.editor.getAvailableActions().map((a) => ({ type: a.type, template: a.template }))
}

function getAvailableConditions() {
  return props.editor.getAvailableConditions().map((c) => ({ type: c.type, template: c.template }))
}

function handleAddEvent(type: string) {
  props.editor.setEvent(type)
}

function handleDeleteEvent() {
  props.editor.clearEvent()
}

function handleEventSlotFill(_index: number, slotKey: string, tool: string, value: unknown) {
  const entry: SlotValueEntry = { tool, value }
  props.editor.setEventSlot(slotKey, entry)
}

function handleAddAction(type: string) {
  props.editor.addAction(type)
}

function handleDeleteAction(index: number) {
  props.editor.removeAction(index)
}

function handleActionSlotFill(index: number, slotKey: string, tool: string, value: unknown) {
  const entry: SlotValueEntry = { tool, value }
  props.editor.setActionSlot(index, slotKey, entry)
}

function handleAddCondition(type: string) {
  props.editor.addCondition(type)
}

function handleDeleteCondition(index: number) {
  props.editor.removeCondition(index)
}

function handleConditionSlotFill(index: number, slotKey: string, tool: string, value: unknown) {
  const entry: SlotValueEntry = { tool, value }
  props.editor.setConditionSlot(index, slotKey, entry)
}
</script>

<template>
  <div
    class="relative rounded-md overflow-hidden bg-#131722 border border-#2a3348 shadow-[0_1px_0_#3d4f6a_inset,0_4px_24px_rgba(0,0,0,0.4)]"
  >
    <div class="h-[3px] opacity-60 bg-gradient-to-r from-transparent via-#c9a84c to-transparent" />
    <TriggerSection
      title="事件"
      type="event"
      :items="eventDescriptor ? [eventDescriptor] : []"
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
