import type { LeafToolInput, War3Editor } from 'triggerix-ui-preset-war3'
import type { DemoActionHandler } from '../composables/useDemoRuntime'
import { defineAction, defineEvent } from './helpers'
import { registerSharedTools } from './shared-tools'

const carouselOptions = [
  { value: 'main_carousel', label: '主轮播' }
] satisfies LeafToolInput['options']

const colorOptions = [
  { value: '#1a1a1a', label: '深灰' },
  { value: '#1e3a8a', label: '深蓝' },
  { value: '#7f1d1d', label: '深红' },
  { value: '#064e3b', label: '深绿' },
  { value: '#5fb3a1', label: '青绿' }
] satisfies LeafToolInput['options']

export function setup(editor: War3Editor) {
  registerSharedTools(editor)

  editor.registerTool('carousel_picker', {
    label: '选择轮播',
    type: 'leaf',
    input: { type: 'select', options: carouselOptions },
    resolve: (input: unknown) => input
  })

  editor.registerTool('color_picker', {
    label: '选择颜色',
    type: 'leaf',
    input: { type: 'select', options: colorOptions },
    resolve: (input: unknown) => input
  })

  editor.registerEvent(
    defineEvent({
      id: 'carousel_switch',
      label: '轮播组件切换',
      template: '${carousel}切换',
      slots: {
        carousel: { label: '轮播', tools: ['carousel_picker'] }
      }
    })
  )

  editor.registerAction(
    defineAction({
      id: 'show_message',
      template: '显示消息${message}',
      slots: {
        message: { label: '消息', tools: ['text_input'] }
      }
    })
  )

  editor.registerAction(
    defineAction({
      id: 'change_bg_color',
      template: '更改背景色为${color}',
      slots: {
        color: { label: '颜色', tools: ['color_picker'] }
      }
    })
  )
}

interface CarouselController {
  setBackground: (color: string) => void
}

export function createHandlers(controller: CarouselController): Record<string, DemoActionHandler> {
  return {
    show_message: (params) => {
      window.alert(String((params?.message as string) ?? ''))
    },
    change_bg_color: (params) => {
      controller.setBackground(String((params?.color as string) ?? ''))
    }
  }
}

export const handlers: Record<string, DemoActionHandler> = {
  show_message: () => {},
  change_bg_color: () => {}
}
