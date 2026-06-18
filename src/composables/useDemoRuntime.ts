import type { ActionHandler } from '@triggerix/runtime'
import type { War3Editor, War3EditorState } from 'triggerix-ui-preset-war3'
import { createRuntime } from '@triggerix/runtime'
import { useEditor } from 'triggerix-editor-vue'
import { createWar3Editor } from 'triggerix-ui-preset-war3'
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
  toRule: (id?: string) => unknown
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
    const { toRule } = useEditor(editor)

    // Maintain our own shallowRef whose `.value` is reassigned to the latest
    // state object on every mutation. The state manager performs immutable
    // updates, so each `getState()` call returns a fresh reference, which
    // correctly invalidates downstream `props.state` consumers.
    const state = shallowRef<War3EditorState>(editor.getState())
    editor.onChange(() => {
      state.value = editor.getState()
    })

    // Apply initial state immediately (synchronously) so the first
    // computed/watch evaluation already sees the populated rule.
    applyInitialState(editor, def.initialState)

    return {
      id: def.id,
      name: def.name,
      editor,
      state,
      toRule
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

  // 4. Reactive rules JSON used by the JsonDrawer.
  //    Touch each `state.value` so the computed re-runs whenever any editor
  //    state changes (state is a shallowRef + triggerRef internally).
  const rulesJson = computed(() => {
    return triggers
      .map((t) => {
        void t.state.value
        return t.toRule(t.id)
      })
      .filter((rule): rule is NonNullable<typeof rule> => rule != null)
  })

  // 5. Sync all triggers' rules into runtime by replacing the rule set.
  function syncRules() {
    for (const rule of runtime.listRules()) {
      runtime.removeRule(rule.id)
    }
    for (const t of triggers) {
      const rule = t.toRule(t.id) as Record<string, unknown> | null | undefined
      if (rule) {
        // The runtime only matches by event type — it doesn't filter by
        // event.payload.  We inject conditions so that rules are only triggered
        // when the payload's `source` field matches the selected component id.
        injectSourceCondition(rule)
        runtime.addRule(rule as unknown as Parameters<typeof runtime.addRule>[0])
      }
    }
  }

  /**
   * Convert the first string-valued event payload field into a runtime
   * condition that checks `payload.source === value`.  This bridges the gap
   * between the editor's event payload and the playground's payload shape.
   */
  function injectSourceCondition(rule: Record<string, unknown>) {
    const event = rule.event as { payload?: Record<string, unknown> } | undefined
    const payload = event?.payload
    if (!payload) return

    const sourceValue = Object.values(payload).find((v) => typeof v === 'string')
    if (sourceValue === undefined) return

    const condition = {
      left: { $ref: 'source' },
      operator: 'eq',
      right: sourceValue
    }

    if (rule.conditions) {
      const conds = rule.conditions as { type: string; conditions: unknown[] }
      conds.conditions.push(condition)
    } else {
      rule.conditions = { type: 'and', conditions: [condition] }
    }
  }

  // Watch each trigger's state independently.
  for (const t of triggers) {
    watch(t.state, syncRules)
  }
  // Initial sync after all triggers have applied their initial state.
  syncRules()

  // 6. Expose emit() so playgrounds can fire events at the runtime.
  function emit(eventType: string, payload?: Record<string, unknown>) {
    return runtime.emit(eventType, payload)
  }

  // Cast to the public TriggerInstance[] (hides toRule).
  const publicTriggers: TriggerInstance[] = triggers

  return {
    triggers: publicTriggers,
    rulesJson,
    runtime,
    emit
  }
}

function applyInitialState(editor: War3Editor, initial: Partial<War3EditorState>) {
  if (initial.event) {
    editor.setEvent(initial.event.id)
    for (const [key, entry] of Object.entries(initial.event.slotValues ?? {})) {
      editor.setEventSlot(key, entry)
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
