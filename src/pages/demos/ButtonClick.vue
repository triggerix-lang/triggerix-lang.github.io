<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import DemoToast from '../../components/DemoToast.vue'
import PlayButton from '../../components/playground/PlayButton.vue'
import type { DemoActionHandler } from '../../composables/useDemoRuntime'
import { useDemoRuntime } from '../../composables/useDemoRuntime'
import { setup } from '../../definitions/button-click'
import DemoLayout from '../../layouts/DemoLayout.vue'
import TriggerEditor from '../../trigger-ui/components/TriggerEditor.vue'

const toastRef = useTemplateRef<InstanceType<typeof DemoToast>>('toast')

const handlers: Record<string, DemoActionHandler> = {
  show_message: (params) => {
    toastRef.value?.push(String(params?.message ?? '（空消息）'), 'success')
  }
}

const { war3Editor, state, ruleJson, emit } = useDemoRuntime({ setup, handlers })

onMounted(() => {
  // Predefined rule: confirm button click → show "Hello Triggerix!"
  war3Editor.setEvent('button_click')
  war3Editor.setEventSlot('button', {
    tool: 'button_picker',
    value: 'confirm_btn',
    subSlots: undefined
  })
  war3Editor.addAction('show_message')
  war3Editor.setActionSlot(0, 'message', {
    tool: 'text_input',
    value: 'Hello Triggerix!',
    subSlots: undefined
  })
})

function onTrigger(eventType: string, payload: Record<string, unknown>) {
  emit(eventType, payload)
}
</script>

<template>
  <DemoLayout title="按钮点击 · Button Click" :rule-json="ruleJson">
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
          点击「确认」按钮 → 触发器命中 → 顶部 Toast 显示消息。
          <br />
          点击「取消」按钮 → 事件 source 不匹配 → 规则不会执行。
        </div>
      </div>
    </template>

    <template #editor>
      <TriggerEditor :editor="war3Editor" :state="state" />
    </template>
  </DemoLayout>

  <DemoToast ref="toast" />
</template>
