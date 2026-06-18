<script setup lang="ts">
import type { SlotValueEntry, ToolDescriptor, War3Editor } from 'triggerix-editor-preset-war3'
import { resolveSlotDisplayText } from 'triggerix-editor-preset-war3'
import { computed } from 'vue'
import type { SlotSegment } from '../composables/useTriggerEditor'

const props = defineProps<{
  segment: SlotSegment
  /**
   * The structured value entry bound to this slot. Provided separately
   * because `Segment` from `triggerix-editor-preset-war3` only carries the
   * primitive `value`, not the full `SlotValueEntry` tree.
   */
  entry?: SlotValueEntry | null
  toolDescriptors?: ToolDescriptor[]
  /**
   * Optional editor instance — when provided, the chip can resolve
   * composite-tool entries into a fully expanded preview using
   * `resolveSlotDisplayText`. Without an editor, the chip falls back to
   * the leaf-only logic driven by `toolDescriptors`.
   */
  editor?: War3Editor | null
}>()

const emit = defineEmits<{
  clickSlot: [segment: SlotSegment]
}>()

const filled = computed(() => {
  if (props.entry?.tool) return true
  const v = props.segment.value
  return v !== null && v !== undefined && v !== ''
})

const displayText = computed<string>(() => {
  const entry = props.entry
  const v = props.segment.value

  // Prefer the registry-aware resolver when we have both an entry and an
  // editor — this correctly renders composite-tool fills (e.g.
  // "玩家 1 的 单位").
  if (entry?.tool && props.editor) {
    return resolveSlotDisplayText(entry, props.editor.getRegistry(), props.segment.label)
  }

  // Without an entry, the segment is unfilled or only carries a primitive
  // `value` — fall back to the legacy logic.
  if (v === null || v === undefined || v === '') return props.segment.label

  // Try to find a matching option label across leaf-select tools. Use a
  // deep-equality check so object-shaped option values (e.g. `{ $ref: ... }`)
  // still resolve when the stored entry value is a freshly constructed
  // literal that is not reference-equal to the registered option.
  if (props.toolDescriptors) {
    for (const d of props.toolDescriptors) {
      if (d.kind !== 'leaf') continue
      if (d.input.type !== 'select') continue
      const opt = d.input.options?.find((o) => optionValueEquals(o.value, v))
      if (opt) return opt.label
    }
  }

  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
})

function optionValueEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

function handleClick() {
  emit('clickSlot', props.segment)
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-baseline mx-0.5 px-0.5 bg-transparent border-0 font-mono text-[0.82rem] cursor-pointer underline decoration-dashed underline-offset-[3px] transition-colors duration-150 outline-none"
    :class="
      filled
        ? 'text-#80cbc4 decoration-#80cbc4/40 hover:decoration-#80cbc4 hover:text-#a8e0d6 decoration-solid'
        : 'text-#4fc3f7 decoration-#4fc3f7/45 hover:decoration-#4fc3f7 hover:text-#7fd5fb'
    "
    @click="handleClick"
  >
    <span v-if="!filled" class="opacity-60">[</span>
    <span>{{ displayText }}</span>
    <span v-if="!filled" class="opacity-60">]</span>
  </button>
</template>
