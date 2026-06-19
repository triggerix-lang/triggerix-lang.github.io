import { ref } from 'vue'
import type { CodeFile } from '../definitions/code-snippets/types'

export type { CodeFile }

// 全局响应式状态：供 demo 页面写入、App 级别持久化的 CodeViewer 读取。
const files = ref<CodeFile[]>([])
const triggersJson = ref<unknown[] | null>(null)
const visible = ref(false)

export function useCodePanel() {
  function setPanel(newFiles: CodeFile[], json?: unknown[] | null) {
    files.value = newFiles
    triggersJson.value = json ?? null
    visible.value = newFiles.length > 0
  }

  function hidePanel() {
    visible.value = false
  }

  return { files, triggersJson, visible, setPanel, hidePanel }
}
