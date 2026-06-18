import type { War3Editor } from 'triggerix-ui-preset-war3'
import { defineLeafTool } from 'triggerix-ui-preset-war3'

/**
 * Generic input tools shared by every demo: a plain text field and a
 * numeric field. They simply forward the raw input value.
 */
export function registerSharedTools(editor: War3Editor) {
  editor.registerTool(
    'text_input',
    defineLeafTool({
      label: '文本输入',
      input: { type: 'text', placeholder: '请输入文本...' },
      resolve: (input: string) => input
    })
  )

  editor.registerTool(
    'number_input',
    defineLeafTool({
      label: '数字输入',
      input: { type: 'number', placeholder: '请输入数字...' },
      resolve: (input: string) => Number(input)
    })
  )
}
