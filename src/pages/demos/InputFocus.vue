<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import DemoToast from '../../components/DemoToast.vue'
import PlayInput from '../../components/playground/PlayInput.vue'
import { useDemoRuntime } from '../../composables/useDemoRuntime'
import { createHandlers, setup } from '../../definitions/input-focus'
import DemoLayout from '../../layouts/DemoLayout.vue'
import TriggerEditor from '../../trigger-ui/components/TriggerEditor.vue'

const toastRef = useTemplateRef<InstanceType<typeof DemoToast>>('toast')

const tipMessage = ref('')
const tipVisible = ref(false)

const handlers = createHandlers({
  show: (msg) => {
    tipMessage.value = msg
    tipVisible.value = true
    toastRef.value?.push(`tip: ${msg}`, 'info')
  },
  hide: () => {
    tipVisible.value = false
    toastRef.value?.push('tip 已隐藏', 'info', 1400)
  }
})

const { war3Editor, state, ruleJson, emit } = useDemoRuntime({ setup, handlers })

const username = ref('')
const password = ref('')

onMounted(() => {
  // Predefined: focus on username → show tip "请输入用户名"
  war3Editor.setEvent('input_focus')
  war3Editor.setEventSlot('input', {
    tool: 'input_picker',
    value: 'username_input',
    subSlots: undefined
  })
  war3Editor.addAction('show_tip')
  war3Editor.setActionSlot(0, 'message', {
    tool: 'text_input',
    value: '请输入用户名',
    subSlots: undefined
  })
})

function onTrigger(eventType: string, payload: Record<string, unknown>) {
  emit(eventType, payload)
}
</script>

<template>
  <DemoLayout title="输入框焦点 · Input Focus" :rule-json="ruleJson">
    <template #playground>
      <div class="flex flex-col gap-6">
        <div class="rounded-md border border-#1f2735 bg-#0c0e14/60 p-4">
          <div class="mb-3 font-mono text-[11px] uppercase tracking-widest text-#7a8599">
            scene · login form
          </div>
          <div class="flex flex-col gap-4">
            <PlayInput id="username_input" v-model="username" label="用户名" @trigger="onTrigger" />
            <PlayInput id="password_input" v-model="password" label="密码" @trigger="onTrigger" />
          </div>
        </div>

        <div class="min-h-12 rounded-md border border-#1f2735 bg-#0a0c11 p-3">
          <div class="mb-2 font-mono text-[11px] uppercase tracking-widest text-#7a8599">
            tip area
          </div>
          <transition
            enter-active-class="transition duration-200"
            leave-active-class="transition duration-150"
            enter-from-class="opacity-0 -translate-y-1"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div
              v-if="tipVisible"
              class="flex items-center gap-2 rounded border border-#4fc3f7/40 bg-#4fc3f7/10 px-3 py-2 text-sm text-#cfe9f7"
            >
              <span class="i-mdi-information-outline text-base text-#4fc3f7" />
              <span>{{ tipMessage }}</span>
            </div>
            <div v-else class="font-mono text-xs text-#3d4f6a">（等待事件触发）</div>
          </transition>
        </div>

        <div
          class="rounded-md border border-dashed border-#1f2735 bg-#0a0c11 p-4 font-mono text-xs leading-relaxed text-#7a8599"
        >
          <span class="text-#5fb3a1">// hint</span>
          <br />
          聚焦「用户名」输入框 → 触发 show_tip。试着切换到密码框，规则不会命中。
        </div>
      </div>
    </template>

    <template #editor>
      <TriggerEditor :editor="war3Editor" :state="state" />
    </template>
  </DemoLayout>

  <DemoToast ref="toast" />
</template>
