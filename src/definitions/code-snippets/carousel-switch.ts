import type { CodeFile } from './types'

export const codeFiles: CodeFile[] = [
  {
    filename: 'setup.ts',
    content: `import type { War3Editor } from 'triggerix-ui-preset-war3'

const carouselOptions = [{ value: 'main_carousel', label: '主轮播' }]
const colorOptions = [
  { value: '#1a1a1a', label: '深灰' },
  { value: '#1e3a8a', label: '深蓝' },
  { value: '#5fb3a1', label: '青绿' }
  // ...更多颜色
]

export function setup(editor: War3Editor) {
  registerSharedTools(editor)

  editor.registerTool('carousel_picker', {
    label: '选择轮播',
    type: 'leaf',
    input: { type: 'select', options: carouselOptions },
    resolve: (input) => input
  })
  editor.registerTool('color_picker', {
    label: '选择颜色',
    type: 'leaf',
    input: { type: 'select', options: colorOptions },
    resolve: (input) => input
  })

  // 事件：轮播切换
  editor.registerEvent({
    type: 'carousel_switch',
    label: '轮播组件切换',
    template: '\${carousel}切换',
    slots: {
      carousel: { label: '轮播', tools: ['carousel_picker'] }
    }
  })

  // 同一事件可以挂多条规则，分别派发不同动作
  editor.registerAction({
    type: 'show_message',
    template: '显示消息\${message}',
    slots: { message: { label: '消息', tools: ['text_input'] } }
  })
  editor.registerAction({
    type: 'change_bg_color',
    template: '更改背景色为\${color}',
    slots: { color: { label: '颜色', tools: ['color_picker'] } }
  })
}
`
  },
  {
    filename: 'handlers.ts',
    content: `import type { DemoActionHandler } from '../composables/useDemoRuntime'

interface CarouselController {
  setBackground: (color: string) => void
}

export function createHandlers(controller: CarouselController): Record<string, DemoActionHandler> {
  return {
    show_message: (params) => {
      toast.push(String((params?.message as string) ?? ''), 'success')
    },
    change_bg_color: (params) => {
      controller.setBackground(String((params?.color as string) ?? ''))
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
import { createHandlers, setup } from '../definitions/carousel-switch'

const bgColor = ref('#0c0e14')

const handlers = createHandlers({
  setBackground: (color) => { bgColor.value = color || '#0c0e14' }
})

const { emit } = useDemoRuntime({ setup, handlers, triggers: triggerDefs })

// PlayCarousel 抛的是 carousel_change，这里翻译成 carousel_switch
function onTrigger(eventType: string, payload: Record<string, unknown>) {
  if (eventType === 'carousel_change') {
    emit('carousel_switch', { ...payload, carousel: payload.source })
    return
  }
  emit(eventType, payload)
}
</script>
`
  }
]
