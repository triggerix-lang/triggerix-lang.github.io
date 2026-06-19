<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import DemoToast from '../../components/DemoToast.vue'
import PlayButton from '../../components/playground/PlayButton.vue'
import PlayInput from '../../components/playground/PlayInput.vue'
import type { TriggerDef } from '../../composables/useDemoRuntime'
import { useDemoRuntime } from '../../composables/useDemoRuntime'
import { useCodePanel } from '../../composables/useCodePanel'
import { createHandlers, setup } from '../../definitions/button-modify-input'
import { codeFiles } from '../../definitions/code-snippets/button-modify-input'
import DemoLayout from '../../layouts/DemoLayout.vue'
import TriggerEditor from '../../trigger-ui/components/TriggerEditor.vue'
import TriggerTabs from '../../trigger-ui/components/TriggerTabs.vue'

const toastRef = useTemplateRef<InstanceType<typeof DemoToast>>('toast')
const inputRef = useTemplateRef<InstanceType<typeof PlayInput>>('input')

const targetValue = ref('')

const handlers = createHandlers({
  setValue: (target, value) => {
    if (target === 'target') {
      inputRef.value?.setValue(value)
      toastRef.value?.push(`已写入: ${value}`, 'success')
    }
  }
})

const triggerDefs: TriggerDef[] = [
  {
    id: 'fill-title-trigger',
    name: '填入标题',
    initialState: {
      event: {
        id: 'button_click',
        slotValues: {
          button: { tool: 'button_picker', value: 'fill_title', subSlots: undefined }
        }
      },
      actions: [
        {
          id: 'set_input_value',
          slotValues: {
            input: { tool: 'input_picker', value: 'target', subSlots: undefined },
            value: {
              tool: 'value_source',
              value: { $ref: 'document.title' },
              subSlots: undefined
            }
          }
        }
      ]
    }
  },
  {
    id: 'fill-width-trigger',
    name: '填入宽度',
    initialState: {
      event: {
        id: 'button_click',
        slotValues: {
          button: { tool: 'button_picker', value: 'fill_width', subSlots: undefined }
        }
      },
      actions: [
        {
          id: 'set_input_value',
          slotValues: {
            input: { tool: 'input_picker', value: 'target', subSlots: undefined },
            value: {
              tool: 'value_source',
              value: { $ref: 'window.innerWidth' },
              subSlots: undefined
            }
          }
        }
      ]
    }
  },
  {
    id: 'fill-url-trigger',
    name: '填入网址',
    initialState: {
      event: {
        id: 'button_click',
        slotValues: {
          button: { tool: 'button_picker', value: 'fill_url', subSlots: undefined }
        }
      },
      actions: [
        {
          id: 'set_input_value',
          slotValues: {
            input: { tool: 'input_picker', value: 'target', subSlots: undefined },
            value: {
              tool: 'value_source',
              value: { $ref: 'location.href' },
              subSlots: undefined
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

const { setPanel } = useCodePanel()
// 路由进入时立即同步一次面板状态；之后随 triggersJson 变化更新。
// 不能用 watchEffect：依赖 triggersJson 一开始可能与上一个页面的值相同，
// 导致路由切换时不会再次写入 files，CodeViewer 也就不会刷新。
onMounted(() => {
  setPanel(codeFiles, triggersJson.value)
})
watch(triggersJson, (v) => {
  setPanel(codeFiles, v)
})

function onTrigger(eventType: string, payload: Record<string, unknown>) {
  emit(eventType, payload)
}
</script>

<template>
  <DemoLayout title="按钮修改输入框 · Patch Input">
    <template #playground>
      <div class="flex flex-col gap-6">
        <div class="rounded-md border border-#1f2735 bg-#0c0e14/60 p-4">
          <div class="mb-3 font-mono text-[11px] uppercase tracking-widest text-#7a8599">
            scene · trigger source
          </div>
          <div class="flex flex-wrap gap-3">
            <PlayButton id="fill_title" label="填入标题" @trigger="onTrigger" />
            <PlayButton id="fill_width" label="填入宽度" @trigger="onTrigger" />
            <PlayButton id="fill_url" label="填入网址" @trigger="onTrigger" />
          </div>
        </div>

        <div class="rounded-md border border-#1f2735 bg-#0c0e14/60 p-4">
          <div class="mb-3 font-mono text-[11px] uppercase tracking-widest text-#7a8599">
            target input
          </div>
          <PlayInput
            id="target"
            ref="input"
            v-model="targetValue"
            label="目标输入框"
            @trigger="onTrigger"
          />
        </div>

        <div
          class="rounded-md border border-dashed border-#1f2735 bg-#0a0c11 p-4 font-mono text-xs leading-relaxed text-#7a8599"
        >
          <span class="text-#5fb3a1">// hint</span>
          <br />
          点击按钮 → 触发器命中 → 通过
          <span class="text-#c9a84c">$ref</span> 拉取页面信息写入 input。
          <br />
          三个按钮各配一条触发器，分别写入标题、宽度、当前网址。
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
