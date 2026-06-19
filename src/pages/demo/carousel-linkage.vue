<script setup lang="ts">
import { computed, reactive, ref, useTemplateRef } from 'vue'
import DemoToast from '../../components/DemoToast.vue'
import PlayCarousel from '../../components/playground/PlayCarousel.vue'
import type { TriggerDef } from '../../composables/useDemoRuntime'
import { useDemoRuntime } from '../../composables/useDemoRuntime'
import { useSyncCodePanel } from '../../composables/useSyncCodePanel'
import { createHandlers, setup } from '../../definitions/carousel-linkage'
import { codeFiles } from '../../definitions/code-snippets/carousel-linkage'
import DemoLayout from '../../layouts/DemoLayout.vue'
import TriggerEditor from '../../trigger-ui/components/TriggerEditor.vue'
import TriggerTabs from '../../trigger-ui/components/TriggerTabs.vue'

const toastRef = useTemplateRef<InstanceType<typeof DemoToast>>('toast')
const leftRef = useTemplateRef<InstanceType<typeof PlayCarousel>>('left')
const rightRef = useTemplateRef<InstanceType<typeof PlayCarousel>>('right')

// Live state used to resolve `$ref: carousel.<id>.index` from the
// composite tool. The handler reads from this map; the page keeps it
// up to date via v-model on each carousel.
const indexMap = reactive<Record<string, number>>({
  left_carousel: 0,
  right_carousel: 0
})

// Tracks the latest emitted carousel index so the linkage handler can
// fall back to the just-fired payload (the indexMap is updated on the
// next tick, after emit() returns).
const lastEmittedIndex = ref<unknown>(0)

// Dispatch the linkage target to whichever carousel the trigger picked.
// The trigger decides the direction (e.g. event=right → action=left), so
// the controller must be id-driven, not hard-coded to one side.
function setCarouselIndex(carousel: string, index: number) {
  if (carousel === 'left_carousel') {
    leftRef.value?.setIndex(index)
  } else if (carousel === 'right_carousel') {
    rightRef.value?.setIndex(index)
  }
  const side = carousel.startsWith('left')
    ? 'left'
    : carousel.startsWith('right')
      ? 'right'
      : carousel
  toastRef.value?.push(`linkage → ${side} [${index}]`, 'success', 1400)
}

const handlers = createHandlers(
  {
    setIndex: setCarouselIndex
  },
  { indexMap, lastEmittedIndex }
)

const triggerDefs: TriggerDef[] = [
  {
    id: 'linkage-trigger',
    name: '左右联动',
    initialState: {
      event: {
        id: 'carousel_switch',
        slotValues: {
          carousel: { tool: 'carousel_picker', value: 'left_carousel', subSlots: undefined }
        }
      },
      actions: [
        {
          id: 'set_carousel_index',
          slotValues: {
            carousel: { tool: 'carousel_picker', value: 'right_carousel', subSlots: undefined },
            index: {
              tool: 'carousel_index_ref',
              value: undefined,
              subSlots: {
                carousel: { tool: 'carousel_picker', value: 'left_carousel', subSlots: undefined }
              }
            }
          }
        }
      ]
    }
  }
]

const { triggers, triggersJson, emit } = useDemoRuntime({
  setup,
  handlers,
  triggers: triggerDefs
})

const activeTab = ref(0)
const activeTrigger = computed(() => triggers[activeTab.value])

const leftSlides = ['L · 起 / origin', 'L · 承 / build', 'L · 转 / pivot', 'L · 合 / close']
const rightSlides = ['R · 起 / origin', 'R · 承 / build', 'R · 转 / pivot', 'R · 合 / close']
const leftIndex = ref(0)
const rightIndex = ref(0)

function syncLeft(v: number) {
  leftIndex.value = v
  indexMap.left_carousel = v
}
function syncRight(v: number) {
  rightIndex.value = v
  indexMap.right_carousel = v
}

useSyncCodePanel(codeFiles, triggersJson)

function onTrigger(eventType: string, payload: Record<string, unknown>) {
  if (eventType === 'carousel_change') {
    const source = String(payload.source ?? '')
    if (source && source in indexMap) {
      indexMap[source] = Number(payload.index ?? 0)
    }
    lastEmittedIndex.value = payload.index
    emit('carousel_switch', { ...payload, carousel: source })
    return
  }
  emit(eventType, payload)
}
</script>

<template>
  <DemoLayout title="轮播联动 · Linkage">
    <template #playground>
      <div class="flex flex-col gap-6">
        <div class="rounded-md border border-#1f2735 bg-#0c0e14/60 p-4">
          <div
            class="mb-3 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-#7a8599"
          >
            <span class="text-#9d7cd8">▍master</span>
            <span class="text-#3d4f6a">→</span>
            <span class="text-#f0707c">▍slave</span>
          </div>
          <div class="grid gap-5 lg:grid-cols-2">
            <div>
              <div class="mb-2 font-mono text-[10.5px] uppercase tracking-widest text-#7a8599">
                left · driver
              </div>
              <PlayCarousel
                id="left_carousel"
                ref="left"
                :model-value="leftIndex"
                :items="leftSlides"
                @update:model-value="syncLeft"
                @trigger="onTrigger"
              />
            </div>
            <div>
              <div class="mb-2 font-mono text-[10.5px] uppercase tracking-widest text-#7a8599">
                right · follower
              </div>
              <PlayCarousel
                id="right_carousel"
                ref="right"
                :model-value="rightIndex"
                :items="rightSlides"
                @update:model-value="syncRight"
                @trigger="onTrigger"
              />
            </div>
          </div>
        </div>

        <div
          class="rounded-md border border-dashed border-#1f2735 bg-#0a0c11 p-4 font-mono text-xs leading-relaxed text-#7a8599"
        >
          <span class="text-#5fb3a1">// hint</span>
          <br />
          切换「左轮播」→ 触发器读取 <span class="text-#c9a84c">carousel_index_ref</span> 复合工具 →
          解析为 <span class="text-#c9a84c">$ref: carousel.left_carousel.index</span> →
          调用「右轮播」的 setIndex。
          <br />
          这是首个使用 composite tool 的 demo，可在编辑器里点击 index 槽位查看子槽位填充流程。
        </div>
      </div>
    </template>

    <template #editor>
      <div class="flex flex-col gap-3">
        <TriggerTabs :tabs="triggers" v-model:active="activeTab" />
        <TriggerEditor
          :key="activeTrigger.id"
          :editor="activeTrigger.editor"
          :state="activeTrigger.state.value"
        />
      </div>
    </template>
  </DemoLayout>

  <DemoToast ref="toast" />
</template>
