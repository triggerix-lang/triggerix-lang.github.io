import { ref } from 'vue'
import type { CodeFile } from '../definitions/code-snippets/types'

export type { CodeFile }

// 全局面板状态：App.vue 通过 useCodePanel() 读取，demo 通过 setPanel 写入。
const files = ref<CodeFile[]>([])
const triggersJson = ref<unknown[] | null>(null)
const visible = ref(false)

export function useCodePanel() {
  function setPanel(newFiles: CodeFile[], json?: unknown[] | null) {
    files.value = newFiles
    triggersJson.value = json ?? null
    visible.value = newFiles.length > 0
  }
  return {
    files,
    triggersJson,
    visible,
    setPanel
  }
}
