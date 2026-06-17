<script setup lang="ts">
import { lazy, Workspace } from 'modern-monaco'
import { onMounted, ref, watch } from 'vue'
import CodeTabs from './CodeTabs.vue'

interface CodeFile {
  filename: string
  content: string
}

const props = defineProps<{
  files: CodeFile[]
}>()

const active = ref(0)
let workspace: Workspace | null = null

onMounted(async () => {
  const initialFiles: Record<string, string> = {}
  for (const file of props.files) {
    initialFiles[file.filename] = file.content
  }

  const entryFile = props.files[active.value]?.filename

  workspace = new Workspace({
    initialFiles,
    entryFile
  })

  await lazy({
    workspace,
    defaultTheme: 'vitesse-dark',
    langs: ['typescript', 'vue'],
    lsp: {
      typescript: {
        diagnosticsOptions: {
          validate: false
        }
      }
    }
  })
})

watch(active, async (i) => {
  const file = props.files[i]
  if (workspace && file) {
    await workspace.openTextDocument(file.filename)
  }
})
</script>

<template>
  <div class="flex flex-col h-full bg-#0c0e14">
    <CodeTabs v-model:active="active" :tabs="files" />
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
