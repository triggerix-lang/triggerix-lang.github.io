<script setup lang="ts">
import type {
  SlotDef,
  SlotValueEntry,
  ToolDescriptor,
  War3Editor,
  War3EditorState
} from 'triggerix-ui-preset-war3'
import { computed, ref, toRef } from 'vue'
import { useTriggerEditor, type SlotSegment } from '../composables/useTriggerEditor'
import ItemEditorModal from './ItemEditorModal.vue'
import SlotFillModal from './SlotFillModal.vue'
import TriggerSection from './TriggerSection.vue'

const props = defineProps<{
  editor: War3Editor
  state: War3EditorState
}>()

const stateRef = toRef(() => props.state)

const { eventDescriptor, actionDescriptors, conditionDescriptors, getSlotToolDescriptors } =
  useTriggerEditor(props.editor, stateRef)

const eventSlotEntriesList = computed(() => {
  const ev = props.state.event
  return ev ? [ev.slotValues] : []
})
const actionSlotEntriesList = computed(() => props.state.actions.map((a) => a.slotValues))
const conditionSlotEntriesList = computed(() => props.state.conditions.map((c) => c.slotValues))

interface AvailableType {
  id: string
  label: string
}

interface DefLike {
  id: string
  label?: string
  template: string
  slots?: Record<string, SlotDef>
}

function toAvailableTypes<T extends DefLike>(defs: T[]): AvailableType[] {
  return defs.map((d) => ({
    id: d.id,
    label:
      d.label && d.label.length > 0
        ? d.label
        : d.template.replace(/\$\{(\w+)\}/g, (_, key) => d.slots?.[key]?.label ?? key)
  }))
}

const availableEvents = computed(() => toAvailableTypes(props.editor.getAvailableEvents()))
const availableActions = computed(() => toAvailableTypes(props.editor.getAvailableActions()))
const availableConditions = computed(() => toAvailableTypes(props.editor.getAvailableConditions()))

// --- Add / Edit (ItemEditorModal) ---
const itemModalOpen = ref(false)
const itemModalKind = ref<'event' | 'condition' | 'action'>('event')
const itemModalAvailable = ref<AvailableType[]>([])

// Edit-mode state (undefined => add mode)
const editType = ref<string | undefined>(undefined)
const editSlotValues = ref<Record<string, SlotValueEntry> | undefined>(undefined)
const editIndex = ref<number>(-1)

function getAvailableForKind(kind: 'event' | 'condition' | 'action'): AvailableType[] {
  switch (kind) {
    case 'event':
      return availableEvents.value
    case 'condition':
      return availableConditions.value
    case 'action':
      return availableActions.value
  }
}

function handleSectionAdd(kind: 'event' | 'condition' | 'action') {
  // Clear edit-mode state — entering add mode
  editType.value = undefined
  editSlotValues.value = undefined
  editIndex.value = -1

  itemModalKind.value = kind
  itemModalAvailable.value = getAvailableForKind(kind)
  itemModalOpen.value = true
}

function handleEditItem(kind: 'event' | 'condition' | 'action', index: number) {
  itemModalKind.value = kind

  const state = props.editor.getState()
  let itemState: { id: string; slotValues: Record<string, SlotValueEntry> } | null = null

  if (kind === 'event') {
    itemState = state.event
  } else if (kind === 'condition') {
    itemState = state.conditions[index] ?? null
  } else if (kind === 'action') {
    itemState = state.actions[index] ?? null
  }

  if (!itemState) return

  editType.value = itemState.id
  editSlotValues.value = { ...itemState.slotValues }
  editIndex.value = index

  itemModalAvailable.value = getAvailableForKind(kind)
  itemModalOpen.value = true
}

function handleItemConfirm(type: string, slotValues: Record<string, SlotValueEntry>) {
  const kind = itemModalKind.value
  const editing = editType.value !== undefined
  const idx = editIndex.value

  if (kind === 'event') {
    // setEvent always resets slotValues, so this works for both add and edit
    props.editor.setEvent(type)
    for (const [k, v] of Object.entries(slotValues)) {
      props.editor.setEventSlot(k, v)
    }
  } else if (kind === 'action') {
    if (editing && type === editType.value && idx >= 0) {
      // Same type — update slots in place to preserve position
      for (const [k, v] of Object.entries(slotValues)) {
        props.editor.setActionSlot(idx, k, v)
      }
    } else {
      // Add mode, or edit with type change — remove old (if editing) and append new
      if (editing && idx >= 0) {
        props.editor.removeAction(idx)
      }
      props.editor.addAction(type)
      const newIndex = props.editor.getState().actions.length - 1
      for (const [k, v] of Object.entries(slotValues)) {
        props.editor.setActionSlot(newIndex, k, v)
      }
    }
  } else {
    if (editing && type === editType.value && idx >= 0) {
      for (const [k, v] of Object.entries(slotValues)) {
        props.editor.setConditionSlot(idx, k, v)
      }
    } else {
      if (editing && idx >= 0) {
        props.editor.removeCondition(idx)
      }
      props.editor.addCondition(type)
      const newIndex = props.editor.getState().conditions.length - 1
      for (const [k, v] of Object.entries(slotValues)) {
        props.editor.setConditionSlot(newIndex, k, v)
      }
    }
  }

  // Reset edit-mode state
  editType.value = undefined
  editSlotValues.value = undefined
  editIndex.value = -1
}

// --- Slot fill on existing items ---
interface SlotFillContext {
  kind: 'event' | 'condition' | 'action'
  itemIndex: number
  segment: SlotSegment
}

const slotModalOpen = ref(false)
const slotModalSegment = ref<SlotSegment | null>(null)
const slotModalTools = ref<ToolDescriptor[]>([])
const slotModalCurrent = ref<SlotValueEntry | null>(null)
const slotFillContext = ref<SlotFillContext | null>(null)

function getCurrentEntry(kind: SlotFillContext['kind'], itemIndex: number, key: string) {
  const state = props.editor.getState()
  if (kind === 'event') return state.event?.slotValues?.[key] ?? null
  if (kind === 'action') return state.actions[itemIndex]?.slotValues?.[key] ?? null
  return state.conditions[itemIndex]?.slotValues?.[key] ?? null
}

function openSlotFill(kind: SlotFillContext['kind'], itemIndex: number, segment: SlotSegment) {
  slotFillContext.value = { kind, itemIndex, segment }
  slotModalSegment.value = segment
  slotModalTools.value = getSlotToolDescriptors(segment)
  slotModalCurrent.value = getCurrentEntry(kind, itemIndex, segment.key)
  slotModalOpen.value = true
}

function handleSlotFillConfirm(entry: SlotValueEntry) {
  const ctx = slotFillContext.value
  if (!ctx) return
  if (ctx.kind === 'event') {
    props.editor.setEventSlot(ctx.segment.key, entry)
  } else if (ctx.kind === 'action') {
    props.editor.setActionSlot(ctx.itemIndex, ctx.segment.key, entry)
  } else {
    props.editor.setConditionSlot(ctx.itemIndex, ctx.segment.key, entry)
  }
}

// --- Delete ---
function handleDeleteEvent() {
  props.editor.clearEvent()
}
function handleDeleteAction(index: number) {
  props.editor.removeAction(index)
}
function handleDeleteCondition(index: number) {
  props.editor.removeCondition(index)
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
      :readonly="true"
      :items="eventDescriptor ? [eventDescriptor] : []"
      :slot-entries-list="eventSlotEntriesList"
      :available-types="availableEvents"
      :max-items="1"
      :get-tool-descriptors="getSlotToolDescriptors"
      :editor="editor"
      @add="handleSectionAdd"
      @delete="handleDeleteEvent"
      @edit-item="() => handleEditItem('event', 0)"
      @slot-click="(_i: number, seg: SlotSegment) => openSlotFill('event', 0, seg)"
    />
    <TriggerSection
      title="条件"
      type="condition"
      :readonly="true"
      :items="conditionDescriptors"
      :slot-entries-list="conditionSlotEntriesList"
      :available-types="availableConditions"
      :get-tool-descriptors="getSlotToolDescriptors"
      :editor="editor"
      @add="handleSectionAdd"
      @delete="handleDeleteCondition"
      @edit-item="(idx: number) => handleEditItem('condition', idx)"
      @slot-click="(i: number, seg: SlotSegment) => openSlotFill('condition', i, seg)"
    />
    <TriggerSection
      title="动作"
      type="action"
      :readonly="true"
      :items="actionDescriptors"
      :slot-entries-list="actionSlotEntriesList"
      :available-types="availableActions"
      :get-tool-descriptors="getSlotToolDescriptors"
      :editor="editor"
      @add="handleSectionAdd"
      @delete="handleDeleteAction"
      @edit-item="(idx: number) => handleEditItem('action', idx)"
      @slot-click="(i: number, seg: SlotSegment) => openSlotFill('action', i, seg)"
    />
  </div>

  <ItemEditorModal
    v-model:open="itemModalOpen"
    :type="itemModalKind"
    :available-types="itemModalAvailable"
    :editor="editor"
    :edit-type="editType"
    :edit-slot-values="editSlotValues"
    @confirm="handleItemConfirm"
  />

  <SlotFillModal
    v-model:open="slotModalOpen"
    :segment="slotModalSegment"
    :tool-descriptors="slotModalTools"
    :current-value="slotModalCurrent"
    :editor="editor"
    @confirm="handleSlotFillConfirm"
  />
</template>
