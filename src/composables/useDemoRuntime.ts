import type { ActionHandler } from '@triggerix/runtime'
import type { War3Editor, War3EditorState } from 'triggerix-ui-preset-war3'
import { createRuntime } from '@triggerix/runtime'
import { useEditor } from 'triggerix-editor-vue'
import { createWar3Editor } from 'triggerix-ui-preset-war3'
import { computed, watch } from 'vue'

export type DemoActionHandler = ActionHandler

export interface DemoRuntimeOptions {
  setup: (editor: War3Editor) => void
  handlers: Record<string, DemoActionHandler>
  initialState?: Partial<War3EditorState>
}

const DEMO_RULE_ID = 'demo-rule'

export function useDemoRuntime(options: DemoRuntimeOptions) {
  // 1. Create the War3Editor and apply user-provided definitions.
  const war3Editor = createWar3Editor()
  options.setup(war3Editor)

  // 2. Bridge the editor state into Vue reactivity.
  const { state, toRule, reset } = useEditor(war3Editor)

  // 3. Build the runtime and register all known events / handlers.
  // NOTE: published @triggerix/editor types omit `type/label` on event defs;
  // cast through `unknown` so we can still read the runtime field.
  const runtime = createRuntime()
  for (const evt of war3Editor.getAvailableEvents()) {
    const type = (evt as unknown as { type: string }).type
    runtime.registerEvent(type)
  }
  for (const [type, handler] of Object.entries(options.handlers)) {
    runtime.registerAction(type, handler)
  }

  // 4. Reactive rule JSON used by the JsonDrawer.
  const ruleJson = computed(() => toRule(DEMO_RULE_ID))

  // 5. Sync editor state into runtime by replacing the active demo rule.
  function syncRule() {
    for (const rule of runtime.listRules()) {
      runtime.removeRule(rule.id)
    }
    const rule = toRule(DEMO_RULE_ID)
    if (rule) {
      runtime.addRule(rule)
    }
  }

  watch(state, syncRule, { deep: true, immediate: true })

  // 6. Apply the optional initial state via the editor's public API.
  if (options.initialState) {
    applyInitialState(war3Editor, options.initialState)
  }

  // 7. Expose emit() so playgrounds can fire events at the runtime.
  function emit(eventType: string, payload?: Record<string, unknown>) {
    return runtime.emit(eventType, payload)
  }

  return {
    war3Editor,
    state,
    toRule,
    reset,
    ruleJson,
    runtime,
    emit
  }
}

function applyInitialState(editor: War3Editor, initial: Partial<War3EditorState>) {
  if (initial.event) {
    editor.setEvent(initial.event.type)
    for (const [key, entry] of Object.entries(initial.event.slotValues ?? {})) {
      editor.setEventSlot(key, entry)
    }
  }
  if (initial.conditions) {
    initial.conditions.forEach((cond, index) => {
      editor.addCondition(cond.type)
      for (const [key, entry] of Object.entries(cond.slotValues ?? {})) {
        editor.setConditionSlot(index, key, entry)
      }
    })
  }
  if (initial.actions) {
    initial.actions.forEach((action, index) => {
      editor.addAction(action.type)
      for (const [key, entry] of Object.entries(action.slotValues ?? {})) {
        editor.setActionSlot(index, key, entry)
      }
    })
  }
}
