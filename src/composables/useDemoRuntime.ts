import type { ActionHandler } from '@triggerix/runtime'
import type { War3Editor, War3EditorState } from 'triggerix-editor-preset-war3'
import { createRuntime } from '@triggerix/runtime'
import { useEditor } from 'triggerix-editor-vue'
import { createWar3Editor } from 'triggerix-editor-preset-war3'
import { computed, type Ref, shallowRef, watch } from 'vue'

export type DemoActionHandler = ActionHandler

export interface TriggerDef {
  id: string
  name: string
  initialState: Partial<War3EditorState>
}

export interface DemoRuntimeOptions {
  setup: (editor: War3Editor) => void
  handlers: Record<string, DemoActionHandler>
  triggers: TriggerDef[]
}

export interface TriggerInstance {
  id: string
  name: string
  editor: War3Editor
  state: Ref<War3EditorState>
}

interface InternalTrigger extends TriggerInstance {
  toTrigger: (id?: string) => unknown
}

export function useDemoRuntime(options: DemoRuntimeOptions) {
  // 1. Create runtime
  const runtime = createRuntime()

  // 2. Create one War3Editor per trigger; apply shared setup and per-trigger initial state.
  const triggers: InternalTrigger[] = options.triggers.map((def) => {
    const editor = createWar3Editor()
    options.setup(editor)
    // Use `useEditor` for its provide/dispose side-effects, but ignore its
    // `state` ref — that ref only calls `triggerRef` without reassigning
    // `.value`, so it always exposes the same object reference and breaks
    // prop-based reactivity in child components.
    const { toTrigger } = useEditor(editor)

    // Maintain our own shallowRef whose `.value` is reassigned to the latest
    // state object on every mutation. The state manager performs immutable
    // updates, so each `getState()` call returns a fresh reference, which
    // correctly invalidates downstream `props.state` consumers.
    const state = shallowRef<War3EditorState>(editor.getState())
    editor.onChange(() => {
      state.value = editor.getState()
    })

    // Apply initial state immediately (synchronously) so the first
    // computed/watch evaluation already sees the populated trigger.
    applyInitialState(editor, def.initialState)

    return {
      id: def.id,
      name: def.name,
      editor,
      state,
      toTrigger
    }
  })

  // 3. Register events (from any editor — they all share the same preset)
  //    and action handlers with the runtime.
  if (triggers.length > 0) {
    for (const evt of triggers[0].editor.getAvailableEvents()) {
      const id = (evt as unknown as { id: string }).id
      runtime.registerEvent(id)
    }
  }
  for (const [type, handler] of Object.entries(options.handlers)) {
    runtime.registerAction(type, handler)
  }

  // 4. Reactive triggers JSON used by the JsonDrawer.
  //    Touch each `state.value` so the computed re-runs whenever any editor
  // state changes (state is a shallowRef + triggerRef internally).
  const triggersJson = computed(() => {
    return triggers
      .map((t) => {
        void t.state.value
        return t.toTrigger(t.id)
      })
      .filter((trigger): trigger is NonNullable<typeof trigger> => trigger != null)
  })

  // 5. Sync all triggers into runtime by replacing the trigger set.
  function syncTriggers() {
    for (const trigger of runtime.listTriggers()) {
      runtime.removeTrigger(trigger.id)
    }
    for (const t of triggers) {
      const trigger = t.toTrigger(t.id) as Record<string, unknown> | null | undefined
      if (trigger) {
        // The runtime only matches by event type — it doesn't filter by
        // event.payload.  We inject conditions so that triggers are only triggered
        // when the payload's `source` field matches the selected component id.
        injectSourceCondition(trigger)
        runtime.addTrigger(trigger as unknown as Parameters<typeof runtime.addTrigger>[0])
      }
    }
  }

  /**
   * Convert the first string-valued event payload field into a runtime
   * condition that checks `payload.source === value`.  This bridges the gap
   * between the editor's event payload and the playground's payload shape.
   *
   * Mutates `trigger.conditions` (a flat `ConditionItem[]`) by appending the
   * source condition. Multiple events may carry payload — we inject one
   * condition per event so each is bound to its own source value.
   */
  function injectSourceCondition(trigger: Record<string, unknown>) {
    const events =
      (trigger.events as Array<{ payload?: Record<string, unknown> }> | undefined) ?? []
    const newConditions: unknown[] = []

    for (const event of events) {
      const payload = event?.payload
      if (!payload) continue
      const sourceValue = Object.values(payload).find((v) => typeof v === 'string')
      if (sourceValue === undefined) continue

      newConditions.push({
        left: { $ref: 'source' },
        operator: 'eq',
        right: sourceValue
      })
    }

    if (newConditions.length === 0) return

    const existing = Array.isArray(trigger.conditions) ? (trigger.conditions as unknown[]) : []
    trigger.conditions = [...existing, ...newConditions]
  }

  // Watch each trigger's state independently.
  for (const t of triggers) {
    watch(t.state, syncTriggers)
  }
  // Initial sync after all triggers have applied their initial state.
  syncTriggers()

  // 6. Expose emit() so playgrounds can fire events at the runtime.
  //    The runtime's signature is `emit(type, source?, payload?)`. Playgrounds
  //    call this wrapper as `emit(type, payload)` where `payload` typically
  //    carries a `source` field — pull it out so the runtime can match events
  //    by source as designed.
  function emit(eventType: string, payload?: Record<string, unknown>) {
    if (!payload) {
      return runtime.emit(eventType)
    }
    const { source, ...rest } = payload
    return runtime.emit(eventType, typeof source === 'string' ? source : undefined, rest)
  }

  // Cast to the public TriggerInstance[] (hides toTrigger).
  const publicTriggers: TriggerInstance[] = triggers

  return {
    triggers: publicTriggers,
    triggersJson,
    runtime,
    emit
  }
}

function applyInitialState(editor: War3Editor, initial: Partial<War3EditorState>) {
  if (initial.events && initial.events.length > 0) {
    // Single-event UI helper: take the first event for `setEvent` semantics.
    // Multi-event initial states are also supported via `addEvent` for subsequent items.
    const [first, ...rest] = initial.events
    if (first) {
      editor.setEvent(first.id)
      for (const [key, entry] of Object.entries(first.slotValues ?? {})) {
        editor.setEventSlot(key, entry)
      }
    }
    for (const ev of rest) {
      const index = editor.addEvent(ev.id)
      for (const [key, entry] of Object.entries(ev.slotValues ?? {})) {
        editor.setEventSlotAt(index, key, entry)
      }
    }
  }
  if (initial.conditions) {
    initial.conditions.forEach((cond, index) => {
      editor.addCondition(cond.id)
      for (const [key, entry] of Object.entries(cond.slotValues ?? {})) {
        editor.setConditionSlot(index, key, entry)
      }
    })
  }
  if (initial.actions) {
    initial.actions.forEach((action, index) => {
      editor.addAction(action.id)
      for (const [key, entry] of Object.entries(action.slotValues ?? {})) {
        editor.setActionSlot(index, key, entry)
      }
    })
  }
}
