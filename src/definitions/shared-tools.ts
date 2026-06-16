import type { War3Editor } from 'triggerix-ui-preset-war3'

/**
 * Generic input tools shared by every demo: a plain text field and a
 * numeric field. They simply forward the raw input value.
 */
export function registerSharedTools(editor: War3Editor) {
  editor.registerTool('text_input', {
    label: '文本输入',
    type: 'leaf',
    input: { type: 'text', placeholder: '请输入文本...' },
    resolve: (input: unknown) => input
  })

  editor.registerTool('number_input', {
    label: '数字输入',
    type: 'leaf',
    input: { type: 'number', placeholder: '请输入数字...' },
    resolve: (input: unknown) => Number(input)
  })
}
