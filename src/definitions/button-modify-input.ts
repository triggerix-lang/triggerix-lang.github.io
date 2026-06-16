import type { LeafToolInput, War3Editor } from 'triggerix-ui-preset-war3'
import type { DemoActionHandler } from '../composables/useDemoRuntime'
import { defineAction, defineEvent } from './helpers'
import { registerSharedTools } from './shared-tools'
import { registerValueTools } from './shared-values'

const buttonOptions = [
  { value: 'fill_title', label: '填入标题按钮' },
  { value: 'fill_url', label: '填入网址按钮' }
] satisfies LeafToolInput['options']

const inputOptions = [{ value: 'target', label: '目标输入框' }] satisfies LeafToolInput['options']

export function setup(editor: War3Editor) {
  registerSharedTools(editor)
  registerValueTools(editor)

  editor.registerTool('button_picker', {
    label: '选择按钮',
    type: 'leaf',
    input: { type: 'select', options: buttonOptions },
    resolve: (input: unknown) => input
  })

  editor.registerTool('input_picker', {
    label: '选择输入框',
    type: 'leaf',
    input: { type: 'select', options: inputOptions },
    resolve: (input: unknown) => input
  })

  editor.registerEvent(
    defineEvent({
      type: 'button_click',
      template: '${button}被点击',
      slots: {
        button: { label: '按钮', tools: ['button_picker'] }
      }
    })
  )

  editor.registerAction(
    defineAction({
      type: 'set_input_value',
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

export function createHandlers(controller: InputController): Record<string, DemoActionHandler> {
  return {
    set_input_value: (params) => {
      controller.setValue(String(params?.input ?? ''), String(params?.value ?? ''))
    }
  }
}

export const handlers: Record<string, DemoActionHandler> = {
  set_input_value: () => {}
}
