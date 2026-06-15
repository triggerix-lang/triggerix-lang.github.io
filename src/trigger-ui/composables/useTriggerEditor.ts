import type { ItemDescriptor, SlotSegment, ToolDescriptor } from 'triggerix-editor-vue'
import { useEditor } from 'triggerix-editor-vue'
import { computed } from 'vue'

export function useTriggerEditor() {
  const { editor, state, ...actions } = useEditor()

  const eventDescriptor = computed<ItemDescriptor | undefined>(() => {
    if (!state.value.event) return undefined
    return editor.getEventDescriptor()
  })

  const actionDescriptors = computed<(ItemDescriptor | undefined)[]>(() => {
    return state.value.actions.map((_, i) => editor.getActionDescriptor(i))
  })

  const conditionDescriptors = computed<(ItemDescriptor | undefined)[]>(() => {
    return state.value.conditions.map((_, i) => editor.getConditionDescriptor(i))
  })

  function getSlotToolDescriptors(segment: SlotSegment): ToolDescriptor[] {
    return editor.getSlotTools({ label: segment.label, tools: segment.tools })
  }

  return {
    editor,
    state,
    ...actions,
    eventDescriptor,
    actionDescriptors,
    conditionDescriptors,
    getSlotToolDescriptors
  }
}
