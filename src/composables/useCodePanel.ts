import { ref } from 'vue'
import type { CodeFile } from '../definitions/code-snippets/types'

export type { CodeFile }

// 全局响应式状态：供 demo 页面写入、App 级别持久化的 CodeViewer 读取。
const files = ref<CodeFile[]>([])
const triggersJson = ref<unknown[] | null>(null)
const visible = ref(false)

export function useCodePanel() {
  function setPanel(newFiles: CodeFile[], json?: unknown[] | null) {
    const nextJson = json ?? null
    // 快路径：同一 demo 内重复进入时 files 引用相同（模块级常量 codeFiles），
    // 且 json 也未变 → 跳过对下游 ref 的赋值与 trigger 调度，
    // CodeViewer 的 watcher / watch(props.files) 不会无意义地重跑。
    // visible 仍需同步，避免 hidePanel 后重新 setPanel 时面板保持隐藏。
    if (files.value === newFiles && triggersJson.value === nextJson) {
      const nextVisible = newFiles.length > 0
      if (visible.value !== nextVisible) {
        visible.value = nextVisible
      }
      return
    }
    files.value = newFiles
    triggersJson.value = nextJson
    visible.value = newFiles.length > 0
  }

  function hidePanel() {
    visible.value = false
  }

  return { files, triggersJson, visible, setPanel, hidePanel }
}
