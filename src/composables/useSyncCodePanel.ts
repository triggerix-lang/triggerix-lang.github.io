import type { Ref } from 'vue'
import { watch } from 'vue'
import type { CodeFile } from '../definitions/code-snippets/types'
import { useCodePanel } from './useCodePanel'

/**
 * 把当前 demo 的 codeFiles + triggersJson 同步到全局面板。
 * 立即执行一次（immediate），之后随 triggersJson 变化保持同步。
 * flush:'sync' 保证 setup 阶段同步写入，不依赖 DOM 挂载。
 */
export function useSyncCodePanel(
  codeFiles: CodeFile[],
  triggersJson: Ref<unknown[] | null | undefined>
) {
  const { setPanel } = useCodePanel()
  watch(triggersJson, (v) => setPanel(codeFiles, v), { immediate: true, flush: 'sync' })
}
