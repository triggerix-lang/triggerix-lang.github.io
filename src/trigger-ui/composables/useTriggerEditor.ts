import type {
  ItemDescriptor,
  Segment,
  ToolDescriptor,
  War3Editor,
  War3EditorState
} from 'triggerix-ui-preset-war3'
import { computed, type Ref } from 'vue'

export type SlotSegment = Extract<Segment, { type: 'slot' }>

export function useTriggerEditor(editor: War3Editor, state: Ref<War3EditorState>) {
  const eventDescriptor = computed<ItemDescriptor | null>(() => {
    if (!state.value.event) return null
    return editor.getEventDescriptor()
  })

  const actionDescriptors = computed<(ItemDescriptor | null)[]>(() => {
    return state.value.actions.map((_, i) => editor.getActionDescriptor(i))
  })

  const conditionDescriptors = computed<(ItemDescriptor | null)[]>(() => {
    return state.value.conditions.map((_, i) => editor.getConditionDescriptor(i))
  })

  function getSlotToolDescriptors(segment: SlotSegment): ToolDescriptor[] {
    return editor.getSlotTools({ label: segment.label, tools: segment.tools })
  }

  return {
    eventDescriptor,
    actionDescriptors,
    conditionDescriptors,
    getSlotToolDescriptors
  }
}
