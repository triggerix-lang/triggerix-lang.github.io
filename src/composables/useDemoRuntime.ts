import type { ActionHandler, TriggerixRuntime } from '@triggerix/runtime'
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

  // 2. Create one War3Editor per trigger; apply shared setup and per-trigger
  //    initial state. Delegate subscribe / dispose / provide entirely to
  //    useEditor by passing in our own shallowRef so the consumer can keep a
  //    stable reference to the same reactive state.
  const triggers: InternalTrigger[] = options.triggers.map((def) => {
    const editor = createWar3Editor()
    options.setup(editor)

    const state = shallowRef<War3EditorState>(editor.getState())
    const { toTrigger } = useEditor(editor, { state })

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
  //    state changes (state is a shallowRef + triggerRef internally).
  const triggersJson = computed(() => {
    return triggers
      .map((t) => {
        void t.state.value
        return t.toTrigger(t.id)
      })
      .filter((trigger): trigger is NonNullable<typeof trigger> => trigger != null)
  })

  // 5. Sync all triggers into runtime by replacing the trigger set.
  //    No injectSourceCondition workaround needed — the war3 serializer now
  //    populates event.source from the event def's sourceSlot field, so the
  //    runtime's source-matching filter works out of the box.
  function syncTriggers() {
    for (const trigger of runtime.listTriggers()) {
      runtime.removeTrigger(trigger.id)
    }
    for (const t of triggers) {
      const trigger = t.toTrigger(t.id) as Record<string, unknown> | null | undefined
      if (trigger) {
        runtime.addTrigger(trigger as unknown as Parameters<typeof runtime.addTrigger>[0])
      }
    }
  }

  // Watch each trigger's state independently.
  for (const t of triggers) {
    // useEditor already subscribes to editor.onChange; watching the shared
    // shallowRef gives us a single point of reactivity for JSON sync.
    watch(t.state, syncTriggers)
  }
  // Initial sync after all triggers have applied their initial state.
  syncTriggers()

  return {
    triggers: triggers as TriggerInstance[],
    triggersJson,
    runtime: runtime as TriggerixRuntime,
    /**
     * Forward event emission to the runtime's native 3-arg signature
     * `(type, source?, payload?)`. The runtime filters triggers by
     * `event.source` (set by the war3 serializer from the event def's
     * sourceSlot), so passing the component id here is enough to disambiguate
     * which trigger should fire.
     */
    emit: runtime.emit.bind(runtime)
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
