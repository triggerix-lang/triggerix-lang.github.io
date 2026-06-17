<script setup lang="ts">
import { computed, ref, useTemplateRef, watchEffect } from 'vue'
import DemoToast from '../../components/DemoToast.vue'
import PlayButton from '../../components/playground/PlayButton.vue'
import type { DemoActionHandler, TriggerDef } from '../../composables/useDemoRuntime'
import { useDemoRuntime } from '../../composables/useDemoRuntime'
import { useCodePanel } from '../../composables/useCodePanel'
import { setup } from '../../definitions/button-click'
import { codeFiles } from '../../definitions/code-snippets/button-click'
import DemoLayout from '../../layouts/DemoLayout.vue'
import TriggerEditor from '../../trigger-ui/components/TriggerEditor.vue'
import TriggerTabs from '../../trigger-ui/components/TriggerTabs.vue'

const toastRef = useTemplateRef<InstanceType<typeof DemoToast>>('toast')

const handlers: Record<string, DemoActionHandler> = {
  show_message: (params) => {
    toastRef.value?.push(String((params?.message as string) ?? '（空消息）'), 'success')
  }
}

const triggerDefs: TriggerDef[] = [
  {
    id: 'confirm-trigger',
    name: '确认按钮',
    initialState: {
      event: {
        type: 'button_click',
        slotValues: {
          button: { tool: 'button_picker', value: 'confirm_btn', subSlots: undefined }
        }
      },
      actions: [
        {
          type: 'show_message',
          slotValues: {
            message: { tool: 'text_input', value: 'Hello Triggerix!', subSlots: undefined }
          }
        }
      ]
    }
  },
  {
    id: 'cancel-trigger',
    name: '取消按钮',
    initialState: {
      event: {
        type: 'button_click',
        slotValues: {
          button: { tool: 'button_picker', value: 'cancel_btn', subSlots: undefined }
        }
      },
      actions: [
        {
          type: 'show_message',
          slotValues: {
            message: { tool: 'text_input', value: '已取消', subSlots: undefined }
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

const { setPanel } = useCodePanel()
watchEffect(() => {
  setPanel(codeFiles, rulesJson.value)
})

function onTrigger(eventType: string, payload: Record<string, unknown>) {
  emit(eventType, payload)
}
</script>

<template>
  <DemoLayout title="按钮点击 · Button Click">
    <template #playground>
      <div class="flex flex-col gap-6">
        <div class="rounded-md border border-#1f2735 bg-#0c0e14/60 p-4">
          <div class="mb-3 font-mono text-[11px] uppercase tracking-widest text-#7a8599">
            scene · 2 buttons
          </div>
          <div class="flex flex-wrap gap-3">
            <PlayButton id="confirm_btn" label="确认" @trigger="onTrigger" />
            <PlayButton id="cancel_btn" label="取消" @trigger="onTrigger" />
          </div>
        </div>

        <div
          class="rounded-md border border-dashed border-#1f2735 bg-#0a0c11 p-4 font-mono text-xs leading-relaxed text-#7a8599"
        >
          <span class="text-#5fb3a1">// hint</span>
          <br />
          两个按钮各自配有一条触发器：「确认」弹出问候，「取消」弹出取消提示。
          <br />
          切换右侧 tab 可分别查看 / 编辑两条规则。
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
