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
  triggersJson?: unknown[] | null
}>()

const JSON_FILENAME = 'triggers.json'

const active = ref(0)
const jsonActive = ref(false)

const showJsonBtn = computed(() => !!props.triggersJson)

function formatJson(json: unknown[] | null | undefined): string {
  if (!json || json.length === 0) {
    return '// 暂无触发器'
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

// 同步某个文件到 monaco model。
// 不走 fs.writeFile + fs watcher 这条间接路径：
// 同一文件被多次 writeFile 时，watcher 回调里的 fs.readTextFile
// 是异步的，多个回调的解析顺序不可控，旧快照可能后解析并
// 覆盖 model.setValue，导致内容卡在旧版本。
async function safeOpen(filename: string, content?: string) {
  if (!workspace || !lazyDone) return
  const readonlyContent = content ?? findFileContent(filename)
  if (readonlyContent === undefined) return

  const monaco = await (workspace as any)._monaco.promise
  if (!monaco) return
  const href = new URL(filename, 'file:///').href
  const modelUri = monaco.Uri.parse(href)
  let model = monaco.editor.getModel(modelUri)
  if (model) {
    if (model.getValue() !== readonlyContent) {
      model.setValue(readonlyContent)
    }
  } else {
    // model 还没创建（monaco-editor connectedCallback 尚未完成），
    // 走原路径以只读模式创建并打开。
    await workspace.openTextDocument(filename, readonlyContent)
  }
}

// 显式把编辑器切到指定文件的 model。
// 切换 editor 是「用户点了 tab」或「路由切换」时的意图动作，
// 不在 safeOpen 里做，避免 sync 多个文件时最后一同步停留在错误的 model。
async function switchTo(filename: string) {
  if (!workspace) return
  const monaco = await (workspace as any)._monaco.promise
  if (!monaco) return
  const href = new URL(filename, 'file:///').href
  const modelUri = monaco.Uri.parse(href)
  const model = monaco.editor.getModel(modelUri)
  if (!model) return
  const editor = monaco.editor.getEditors()[0]
  if (editor && editor.getModel() !== model) {
    editor.setModel(model)
  }
}

function findFileContent(filename: string): string | undefined {
  if (filename === JSON_FILENAME) return formatJson(props.triggersJson)
  for (const f of props.files) {
    if (f.filename === filename) return f.content
  }
  return undefined
}

// 防止 handleUpdateActive 同时触发 active 和 jsonActive 两个 watcher
let skipJsonWatch = false

watch(active, async (i) => {
  if (jsonActive.value) return
  const file = props.files[i]
  if (file) {
    await safeOpen(file.filename, file.content)
    await switchTo(file.filename)
  }
})

watch(jsonActive, async (next) => {
  if (skipJsonWatch) {
    skipJsonWatch = false
    return
  }
  if (next) {
    await safeOpen(JSON_FILENAME, formatJson(props.triggersJson))
    await switchTo(JSON_FILENAME)
  } else {
    const file = props.files[active.value]
    if (file) {
      await safeOpen(file.filename, file.content)
      await switchTo(file.filename)
    }
  }
})

watch(
  () => props.triggersJson,
  async (next) => {
    if (jsonActive.value) {
      await safeOpen(JSON_FILENAME, formatJson(next))
    }
  }
)

// 路由切换 / 首次加载：初始化 workspace，或直接把新内容同步进已有 model。
// 后续导航不走 fs.writeFile，避免 watcher 异步链的旧内容覆盖。
watch(
  () => props.files,
  async (newFiles) => {
    if (!newFiles.length) return

    if (!workspace) {
      // 首次：构造时会写 IndexedDB，但 monaco-editor 尚未连接、model 未创建，
      // 不会注册 watcher，无副作用。
      await initWorkspace(newFiles, props.triggersJson)
    } else {
      for (const file of newFiles) {
        await safeOpen(file.filename, file.content)
      }
      await safeOpen(JSON_FILENAME, formatJson(props.triggersJson))
    }
    // 重置 tab 状态
    active.value = 0
    // 路由切换后主动把编辑器切回入口文件。
    // watch(active) 也会触发，但它是 microtask 调度，这里 await 之后更可控。
    const entry = newFiles[0]?.filename
    if (entry) {
      await switchTo(entry)
    }
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
      if (file) {
        safeOpen(file.filename, file.content)
        switchTo(file.filename)
      }
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
