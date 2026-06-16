<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import DemoToast from '../../components/DemoToast.vue'
import PlayButton from '../../components/playground/PlayButton.vue'
import PlayInput from '../../components/playground/PlayInput.vue'
import { useDemoRuntime } from '../../composables/useDemoRuntime'
import { createHandlers, setup } from '../../definitions/button-modify-input'
import DemoLayout from '../../layouts/DemoLayout.vue'
import TriggerEditor from '../../trigger-ui/components/TriggerEditor.vue'

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

const { war3Editor, state, ruleJson, emit } = useDemoRuntime({ setup, handlers })

onMounted(() => {
  // Predefined: fill_title button → set target input to document.title via $ref
  war3Editor.setEvent('button_click')
  war3Editor.setEventSlot('button', {
    tool: 'button_picker',
    value: 'fill_title',
    subSlots: undefined
  })
  war3Editor.addAction('set_input_value')
  war3Editor.setActionSlot(0, 'input', {
    tool: 'input_picker',
    value: 'target',
    subSlots: undefined
  })
  war3Editor.setActionSlot(0, 'value', {
    tool: 'value_source',
    value: { $ref: 'document.title' },
    subSlots: undefined
  })
})

function onTrigger(eventType: string, payload: Record<string, unknown>) {
  emit(eventType, payload)
}
</script>

<template>
  <DemoLayout title="按钮修改输入框 · Patch Input" :rule-json="ruleJson">
    <template #playground>
      <div class="flex flex-col gap-6">
        <div class="rounded-md border border-#1f2735 bg-#0c0e14/60 p-4">
          <div class="mb-3 font-mono text-[11px] uppercase tracking-widest text-#7a8599">
            scene · trigger source
          </div>
          <div class="flex flex-wrap gap-3">
            <PlayButton id="fill_title" label="填入标题" @trigger="onTrigger" />
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
          点击「填入标题」按钮 → 规则用
          <span class="text-#c9a84c">$ref: document.title</span> 解析当前页面标题，写入 input。
          <br />
          编辑器里也可以把 value 切换到「文本输入」直接写常量。
        </div>
      </div>
    </template>

    <template #editor>
      <TriggerEditor :editor="war3Editor" :state="state" />
    </template>
  </DemoLayout>

  <DemoToast ref="toast" />
</template>
