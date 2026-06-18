import type { LeafToolInput, War3Editor } from 'triggerix-ui-preset-war3'
import type { DemoActionHandler } from '../composables/useDemoRuntime'
import { defineAction, defineEvent } from './helpers'
import { registerSharedTools } from './shared-tools'

const inputOptions = [
  { value: 'username_input', label: '用户名输入框' },
  { value: 'password_input', label: '密码输入框' }
] satisfies LeafToolInput['options']

export function setup(editor: War3Editor) {
  registerSharedTools(editor)

  editor.registerTool('input_picker', {
    label: '选择输入框',
    type: 'leaf',
    input: { type: 'select', options: inputOptions },
    resolve: (input: unknown) => input
  })

  editor.registerEvent(
    defineEvent({
      id: 'input_focus',
      template: '${input}获得焦点',
      slots: {
        input: { label: '输入框', tools: ['input_picker'] }
      }
    })
  )

  editor.registerEvent(
    defineEvent({
      id: 'input_blur',
      template: '${input}失去焦点',
      slots: {
        input: { label: '输入框', tools: ['input_picker'] }
      }
    })
  )

  editor.registerAction(
    defineAction({
      id: 'show_tip',
      template: '显示提示${message}',
      slots: {
        message: { label: '提示文本', tools: ['text_input'] }
      }
    })
  )

  editor.registerAction(
    defineAction({
      id: 'hide_tip',
      template: '隐藏提示'
    })
  )
}

interface TipController {
  show: (message: string) => void
  hide: () => void
}

export function createHandlers(controller: TipController): Record<string, DemoActionHandler> {
  return {
    show_tip: (params) => {
      controller.show(String((params?.message as string) ?? ''))
    },
    hide_tip: () => {
      controller.hide()
    }
  }
}

// Default no-op handlers; pages will typically build their own with createHandlers.
export const handlers: Record<string, DemoActionHandler> = {
  show_tip: () => {},
  hide_tip: () => {}
}
