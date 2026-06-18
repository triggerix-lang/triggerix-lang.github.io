import type { LeafToolInput, War3Editor } from 'triggerix-ui-preset-war3'
import type { DemoActionHandler } from '../composables/useDemoRuntime'
import { defineLeafTool } from 'triggerix-ui-preset-war3'
import { defineAction, defineEvent } from './helpers'
import { registerSharedTools } from './shared-tools'
import { registerValueTools } from './shared-values'

const buttonOptions = [
  { value: 'fill_title', label: '填入标题按钮' },
  { value: 'fill_width', label: '填入宽度按钮' },
  { value: 'fill_url', label: '填入网址按钮' }
] satisfies LeafToolInput['options']

const inputOptions = [{ value: 'target', label: '目标输入框' }] satisfies LeafToolInput['options']

export function setup(editor: War3Editor) {
  registerSharedTools(editor)
  registerValueTools(editor)

  editor.registerTool(
    'button_picker',
    defineLeafTool({
      label: '选择按钮',
      input: { type: 'select', options: buttonOptions },
      resolve: (input: string) => input
    })
  )

  editor.registerTool(
    'input_picker',
    defineLeafTool({
      label: '选择输入框',
      input: { type: 'select', options: inputOptions },
      resolve: (input: string) => input
    })
  )

  editor.registerEvent(
    defineEvent({
      id: 'button_click',
      label: '按钮点击',
      template: '${button}被点击',
      slots: {
        button: { label: '按钮', tools: ['button_picker'] }
      }
    })
  )

  editor.registerAction(
    defineAction({
      id: 'set_input_value',
      label: '设置输入框值',
      template: '设置${input}的值为${value}',
      slots: {
        input: { label: '输入框', tools: ['input_picker'] },
        value: { label: '值', tools: ['value_source', 'text_input'] }
      }
    })
  )
}

interface InputController {
  setValue: (target: string, value: string) => void
}

function resolveRefPath(path: string): unknown {
  const parts = path.split('.')
  let cur: unknown = globalThis as unknown
  for (const p of parts) {
    if (cur == null) return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

function resolveValueParam(raw: unknown): string {
  if (raw && typeof raw === 'object' && '$ref' in (raw as Record<string, unknown>)) {
    const ref = (raw as { $ref: unknown }).$ref
    if (typeof ref === 'string') {
      const v = resolveRefPath(ref)
      return v == null ? '' : String(v as string | number)
    }
  }
  return raw == null ? '' : String(raw as string | number)
}

export function createHandlers(controller: InputController): Record<string, DemoActionHandler> {
  return {
    set_input_value: (params) => {
      controller.setValue(String((params?.input as string) ?? ''), resolveValueParam(params?.value))
    }
  }
}

export const handlers: Record<string, DemoActionHandler> = {
  set_input_value: () => {}
}
