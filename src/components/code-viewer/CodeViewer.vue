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
let lazyDone = false

async function initWorkspace(codeFiles: CodeFile[], json: unknown[] | null | undefined) {
  const initialFiles: Record<string, string> = {}
  for (const file of codeFiles) {
    initialFiles[file.filename] = file.content
  }
  initialFiles[JSON_FILENAME] = formatJson(json)
  const entryFile = codeFiles[0]?.filename
  workspace = new Workspace({ initialFiles, entryFile })
  lazy({
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
  lazyDone = true
}

// 通过传入 readonlyContent（内容字符串）让编辑器以只读模式打开文件，
// 文本可选中、可复制、可移动光标，但禁止修改。第二个参数在 modern-monaco
// 内部被解释为 readonlyContent，传字符串即进入只读分支。
async function safeOpen(filename: string, content?: string) {
  if (!workspace || !lazyDone) return
  try {
    let readonlyContent = content
    if (readonlyContent === undefined) {
      // 从 workspace 文件系统读取，确保即便未显式传入内容也以只读模式打开
      try {
        readonlyContent = await workspace.fs.readTextFile(filename)
      } catch {
        return
      }
    }
    await workspace.openTextDocument(filename, readonlyContent)
  } catch (e: any) {
    if (e?.message !== 'Canceled' && e?.name !== 'Canceled') throw e
  }
}

// 防止 handleUpdateActive 同时触发 active 和 jsonActive 两个 watcher
let skipJsonWatch = false

watch(active, async (i) => {
  if (jsonActive.value) return
  const file = props.files[i]
  if (file) {
    await safeOpen(file.filename)
  }
})

watch(jsonActive, async (next) => {
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
    if (!newFiles.length) return

    if (!workspace) {
      // 首次有文件时初始化 workspace
      await initWorkspace(newFiles, props.rulesJson)
    } else {
      // 后续导航：复用已有 workspace，仅更新文件系统
      // 已有 model 通过 __OB__ FS watcher 自动同步新内容，无需手动逐一打开
      for (const file of newFiles) {
        await workspace.fs.writeFile(file.filename, file.content)
      }
      await workspace.fs.writeFile(JSON_FILENAME, formatJson(props.rulesJson))
      // 只打开入口文件（单次 model 切换，避免 rapid setModel 导致 Canceled 错误）
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
    if (active.value === i) {
      // active 值不变，watcher 不会触发，手动打开文件
      const file = props.files[i]
      if (file) safeOpen(file.filename)
      return
    }
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
