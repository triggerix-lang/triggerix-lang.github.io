import type { LeafToolInput, War3Editor } from 'triggerix-ui-preset-war3'
import type { DemoActionHandler } from '../composables/useDemoRuntime'
import { defineLeafTool } from 'triggerix-ui-preset-war3'
import { defineAction, defineEvent } from './helpers'
import { registerSharedTools } from './shared-tools'

const buttonOptions = [
  { value: 'confirm_btn', label: '确认按钮' },
  { value: 'cancel_btn', label: '取消按钮' }
] satisfies LeafToolInput['options']

export function setup(editor: War3Editor) {
  registerSharedTools(editor)

  editor.registerTool(
    'button_picker',
    defineLeafTool({
      label: '选择按钮',
      input: { type: 'select', options: buttonOptions },
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
      id: 'show_message',
      label: '显示消息',
      template: '显示消息${message}',
      slots: {
        message: { label: '消息', tools: ['text_input'] }
      }
    })
  )
}

export const handlers: Record<string, DemoActionHandler> = {
  show_message: (params) => {
    const message = String((params?.message as string) ?? '')
    window.alert(message || '（空消息）')
  }
}
