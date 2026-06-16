<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import DemoToast from '../../components/DemoToast.vue'
import PlayCarousel from '../../components/playground/PlayCarousel.vue'
import { useDemoRuntime } from '../../composables/useDemoRuntime'
import { createHandlers, setup } from '../../definitions/carousel-switch'
import DemoLayout from '../../layouts/DemoLayout.vue'
import TriggerEditor from '../../trigger-ui/components/TriggerEditor.vue'

const toastRef = useTemplateRef<InstanceType<typeof DemoToast>>('toast')

const bgColor = ref('#0c0e14')

const handlers = createHandlers({
  setBackground: (color) => {
    bgColor.value = color || '#0c0e14'
    toastRef.value?.push(`bg → ${color}`, 'warn', 1600)
  }
})

// Override show_message so it surfaces via toast instead of window.alert.
handlers.show_message = (params) => {
  toastRef.value?.push(String(params?.message ?? ''), 'success')
}

const { war3Editor, state, ruleJson, emit } = useDemoRuntime({ setup, handlers })

const slides = ['⚔  第 1 张  起手式', '🔥  第 2 张  推进中', '🏁  第 3 张  最后一张']
const currentIndex = ref(0)

onMounted(() => {
  // Predefined: switch to last (index = 2) → toast "最后一张了!" + dark red bg
  war3Editor.setEvent('carousel_switch')
  war3Editor.setEventSlot('carousel', {
    tool: 'carousel_picker',
    value: 'main',
    subSlots: undefined
  })
  war3Editor.setEventSlot('index', {
    tool: 'number_input',
    value: 2,
    subSlots: undefined
  })
  war3Editor.addAction('show_message')
  war3Editor.setActionSlot(0, 'message', {
    tool: 'text_input',
    value: '最后一张了!',
    subSlots: undefined
  })
  war3Editor.addAction('change_bg_color')
  war3Editor.setActionSlot(1, 'color', {
    tool: 'color_picker',
    value: '#7f1d1d',
    subSlots: undefined
  })
})

function onTrigger(eventType: string, payload: Record<string, unknown>) {
  // PlayCarousel emits "carousel_change", but the registered event is "carousel_switch".
  if (eventType === 'carousel_change') {
    emit('carousel_switch', { ...payload, carousel: payload.source })
    return
  }
  emit(eventType, payload)
}
</script>

<template>
  <DemoLayout title="轮播切换 · Carousel Switch" :rule-json="ruleJson">
    <template #playground>
      <div class="flex flex-col gap-6">
        <div
          class="rounded-md border border-#1f2735 p-6 transition-colors duration-300"
          :style="{ backgroundColor: bgColor }"
        >
          <div class="mb-3 font-mono text-[11px] uppercase tracking-widest text-#7a8599">
            scene · single carousel
          </div>
          <div class="flex justify-center">
            <PlayCarousel id="main" v-model="currentIndex" :items="slides" @trigger="onTrigger" />
          </div>
        </div>

        <div
          class="rounded-md border border-dashed border-#1f2735 bg-#0a0c11 p-4 font-mono text-xs leading-relaxed text-#7a8599"
        >
          <span class="text-#5fb3a1">// hint</span>
          <br />
          切到第 3 张（index=2）→ 同时触发两个动作：弹 Toast + 区域背景变红。
          <br />
          回到 1/2 张 → 规则不命中，背景保持当前色。
        </div>
      </div>
    </template>

    <template #editor>
      <TriggerEditor :editor="war3Editor" :state="state" />
    </template>
  </DemoLayout>

  <DemoToast ref="toast" />
</template>
