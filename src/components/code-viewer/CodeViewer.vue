<script setup lang="ts">
import { init, type editor } from 'modern-monaco'
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import CodeTabs from './CodeTabs.vue'

interface CodeFile {
  filename: string
  content: string
}

const JSON_FILENAME = 'triggers.json'

const props = defineProps<{
  files: CodeFile[]
  triggersJson?: unknown[] | null
}>()

const active = ref(0)
const jsonActive = ref(false)
const containerRef = useTemplateRef<HTMLDivElement>('container')

// 全局状态：一个 monaco 实例、一个 editor、按文件名缓存的 model map。
// monaco / editor 变化不触发 Vue 渲染，用 let 让 watch 闭包直接读最新值。
let monaco: Awaited<ReturnType<typeof init>> | null = null
let ed: editor.IStandaloneCodeEditor | null = null
const models = new Map<string, editor.ITextModel>()

function uriFor(filename: string) {
  return monaco!.Uri.parse(`file:///${filename}`)
}

// 取已有 model 并 setValue；没有则 createModel。
// 与 workspace.openTextDocument 不同，这里不注册任何 self-dispose 监听，
// model 生命周期由本组件独占管理。
function ensureModel(filename: string, content: string, language?: string) {
  const uri = uriFor(filename)
  const existing = monaco!.editor.getModel(uri)
  if (existing) {
    if (existing.getValue() !== content) existing.setValue(content)
    return existing
  }
  const model = monaco!.editor.createModel(content, language, uri)
  models.set(filename, model)
  return model
}

// 根据 active / jsonActive 把 editor 切到对应 model。
function showCurrent() {
  if (!ed) return
  const filename = jsonActive.value ? JSON_FILENAME : props.files[active.value]?.filename
  const model = filename ? models.get(filename) : undefined
  if (model && ed.getModel() !== model) ed.setModel(model)
}

onMounted(async () => {
  monaco = await init({
    langs: ['typescript', 'vue', 'json'],
    defaultTheme: 'vitesse-dark'
  })
  if (!containerRef.value) return
  ed = monaco.editor.create(containerRef.value, {
    readOnly: true,
    theme: 'vitesse-dark',
    minimap: { enabled: false },
    automaticLayout: true
  })
  // 首次同步：路由进入时 useSyncCodePanel 已经把当前 demo 的 files / triggersJson
  // 推进 useCodePanel，App.vue 的 props 此时已有值。
  for (const file of props.files) {
    ensureModel(file.filename, file.content)
  }
  if (props.triggersJson != null) {
    ensureModel(JSON_FILENAME, JSON.stringify(props.triggersJson, null, 2), 'json')
  }
  showCurrent()
})

// 路由切换 → props.files 引用变 → 同步新 demo 的文件、重置到 setup.ts
watch(
  () => props.files,
  (next) => {
    if (!monaco) return
    for (const file of next) {
      ensureModel(file.filename, file.content)
    }
    jsonActive.value = false
    active.value = 0
    showCurrent()
  },
  { deep: true }
)

// triggersJson 变化（用户在 TriggerEditor 编辑）→ 只更新 JSON model，不切 tab
watch(
  () => props.triggersJson,
  (next) => {
    if (!monaco || next == null) return
    ensureModel(JSON_FILENAME, JSON.stringify(next, null, 2), 'json')
  },
  { deep: true }
)

// 用户切 tab / JSON
watch(active, showCurrent)
watch(jsonActive, showCurrent)

function handleUpdateActive(i: number) {
  active.value = i
  jsonActive.value = false
}

function handleToggleJson() {
  jsonActive.value = !jsonActive.value
}
</script>

<template>
  <div class="flex flex-col h-full bg-#0c0e14">
    <CodeTabs
      :tabs="files"
      :active="active"
      :show-json-btn="!!triggersJson"
      :json-active="jsonActive"
      @update:active="handleUpdateActive"
      @toggle-json="handleToggleJson"
    />
    <div ref="container" class="flex-1 min-h-0 relative overflow-hidden" />
  </div>
</template>
