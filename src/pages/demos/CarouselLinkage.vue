<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import DemoToast from '../../components/DemoToast.vue'
import PlayCarousel from '../../components/playground/PlayCarousel.vue'
import { useDemoRuntime } from '../../composables/useDemoRuntime'
import { createHandlers, setup } from '../../definitions/carousel-linkage'
import DemoLayout from '../../layouts/DemoLayout.vue'
import TriggerEditor from '../../trigger-ui/components/TriggerEditor.vue'

const toastRef = useTemplateRef<InstanceType<typeof DemoToast>>('toast')
const rightRef = useTemplateRef<InstanceType<typeof PlayCarousel>>('right')

const handlers = createHandlers({
  setIndex: (carousel, index) => {
    if (carousel === 'right') {
      rightRef.value?.setIndex(index)
      toastRef.value?.push(`linkage → right [${index}]`, 'success', 1400)
    }
  }
})

const { war3Editor, state, ruleJson, emit } = useDemoRuntime({ setup, handlers })

const leftSlides = ['L · 起 / origin', 'L · 承 / build', 'L · 转 / pivot', 'L · 合 / close']
const rightSlides = ['R · 起 / origin', 'R · 承 / build', 'R · 转 / pivot', 'R · 合 / close']
const leftIndex = ref(0)
const rightIndex = ref(0)

onMounted(() => {
  // Predefined: left → index 1 triggers right → index 1.
  // (A single specific transition demonstrates the linkage chain.)
  war3Editor.setEvent('carousel_switch')
  war3Editor.setEventSlot('carousel', {
    tool: 'carousel_picker',
    value: 'left',
    subSlots: undefined
  })
  war3Editor.setEventSlot('index', {
    tool: 'number_input',
    value: 1,
    subSlots: undefined
  })
  war3Editor.addAction('set_carousel_index')
  war3Editor.setActionSlot(0, 'carousel', {
    tool: 'carousel_picker',
    value: 'right',
    subSlots: undefined
  })
  war3Editor.setActionSlot(0, 'index', {
    tool: 'number_input',
    value: 1,
    subSlots: undefined
  })
})

function onTrigger(eventType: string, payload: Record<string, unknown>) {
  if (eventType === 'carousel_change') {
    emit('carousel_switch', { ...payload, carousel: payload.source })
    return
  }
  emit(eventType, payload)
}
</script>

<template>
  <DemoLayout title="轮播联动 · Linkage" :rule-json="ruleJson">
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
                id="left"
                v-model="leftIndex"
                :items="leftSlides"
                @trigger="onTrigger"
              />
            </div>
            <div>
              <div class="mb-2 font-mono text-[10.5px] uppercase tracking-widest text-#7a8599">
                right · follower
              </div>
              <PlayCarousel
                id="right"
                ref="right"
                v-model="rightIndex"
                :items="rightSlides"
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
          切换「左轮播」到第 2 张（index=1）→ 触发器命中 → 调用「右轮播」的 setIndex(1)。
          <br />
          想覆盖更多索引？在编辑器里复制规则、调整 index 或添加多条动作。
        </div>
      </div>
    </template>

    <template #editor>
      <TriggerEditor :editor="war3Editor" :state="state" />
    </template>
  </DemoLayout>

  <DemoToast ref="toast" />
</template>
