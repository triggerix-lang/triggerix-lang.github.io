<script setup lang="ts">
import { lazy, Workspace } from 'modern-monaco'
import { computed, onMounted, ref, watch } from 'vue'
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
let workspace: Workspace | null = null

const showJsonBtn = computed(() => !!props.rulesJson)

function formatJson(json: unknown[] | null | undefined): string {
  if (!json || json.length === 0) {
    return '// 暂无规则'
  }
  return JSON.stringify(json, null, 2)
}

onMounted(async () => {
  const initialFiles: Record<string, string> = {}
  for (const file of props.files) {
    initialFiles[file.filename] = file.content
  }
  initialFiles[JSON_FILENAME] = formatJson(props.rulesJson)

  const entryFile = props.files[active.value]?.filename

  workspace = new Workspace({
    initialFiles,
    entryFile
  })

  await lazy({
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
})

// 安全调用 openTextDocument，忽略 Monaco 竞态取消错误
async function safeOpen(filename: string, content?: string) {
  if (!workspace) return
  try {
    if (content !== undefined) {
      await workspace.openTextDocument(filename, content)
    } else {
      await workspace.openTextDocument(filename)
    }
  } catch (e: any) {
    // Monaco 在快速切换文件时会取消前一个操作，属于正常行为
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
    await safeOpen(JSON_FILENAME)
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
    await safeOpen(JSON_FILENAME, formatJson(next))
    if (!jsonActive.value) {
      const file = props.files[active.value]
      if (file) {
        await safeOpen(file.filename)
      }
    }
  }
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
