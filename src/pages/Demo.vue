<script setup lang="ts">
import { onMounted, ref } from 'vue'
import TriggerEditor from '../trigger-ui/components/TriggerEditor.vue'

const editorRef = ref<InstanceType<typeof TriggerEditor> | null>(null)

onMounted(() => {
  const editor = editorRef.value?.editor
  if (!editor) return

  // Register events
  editor.registerEvent({
    type: 'button_click',
    template: '${component}被点击',
    slots: { component: { label: '指定组件', tools: ['component_picker'] } }
  })
  editor.registerEvent({
    type: 'input_change',
    template: '${component}的文本变化为${value}',
    slots: {
      component: { label: '指定组件', tools: ['component_picker'] },
      value: { label: '指定值', tools: ['text_input'] }
    }
  })

  // Register conditions
  editor.registerCondition({
    type: 'value_compare',
    template: '${left} ${operator} ${right}',
    slots: {
      left: { label: '左值', tools: ['text_input', 'number_input'] },
      operator: { label: '运算符', tools: ['operator_select'] },
      right: { label: '右值', tools: ['text_input', 'number_input'] }
    }
  })

  // Register actions
  editor.registerAction({
    type: 'show_message',
    template: '显示消息${message}',
    slots: { message: { label: '消息内容', tools: ['text_input'] } }
  })
  editor.registerAction({
    type: 'set_value',
    template: '设置${target}的值为${value}',
    slots: {
      target: { label: '目标组件', tools: ['component_picker'] },
      value: { label: '新值', tools: ['text_input', 'number_input'] }
    }
  })

  // Register tools
  editor.registerTool('text_input', {
    label: '文本输入',
    type: 'leaf',
    input: { type: 'text', placeholder: '请输入文本...' },
    resolve: (input: unknown) => input
  })
  editor.registerTool('number_input', {
    label: '数字输入',
    type: 'leaf',
    input: { type: 'number', placeholder: '请输入数字...' },
    resolve: (input: unknown) => Number(input)
  })
  editor.registerTool('component_picker', {
    label: '选择组件',
    type: 'leaf',
    input: {
      type: 'select',
      options: [
        { value: 'confirm_btn', label: '确认按钮' },
        { value: 'cancel_btn', label: '取消按钮' },
        { value: 'username_input', label: '用户名输入框' },
        { value: 'search_input', label: '搜索框' }
      ]
    },
    resolve: (input: unknown) => input
  })
  editor.registerTool('operator_select', {
    label: '选择运算符',
    type: 'leaf',
    input: {
      type: 'select',
      options: [
        { value: 'eq', label: '等于' },
        { value: 'neq', label: '不等于' },
        { value: 'gt', label: '大于' },
        { value: 'lt', label: '小于' }
      ]
    },
    resolve: (input: unknown) => input
  })
})
</script>

<template>
  <div class="demo">
    <h1 class="demo__title">触发器编辑器</h1>
    <p class="demo__subtitle">WC3 风格 · 文本化触发器交互</p>
    <TriggerEditor ref="editorRef" />
  </div>
</template>

<style scoped>
.demo {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.demo__title {
  font-family: 'Cinzel', Georgia, serif;
  font-size: 1.6rem;
  color: #e6edf3;
  margin-bottom: 0.3rem;
  letter-spacing: 0.02em;
}

.demo__subtitle {
  font-size: 0.85rem;
  color: #7a8599;
  margin-bottom: 1.5rem;
}
</style>
