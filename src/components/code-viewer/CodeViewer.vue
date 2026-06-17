<script setup lang="ts">
import { lazy, Workspace } from 'modern-monaco'
import { computed, ref, watch } from 'vue'
import CodeTabs from './CodeTabs.vue'

interface CodeFile {
  filename: string
  content: string
}

const props = defineProps<{
  files: CodeFile[]
  rulesJson?: unknown[] | null
}>()

const JSON_FILENAME = 'rules.json'

const active = ref(0)
const jsonActive = ref(false)

const showJsonBtn = computed(() => !!props.rulesJson)

function formatJson(json: unknown[] | null | undefined): string {
  if (!json || json.length === 0) {
    return '// 暂无规则'
  }
  return JSON.stringify(json, null, 2)
}

// 组件级 workspace。由于本组件挂载在 App.vue 中且通过 v-show 控制显隐，
// workspace 与 monaco-editor 实例在整个会话中持续有效。
// 延迟初始化：等待 files 第一次非空时才创建 workspace。
let workspace: Workspace | null = null
let lazyReady: Promise<void> | null = null

async function initWorkspace(codeFiles: CodeFile[], json: unknown[] | null | undefined) {
  const initialFiles: Record<string, string> = {}
  for (const file of codeFiles) {
    initialFiles[file.filename] = file.content
  }
  initialFiles[JSON_FILENAME] = formatJson(json)
  const entryFile = codeFiles[0]?.filename
  console.log(
    '[CV] initWorkspace files=' + codeFiles.map((f) => f.filename).join(',') + ' entry=' + entryFile
  )
  workspace = new Workspace({ initialFiles, entryFile })
  lazyReady = lazy({
    workspace,
    defaultTheme: 'vitesse-dark',
    langs: ['typescript', 'vue', 'json'],
    lsp: {
      typescript: {
        diagnosticsOptions: {
          validate: false
        }
      }
    }
  })
  await lazyReady
  console.log('[CV] initWorkspace done')
}

async function safeOpen(filename: string, content?: string) {
  if (!workspace || !lazyReady) {
    console.log('[CV] safeOpen SKIP no workspace file=' + filename)
    return
  }
  await lazyReady
  console.log('[CV] safeOpen start file=' + filename + ' hasContent=' + (content !== undefined))
  try {
    if (content !== undefined) {
      await workspace.openTextDocument(filename, content)
    } else {
      await workspace.openTextDocument(filename)
    }
    console.log('[CV] safeOpen done file=' + filename)
  } catch (e: any) {
    console.log('[CV] safeOpen error file=' + filename + ' msg=' + (e?.message ?? e))
    if (e?.message !== 'Canceled' && e?.name !== 'Canceled') throw e
  }
}

// 防止 handleUpdateActive 同时触发 active 和 jsonActive 两个 watcher
let skipJsonWatch = false

watch(active, async (i) => {
  console.log('[CV] watch:active i=' + i + ' jsonActive=' + jsonActive.value)
  if (jsonActive.value) return
  const file = props.files[i]
  if (file) {
    await safeOpen(file.filename)
  } else {
    console.log('[CV] watch:active NO file at index=' + i + ' files.length=' + props.files.length)
  }
})

watch(jsonActive, async (next) => {
  console.log('[CV] watch:jsonActive next=' + next + ' skip=' + skipJsonWatch)
  if (skipJsonWatch) {
    skipJsonWatch = false
    return
  }
  if (next) {
    await safeOpen(JSON_FILENAME, formatJson(props.rulesJson))
  } else {
    const file = props.files[active.value]
    if (file) {
      await safeOpen(file.filename)
    }
  }
})

watch(
  () => props.rulesJson,
  async (next) => {
    if (jsonActive.value) {
      await safeOpen(JSON_FILENAME, formatJson(next))
    }
  }
)

// 当外部传入的 files 变化时（路由切换 / 首次加载），初始化或刷新 workspace
watch(
  () => props.files,
  async (newFiles) => {
    console.log(
      '[CV] watch:files len=' +
        newFiles.length +
        ' names=' +
        newFiles.map((f) => f.filename).join(',')
    )
    if (!newFiles.length) return

    if (!workspace) {
      // 首次有文件时初始化 workspace
      await initWorkspace(newFiles, props.rulesJson)
    } else {
      // 后续导航：复用已有 workspace，更新文件内容
      console.log('[CV] watch:files reuse workspace')
      await lazyReady
      for (const file of newFiles) {
        await safeOpen(file.filename, file.content)
      }
      await safeOpen(JSON_FILENAME, formatJson(props.rulesJson))
      const entry = newFiles[0]?.filename
      if (entry) {
        await safeOpen(entry)
      }
    }
    // 重置 tab 状态
    active.value = 0
    if (jsonActive.value) {
      skipJsonWatch = true
      jsonActive.value = false
    }
  },
  { deep: true, immediate: true }
)

function handleUpdateActive(i: number) {
  if (jsonActive.value) {
    skipJsonWatch = true
    jsonActive.value = false
  }
  active.value = i
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
      :show-json-btn="showJsonBtn"
      :json-active="jsonActive"
      @update:active="handleUpdateActive"
      @toggle-json="handleToggleJson"
    />
    <div class="flex-1 min-h-0 relative overflow-hidden">
      <monaco-editor
        theme="vitesse-dark"
        readOnly="true"
        minimap="false"
        class="absolute inset-0 block w-full h-full"
      />
    </div>
  </div>
</template>
