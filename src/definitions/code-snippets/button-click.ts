import type { CodeFile } from './types'

export const codeFiles: CodeFile[] = [
  {
    filename: 'setup.ts',
    content: `import type { War3Editor } from 'triggerix-editor-preset-war3'
import { defineLeafTool } from 'triggerix-editor-preset-war3'

const buttonOptions = [
  { value: 'confirm_btn', label: '确认按钮' },
  { value: 'cancel_btn', label: '取消按钮' }
]

export function setup(editor: War3Editor) {
  // 通用工具：text_input / number_input
  registerSharedTools(editor)

  // 业务工具：从下拉里挑一个按钮 ID
  editor.registerTool('button_picker', defineLeafTool({
    label: '选择按钮',
    input: { type: 'select', options: buttonOptions },
    resolve: (input: string) => input
  }))

  // 事件：按钮被点击
  editor.registerEvent({
    id: 'button_click',
    template: '\${button}被点击',
    slots: {
      button: { label: '按钮', tools: ['button_picker'] }
    }
  })

  // 动作：弹出消息
  editor.registerAction({
    id: 'show_message',
    template: '显示消息\${message}',
    slots: {
      message: { label: '消息', tools: ['text_input'] }
    }
  })
}
`
  },
  {
    filename: 'handlers.ts',
    content: `import type { DemoActionHandler } from '../composables/useDemoRuntime'

// 动作类型 → 实际执行函数。
// 这里把触发器里 message 槽位的值直接弹成一个 Toast。
export const handlers: Record<string, DemoActionHandler> = {
  show_message: (params) => {
    const message = String((params?.message as string) ?? '')
    toast.push(message || '（空消息）', 'success')
  }
}
`
  },
  {
    filename: 'Demo.vue',
    content: `<script setup lang="ts">
import { useDemoRuntime } from '../composables/useDemoRuntime'
import { setup } from '../definitions/button-click'
import { handlers } from './handlers'

// triggers 是页面默认带的两条触发器：confirm / cancel。
const { triggers, emit } = useDemoRuntime({ setup, handlers, triggers: triggerDefs })

// 按钮点击 → 抛出 button_click 事件 → 命中触发器 → 执行 show_message。
function onTrigger(eventType: string, payload: Record<string, unknown>) {
  emit(eventType, payload)
}
</script>

<template>
  <PlayButton id="confirm_btn" label="确认" @trigger="onTrigger" />
  <PlayButton id="cancel_btn" label="取消" @trigger="onTrigger" />
</template>
`
  }
]
