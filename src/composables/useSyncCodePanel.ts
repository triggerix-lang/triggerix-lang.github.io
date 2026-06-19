import type { Ref } from 'vue'
import { onMounted, watch } from 'vue'
import type { CodeFile } from '../definitions/code-snippets/types'
import { useCodePanel } from './useCodePanel'

/**
 * 路由进入时立即把 codeFiles + triggersJson 推一次到全局面板，
 * 之后随 triggersJson 变化保持同步。
 *
 * 不用 watchEffect：triggersJson 跨路由可能值相等，
 * 导致路由切换时不会再次写入 files，CodeViewer 不会刷新。
 */
export function useSyncCodePanel(
  codeFiles: CodeFile[],
  triggersJson: Ref<unknown[] | null | undefined>
) {
  const { setPanel } = useCodePanel()
  onMounted(() => setPanel(codeFiles, triggersJson.value))
  watch(triggersJson, (v) => setPanel(codeFiles, v))
}
