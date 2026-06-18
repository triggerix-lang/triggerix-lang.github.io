import type { LeafToolInput, War3Editor } from 'triggerix-ui-preset-war3'
import type { DemoActionHandler } from '../composables/useDemoRuntime'
import { defineCompositeTool, defineLeafTool } from 'triggerix-ui-preset-war3'
import { defineAction, defineEvent } from './helpers'
import { registerSharedTools } from './shared-tools'

const carouselOptions = [
  { value: 'left_carousel', label: '左侧轮播' },
  { value: 'right_carousel', label: '右侧轮播' }
] satisfies LeafToolInput['options']

export function setup(editor: War3Editor) {
  registerSharedTools(editor)

  editor.registerTool(
    'carousel_picker',
    defineLeafTool({
      label: '选择轮播',
      input: { type: 'select', options: carouselOptions },
      resolve: (input: string) => input
    })
  )

  editor.registerTool(
    'carousel_index_ref',
    defineCompositeTool({
      label: '轮播组件的当前索引',
      template: '${carousel}当前的索引值',
      slots: {
        carousel: { label: '轮播组件', tools: ['carousel_picker'] }
      },
      resolve: (slotValues: { carousel: string }) => ({
        $ref: `carousel.${slotValues.carousel ?? ''}.index`
      })
    })
  )

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
      id: 'set_carousel_index',
      label: '设置轮播索引',
      template: '设置${carousel}切换到第${index}张',
      slots: {
        carousel: { label: '轮播', tools: ['carousel_picker'] },
        index: { label: '索引', tools: ['number_input', 'carousel_index_ref'] }
      }
    })
  )
}

interface LinkageController {
  setIndex: (carousel: string, index: number) => void
}

/**
 * Resolve a `$ref` like `carousel.left_carousel.index` against the live
 * carousel index map provided by the page.
 */
function resolveIndexParam(
  raw: unknown,
  indexMap: Record<string, number>,
  fallbackPayloadIndex: unknown
): number {
  if (raw && typeof raw === 'object' && '$ref' in (raw as Record<string, unknown>)) {
    const ref = (raw as { $ref: unknown }).$ref
    if (typeof ref === 'string') {
      const parts = ref.split('.')
      // carousel.<id>.index
      if (parts.length >= 3 && parts[0] === 'carousel' && parts[2] === 'index') {
        const id = parts[1]
        if (id in indexMap) return indexMap[id]
      }
      // Fallback to the just-emitted payload index when the live map is unaware.
      const fb = Number(fallbackPayloadIndex ?? 0)
      return Number.isFinite(fb) ? fb : 0
    }
  }
  const n = Number(raw ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function createHandlers(
  controller: LinkageController,
  context: { indexMap: Record<string, number>; lastEmittedIndex: { value: unknown } }
): Record<string, DemoActionHandler> {
  return {
    set_carousel_index: (params) => {
      const carousel = String((params?.carousel as string) ?? '')
      const index = resolveIndexParam(
        params?.index,
        context.indexMap,
        context.lastEmittedIndex.value
      )
      controller.setIndex(carousel, index)
    }
  }
}

export const handlers: Record<string, DemoActionHandler> = {
  set_carousel_index: () => {}
}
