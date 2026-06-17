import type { CodeFile } from './types'

export const codeFiles: CodeFile[] = [
  {
    filename: 'setup.ts',
    content: `import type { War3Editor } from 'triggerix-ui-preset-war3'

const inputOptions = [
  { value: 'username_input', label: '用户名输入框' },
  { value: 'password_input', label: '密码输入框' }
]

export function setup(editor: War3Editor) {
  registerSharedTools(editor)

  // 业务工具：选择一个输入框
  editor.registerTool('input_picker', {
    label: '选择输入框',
    type: 'leaf',
    input: { type: 'select', options: inputOptions },
    resolve: (input) => input
  })

  // 一对事件：focus / blur
  editor.registerEvent({
    type: 'input_focus',
    template: '\${input}获得焦点',
    slots: { input: { label: '输入框', tools: ['input_picker'] } }
  })
  editor.registerEvent({
    type: 'input_blur',
    template: '\${input}失去焦点',
    slots: { input: { label: '输入框', tools: ['input_picker'] } }
  })

  // 一对动作：show_tip 带文本，hide_tip 无槽位
  editor.registerAction({
    type: 'show_tip',
    template: '显示提示\${message}',
    slots: { message: { label: '提示文本', tools: ['text_input'] } }
  })
  editor.registerAction({
    type: 'hide_tip',
    template: '隐藏提示'
  })
}
`
  },
  {
    filename: 'handlers.ts',
    content: `import type { DemoActionHandler } from '../composables/useDemoRuntime'

interface TipController {
  show: (message: string) => void
  hide: () => void
}

// 动作处理函数依赖页面的 tip UI，所以做成工厂：
// 页面把自己的 show / hide 注入进来。
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
`
  },
  {
    filename: 'Demo.vue',
    content: `<script setup lang="ts">
import { ref } from 'vue'
import { useDemoRuntime } from '../composables/useDemoRuntime'
import { createHandlers, setup } from '../definitions/input-focus'

const tipMessage = ref('')
const tipVisible = ref(false)

// 把页面状态注入到 handlers 工厂里
const handlers = createHandlers({
  show: (msg) => {
    tipMessage.value = msg
    tipVisible.value = true
  },
  hide: () => {
    tipVisible.value = false
  }
})

const { emit } = useDemoRuntime({ setup, handlers, triggers: triggerDefs })

// PlayInput 在 focus / blur 时各自抛 input_focus / input_blur
function onTrigger(eventType: string, payload: Record<string, unknown>) {
  emit(eventType, payload)
}
</script>
`
  }
]
