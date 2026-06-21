import type { LeafToolInput, War3Editor } from 'triggerix-editor-preset-war3'
import type { DemoActionHandler } from '../composables/useDemoRuntime'
import { defineLeafTool } from 'triggerix-editor-preset-war3'
import { defineAction, defineEvent } from './helpers'
import { registerSharedTools } from './shared-tools'

const inputOptions = [
  { value: 'username_input', label: '用户名输入框' },
  { value: 'password_input', label: '密码输入框' }
] satisfies LeafToolInput['options']

export function setup(editor: War3Editor) {
  registerSharedTools(editor)

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
      id: 'input_focus',
      label: '输入框聚焦',
      template: '${input}获得焦点',
      sourceSlot: 'input',
      slots: {
        input: { label: '输入框', tools: ['input_picker'] }
      }
    })
  )

  editor.registerEvent(
    defineEvent({
      id: 'input_blur',
      label: '输入框失焦',
      template: '${input}失去焦点',
      sourceSlot: 'input',
      slots: {
        input: { label: '输入框', tools: ['input_picker'] }
      }
    })
  )

  editor.registerAction(
    defineAction({
      id: 'show_tip',
      label: '显示提示',
      template: '显示提示${message}',
      slots: {
        message: { label: '提示文本', tools: ['text_input'] }
      }
    })
  )

  editor.registerAction(
    defineAction({
      id: 'hide_tip',
      label: '隐藏提示',
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
