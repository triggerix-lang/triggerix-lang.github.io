<script setup lang="ts">
import { computed, ref, useTemplateRef, watchEffect } from 'vue'
import DemoToast from '../../components/DemoToast.vue'
import PlayCarousel from '../../components/playground/PlayCarousel.vue'
import type { TriggerDef } from '../../composables/useDemoRuntime'
import { useDemoRuntime } from '../../composables/useDemoRuntime'
import { useCodePanel } from '../../composables/useCodePanel'
import { createHandlers, setup } from '../../definitions/carousel-switch'
import { codeFiles } from '../../definitions/code-snippets/carousel-switch'
import DemoLayout from '../../layouts/DemoLayout.vue'
import TriggerEditor from '../../trigger-ui/components/TriggerEditor.vue'
import TriggerTabs from '../../trigger-ui/components/TriggerTabs.vue'

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
  toastRef.value?.push(String((params?.message as string) ?? ''), 'success')
}

const triggerDefs: TriggerDef[] = [
  {
    id: 'switch-message-trigger',
    name: '切换消息',
    initialState: {
      event: {
        type: 'carousel_switch',
        slotValues: {
          carousel: { tool: 'carousel_picker', value: 'main_carousel', subSlots: undefined }
        }
      },
      actions: [
        {
          type: 'show_message',
          slotValues: {
            message: { tool: 'text_input', value: '轮播已切换', subSlots: undefined }
          }
        }
      ]
    }
  },
  {
    id: 'switch-color-trigger',
    name: '切换变色',
    initialState: {
      event: {
        type: 'carousel_switch',
        slotValues: {
          carousel: { tool: 'carousel_picker', value: 'main_carousel', subSlots: undefined }
        }
      },
      actions: [
        {
          type: 'change_bg_color',
          slotValues: {
            color: { tool: 'color_picker', value: '#5fb3a1', subSlots: undefined }
          }
        }
      ]
    }
  }
]

const { triggers, rulesJson, emit } = useDemoRuntime({
  setup,
  handlers,
  triggers: triggerDefs
})

const activeTab = ref(0)
const activeTrigger = computed(() => triggers[activeTab.value])

const slides = ['⚔  第 1 张  起手式', '🔥  第 2 张  推进中', '🏁  第 3 张  最后一张']
const currentIndex = ref(0)

const { setPanel } = useCodePanel()
watchEffect(() => {
  setPanel(codeFiles, rulesJson.value)
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
  <DemoLayout title="轮播切换 · Carousel Switch">
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
            <PlayCarousel
              id="main_carousel"
              v-model="currentIndex"
              :items="slides"
              @trigger="onTrigger"
            />
          </div>
        </div>

        <div
          class="rounded-md border border-dashed border-#1f2735 bg-#0a0c11 p-4 font-mono text-xs leading-relaxed text-#7a8599"
        >
          <span class="text-#5fb3a1">// hint</span>
          <br />
          切换轮播 → 同时触发两条规则：弹 Toast + 区域背景变色。
          <br />
          可以在编辑器里调整任一触发器的动作内容，立刻看到 JSON 抽屉里规则同步更新。
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
