import type { LeafToolInput, War3Editor } from 'triggerix-ui-preset-war3'
import type { DemoActionHandler } from '../composables/useDemoRuntime'
import { defineAction, defineEvent } from './helpers'
import { registerSharedTools } from './shared-tools'

const carouselOptions = [
  { value: 'left', label: '左侧轮播' },
  { value: 'right', label: '右侧轮播' }
] satisfies LeafToolInput['options']

export function setup(editor: War3Editor) {
  registerSharedTools(editor)

  editor.registerTool('carousel_picker', {
    label: '选择轮播',
    type: 'leaf',
    input: { type: 'select', options: carouselOptions },
    resolve: (input: unknown) => input
  })

  editor.registerEvent(
    defineEvent({
      type: 'carousel_switch',
      template: '${carousel}切换到第${index}张',
      slots: {
        carousel: { label: '轮播', tools: ['carousel_picker'] },
        index: { label: '索引', tools: ['number_input'] }
      }
    })
  )

  editor.registerAction(
    defineAction({
      type: 'set_carousel_index',
      template: '设置${carousel}切换到第${index}张',
      slots: {
        carousel: { label: '轮播', tools: ['carousel_picker'] },
        index: { label: '索引', tools: ['number_input'] }
      }
    })
  )
}

interface LinkageController {
  setIndex: (carousel: string, index: number) => void
}

export function createHandlers(controller: LinkageController): Record<string, DemoActionHandler> {
  return {
    set_carousel_index: (params) => {
      controller.setIndex(String(params?.carousel ?? ''), Number(params?.index ?? 0))
    }
  }
}

export const handlers: Record<string, DemoActionHandler> = {
  set_carousel_index: () => {}
}
