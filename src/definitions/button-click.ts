import type { LeafToolInput, War3Editor } from 'triggerix-ui-preset-war3'
import type { DemoActionHandler } from '../composables/useDemoRuntime'
import { defineAction, defineEvent } from './helpers'
import { registerSharedTools } from './shared-tools'

const buttonOptions = [
  { value: 'confirm_btn', label: '确认按钮' },
  { value: 'cancel_btn', label: '取消按钮' }
] satisfies LeafToolInput['options']

export function setup(editor: War3Editor) {
  registerSharedTools(editor)

  editor.registerTool('button_picker', {
    label: '选择按钮',
    type: 'leaf',
    input: { type: 'select', options: buttonOptions },
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
      type: 'show_message',
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
