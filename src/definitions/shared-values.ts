import type { LeafToolInput, War3Editor } from 'triggerix-ui-preset-war3'

/**
 * Pre-defined "value sources" pulled from the host page. Each option
 * resolves to a `$ref` expression so demos can wire up live page values
 * without writing custom code.
 */
export function registerValueTools(editor: War3Editor) {
  const options = [
    { value: { $ref: 'document.title' }, label: '网站标题' },
    { value: { $ref: 'window.innerHeight' }, label: '页面高度' },
    { value: { $ref: 'window.innerWidth' }, label: '页面宽度' },
    { value: { $ref: 'location.href' }, label: '当前网址' }
  ] as unknown as LeafToolInput['options']

  editor.registerTool('value_source', {
    label: '选择值来源',
    type: 'leaf',
    input: {
      type: 'select',
      options
    },
    resolve: (input: unknown) => input
  })
}
