import type {
  ItemDescriptor,
  Segment,
  ToolDescriptor,
  War3Editor,
  War3EditorState
} from 'triggerix-editor-preset-war3'
import { computed, type Ref } from 'vue'

export type SlotSegment = Extract<Segment, { type: 'slot' }>

export function useTriggerEditor(editor: War3Editor, state: Ref<War3EditorState>) {
  const eventDescriptor = computed<ItemDescriptor | null>(() => {
    void state.value
    return editor.getEventDescriptor()
  })

  const actionDescriptors = computed<(ItemDescriptor | null)[]>(() => {
    void state.value
    const current = editor.getState()
    return current.actions.map((_, i) => editor.getActionDescriptor(i))
  })

  const conditionDescriptors = computed<(ItemDescriptor | null)[]>(() => {
    void state.value
    const current = editor.getState()
    return current.conditions.map((_, i) => editor.getConditionDescriptor(i))
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
