import type { CodeFile } from './types'

export const codeFiles: CodeFile[] = [
  {
    filename: 'setup.ts',
    content: `import type { War3Editor } from 'triggerix-ui-preset-war3'

const buttonOptions = [
  { value: 'fill_title', label: '填入标题按钮' },
  { value: 'fill_width', label: '填入宽度按钮' },
  { value: 'fill_url', label: '填入网址按钮' }
]

const inputOptions = [{ value: 'target', label: '目标输入框' }]

export function setup(editor: War3Editor) {
  registerSharedTools(editor)
  // value_source: 一组 $ref 选项（document.title / window.innerWidth ...）
  registerValueTools(editor)

  editor.registerTool('button_picker', {
    label: '选择按钮',
    type: 'leaf',
    input: { type: 'select', options: buttonOptions },
    resolve: (input) => input
  })
  editor.registerTool('input_picker', {
    label: '选择输入框',
    type: 'leaf',
    input: { type: 'select', options: inputOptions },
    resolve: (input) => input
  })

  editor.registerEvent({
    type: 'button_click',
    template: '\${button}被点击',
    slots: { button: { label: '按钮', tools: ['button_picker'] } }
  })

  // value 槽位允许两种工具：从下拉选 $ref，或直接打字
  editor.registerAction({
    type: 'set_input_value',
    template: '设置\${input}的值为\${value}',
    slots: {
      input: { label: '输入框', tools: ['input_picker'] },
      value: { label: '值', tools: ['value_source', 'text_input'] }
    }
  })
}
`
  },
  {
    filename: 'handlers.ts',
    content: `import type { DemoActionHandler } from '../composables/useDemoRuntime'

interface InputController {
  setValue: (target: string, value: string) => void
}

// 沿着 'document.title' 这样的路径在 globalThis 上取值
function resolveRefPath(path: string): unknown {
  return path.split('.').reduce<unknown>(
    (cur, p) => (cur == null ? undefined : (cur as Record<string, unknown>)[p]),
    globalThis
  )
}

// 槽位的值可能是 { $ref: 'window.innerWidth' }，也可能是普通字符串
function resolveValueParam(raw: unknown): string {
  if (raw && typeof raw === 'object' && '$ref' in (raw as Record<string, unknown>)) {
    const ref = (raw as { $ref: unknown }).$ref
    if (typeof ref === 'string') {
      const v = resolveRefPath(ref)
      return v == null ? '' : String(v as string | number)
    }
  }
  return raw == null ? '' : String(raw as string | number)
}

export function createHandlers(controller: InputController): Record<string, DemoActionHandler> {
  return {
    set_input_value: (params) => {
      const target = String((params?.input as string) ?? '')
      controller.setValue(target, resolveValueParam(params?.value))
    }
  }
}
`
  }
]
