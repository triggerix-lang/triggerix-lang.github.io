<script setup lang="ts">
import type {
  Segment,
  SlotValueEntry,
  ToolDescriptor,
  War3Editor
} from 'triggerix-editor-preset-war3'
import { resolveSlotDisplayText } from 'triggerix-editor-preset-war3'
import type { SlotSegment } from '../composables/useTriggerEditor'
import SlotChip from './SlotChip.vue'

const props = defineProps<{
  segments: Segment[]
  /**
   * Map of `slotKey -> SlotValueEntry` for the segments rendered here.
   * Required to determine fill state and resolve composite-tool display
   * text, because `Segment.slot` from the preset package only carries the
   * primitive `value`, not the full entry tree.
   */
  slotEntries?: Record<string, SlotValueEntry>
  getToolDescriptors?: (segment: SlotSegment) => ToolDescriptor[]
  /**
   * Editor instance — required when `readonly` is true so that slot
   * segments can be resolved into their human-readable display text via
   * `resolveSlotDisplayText`. Also forwarded to nested SlotChip in the
   * editing mode to support composite-tool display.
   */
  editor?: War3Editor | null
  /**
   * When true, render slots as plain text (resolved via the editor's
   * registry) instead of clickable SlotChip buttons.
   */
  readonly?: boolean
  /**
   * Context for resolving slot entries from editor state directly.
   * Used as ultimate fallback when seg.entry and slotEntries are both stale.
   */
  itemContext?: { kind: 'event' | 'condition' | 'action'; index: number }
}>()

const emit = defineEmits<{
  slotClick: [segment: SlotSegment]
}>()

function handleSlotClick(segment: SlotSegment) {
  emit('slotClick', segment)
}

function getEntry(seg: SlotSegment): SlotValueEntry | null {
  // 1. Prefer the entry embedded directly in the segment (set by parseTemplate)
  if (seg.entry) return seg.entry
  // 2. Try the slotEntries prop
  if (props.slotEntries?.[seg.key]) return props.slotEntries[seg.key]
  // 3. Ultimate fallback: read directly from editor state (always fresh)
  if (props.editor && props.itemContext) {
    const state = props.editor.getState()
    const { kind, index } = props.itemContext
    let slotValues: Record<string, SlotValueEntry> | undefined
    if (kind === 'event') {
      slotValues = state.events[0]?.slotValues
    } else if (kind === 'action') {
      slotValues = state.actions[index]?.slotValues
    } else {
      slotValues = state.conditions[index]?.slotValues
    }
    if (slotValues?.[seg.key]) return slotValues[seg.key]
  }
  return null
}

function isFilled(seg: SlotSegment): boolean {
  return Boolean(getEntry(seg)?.tool)
}

function renderReadonlySlot(seg: SlotSegment): string {
  const entry = getEntry(seg)
  if (!entry?.tool) {
    return seg.label
  }
  return props.editor
    ? resolveSlotDisplayText(entry, props.editor.getRegistry(), seg.label)
    : seg.label
}
</script>

<template>
  <span class="inline">
    <template v-for="(seg, i) in segments" :key="i">
      <span v-if="seg.type === 'text'" class="text-#c9d1d9 whitespace-pre-wrap">{{
        seg.content
      }}</span>
      <template v-else-if="seg.type === 'slot'">
        <span
          v-if="readonly"
          class="font-mono text-[0.82rem] mx-1"
          :class="isFilled(seg as SlotSegment) ? 'text-#80cbc4' : 'text-#4fc3f7 opacity-60'"
          >{{ renderReadonlySlot(seg as SlotSegment) }}</span
        >
        <SlotChip
          v-else
          :segment="seg as SlotSegment"
          :entry="getEntry(seg as SlotSegment)"
          :tool-descriptors="
            getToolDescriptors ? getToolDescriptors(seg as SlotSegment) : undefined
          "
          :editor="editor"
          @click-slot="handleSlotClick"
        />
      </template>
    </template>
  </span>
</template>
