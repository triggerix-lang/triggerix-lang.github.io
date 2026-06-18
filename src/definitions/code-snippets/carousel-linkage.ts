import type { CodeFile } from './types'

export const codeFiles: CodeFile[] = [
  {
    filename: 'setup.ts',
    content: `import type { War3Editor } from 'triggerix-ui-preset-war3'
import { defineCompositeTool, defineLeafTool } from 'triggerix-ui-preset-war3'

const carouselOptions = [
  { value: 'left_carousel', label: '左侧轮播' },
  { value: 'right_carousel', label: '右侧轮播' }
]

export function setup(editor: War3Editor) {
  registerSharedTools(editor)

  editor.registerTool('carousel_picker', defineLeafTool({
    label: '选择轮播',
    input: { type: 'select', options: carouselOptions },
    resolve: (input: string) => input
  }))

  // 关键：composite 工具 —— 它本身有子槽位，
  // resolve 时把子槽位的值组装成一个 $ref 表达式。
  editor.registerTool('carousel_index_ref', defineCompositeTool({
    label: '轮播组件的当前索引',
    template: '\${carousel}当前的索引值',
    slots: {
      carousel: { label: '轮播组件', tools: ['carousel_picker'] }
    },
    resolve: (slotValues: { carousel: string }) => ({
      $ref: \`carousel.\${slotValues.carousel ?? ''}.index\`
    })
  }))

  editor.registerEvent({
    id: 'carousel_switch',
    label: '轮播组件切换',
    template: '\${carousel}切换',
    slots: {
      carousel: { label: '轮播', tools: ['carousel_picker'] }
    }
  })

  // 动作：把目标轮播切到指定 index。
  // index 槽位允许填一个数字，或填 carousel_index_ref 实现联动。
  editor.registerAction({
    id: 'set_carousel_index',
    template: '设置\${carousel}切换到第\${index}张',
    slots: {
      carousel: { label: '轮播', tools: ['carousel_picker'] },
      index: { label: '索引', tools: ['number_input', 'carousel_index_ref'] }
    }
  })
}
`
  },
  {
    filename: 'handlers.ts',
    content: `import type { DemoActionHandler } from '../composables/useDemoRuntime'

interface LinkageController {
  setIndex: (carousel: string, index: number) => void
}

// 解析形如 \`carousel.left_carousel.index\` 的 $ref：
// 1. 优先去 indexMap 里读最新的页面状态
// 2. 失败则回退到刚刚 emit 的 payload.index（响应式还没刷新时用）
function resolveIndexParam(
  raw: unknown,
  indexMap: Record<string, number>,
  fallback: unknown
): number {
  if (raw && typeof raw === 'object' && '$ref' in (raw as Record<string, unknown>)) {
    const ref = (raw as { $ref: unknown }).$ref
    if (typeof ref === 'string') {
      const [, id, key] = ref.split('.')
      if (key === 'index' && id in indexMap) return indexMap[id]
      const fb = Number(fallback ?? 0)
      return Number.isFinite(fb) ? fb : 0
    }
  }
  const n = Number(raw ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function createHandlers(
  controller: LinkageController,
  ctx: { indexMap: Record<string, number>; lastEmittedIndex: { value: unknown } }
): Record<string, DemoActionHandler> {
  return {
    set_carousel_index: (params) => {
      const carousel = String((params?.carousel as string) ?? '')
      const index = resolveIndexParam(params?.index, ctx.indexMap, ctx.lastEmittedIndex.value)
      controller.setIndex(carousel, index)
    }
  }
}
`
  },
  {
    filename: 'Demo.vue',
    content: `<script setup lang="ts">
import { reactive, ref, useTemplateRef } from 'vue'
import { useDemoRuntime } from '../composables/useDemoRuntime'
import { createHandlers, setup } from '../definitions/carousel-linkage'

// indexMap：页面把每个轮播的当前索引同步到这里，
// handler 里解析 $ref: carousel.<id>.index 时直接读它。
const indexMap = reactive<Record<string, number>>({
  left_carousel: 0,
  right_carousel: 0
})
const lastEmittedIndex = ref<unknown>(0)

// 为每个轮播组件准备一个 ref，供 handler 按 id 调度。
const leftRef = useTemplateRef<{ setIndex: (n: number) => void }>('left')
const rightRef = useTemplateRef<{ setIndex: (n: number) => void }>('right')

// controller 必须 id-driven，不能写死某一侧：
// 用户在编辑器里改完事件源 / 动作目标的方向后，handler 会按实际传来的 id 派发。
const handlers = createHandlers(
  {
    setIndex: (carousel, index) => {
      if (carousel === 'left_carousel') leftRef.value?.setIndex(index)
      else if (carousel === 'right_carousel') rightRef.value?.setIndex(index)
    }
  },
  { indexMap, lastEmittedIndex }
)

const { emit } = useDemoRuntime({ setup, handlers, triggers: triggerDefs })

function onTrigger(eventType: string, payload: Record<string, unknown>) {
  if (eventType === 'carousel_change') {
    const source = String(payload.source ?? '')
    if (source in indexMap) indexMap[source] = Number(payload.index ?? 0)
    lastEmittedIndex.value = payload.index
    emit('carousel_switch', { ...payload, carousel: source })
    return
  }
  emit(eventType, payload)
}
</script>
`
  }
]
