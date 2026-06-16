import type { SlotValueEntry, War3Editor } from 'triggerix-ui-preset-war3'

/**
 * Local replacement for the no-longer-exported `resolveSlotDisplayText` from
 * `triggerix-ui-preset-war3`. Walks a `SlotValueEntry` tree using the editor's
 * tool descriptors to render a human-readable label.
 *
 * - Leaf tools: returns the matching select option label, or the primitive
 *   value cast to string.
 * - Composite tools: recursively renders the tool's template segments,
 *   resolving each sub-slot via the corresponding `entry.subSlots[key]`.
 * - Unfilled / unresolvable: falls back to the provided `fallbackLabel`.
 */
export function resolveSlotDisplayText(
  entry: SlotValueEntry | null | undefined,
  editor: War3Editor,
  fallbackLabel: string
): string {
  if (!entry?.tool) return fallbackLabel

  const descriptor = editor.getToolDescriptor(entry.tool, entry.subSlots)
  if (!descriptor) return fallbackLabel

  if (descriptor.type === 'leaf') {
    const v = entry.value
    if (v === null || v === undefined || v === '') return fallbackLabel
    if (descriptor.input.type === 'select' && descriptor.input.options) {
      const opt = descriptor.input.options.find((o) => optionValueEquals(o.value, v))
      if (opt) return opt.label
    }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      return String(v)
    }
    try {
      return JSON.stringify(v)
    } catch {
      return Object.prototype.toString.call(v)
    }
  }

  // composite
  return descriptor.segments
    .map((seg) => {
      if (seg.type === 'text') return seg.content
      const subEntry = entry.subSlots?.[seg.key] ?? null
      return resolveSlotDisplayText(subEntry, editor, seg.label)
    })
    .join('')
}

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
