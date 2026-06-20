import { defineAtomicTools, UIBuilder } from '@triggerix-ai/builder'
import type { ComponentDef } from '@triggerix-ai/component'
import {
  components as nativeComponents,
  button,
  checkbox,
  input,
  select,
  uploadButton
} from 'triggerix-ai-component-native'
import { MENU_DATA } from './menuData'

// ============================================================
// 业务 action 元数据（每个 handler 自带 type / label / description / params / prompt）
// 业务侧改动只动这一个数组即可。
// ============================================================

export interface BusinessActionSpec {
  /** action type（和 handler 名一致） */
  type: string
  /** 人类可读名 */
  label: string
  /** 一句话描述 */
  description: string
  /** 参数 schema（给 LLM 看） */
  params?: Record<
    string,
    {
      type?: 'string' | 'number' | 'boolean' | 'object'
      description?: string
      required?: boolean
      enum?: unknown[]
    }
  >
  /** 使用提示 / 注意事项（可选） */
  prompt?: string
}

/** 7 个业务 action 的元数据 */
const BUSINESS_ACTIONS: BusinessActionSpec[] = [
  {
    type: 'update_nickname',
    label: '修改昵称',
    description: '把用户的昵称改成 params.nickname 字符串。',
    params: {
      nickname: { type: 'string', required: true, description: '新的昵称（非空）' }
    }
  },
  {
    type: 'set_gender',
    label: '设置性别',
    description: '把用户的性别改成 params.gender。',
    params: {
      gender: {
        type: 'string',
        required: true,
        enum: ['male', 'female', 'other'],
        description: 'male=男，female=女，other=保密'
      }
    }
  },
  {
    type: 'add_to_order',
    label: '加入订单',
    description: '把一道菜加入当前订单（已有则累加数量）。',
    params: {
      dish_id: { type: 'string', required: true, description: '菜品 ID（见下方"报菜名菜单"）' },
      qty: { type: 'number', description: '数量，默认 1' }
    }
  },
  {
    type: 'remove_from_order',
    label: '从订单移除',
    description: '从订单中移除某道菜（按 dish_id 整条删除）。',
    params: {
      dish_id: { type: 'string', required: true, description: '菜品 ID（见下方"报菜名菜单"）' }
    }
  },
  {
    type: 'clear_orders',
    label: '清空订单',
    description: '清空整个订单（一键取消所有菜品）。'
  },
  {
    type: 'switch_tab',
    label: '切换 tab',
    description: '切换手机底部 tab。',
    params: {
      tab: {
        type: 'string',
        required: true,
        enum: ['menu', 'orders', 'profile'],
        description: 'menu=菜单，orders=订单，profile=我的'
      }
    }
  },
  {
    type: 'emit_event',
    label: 'emit 内部事件',
    description: '触发内部事件（用于取消/关闭按钮，UI 自动卸载）。',
    params: {
      event: {
        type: 'string',
        required: true,
        description: '事件名，关闭场景固定传 "editor.cancelled"'
      }
    }
  }
]

// ============================================================
// Native 组件事件绑定（事件是 schema/契约，需要在 buildAtomicTools() 调之前绑好，
// 这样 builder 通过 nativeComponents[i].events 就能拿到组件的可触发事件清单）
// ============================================================

let nativeEventsBound = false
function ensureNativeEventsBound() {
  if (nativeEventsBound) return
  nativeEventsBound = true
  button.bind('click', 'button.click')
  input.bind('blur', 'input.blur').bind('change', 'input.change')
  checkbox.bind('change', 'checkbox.change')
  select.bind('change', 'select.change')
  uploadButton.bind('change', 'upload.complete')
}

// ============================================================
// Atomic tool bundle
// ============================================================

export interface AtomicToolsBundle {
  systemPrompt: string
  toolDefinitions: ReturnType<typeof defineAtomicTools>['toolDefinitions']
  builder: UIBuilder
}

/** 报菜名菜单的人类可读字符串 */
const MENU_FLAT_STRING = MENU_DATA.map(
  (d) => `- ${d.id}: ${d.name} (¥${d.price}, 分类: ${d.category})`
).join('\n')

/**
 * 构造 demo 用的 atomic tool bundle：
 *  - 收集 native 组件 + 业务 action 的元数据
 *  - 拼成 system prompt 喂给 builder
 *  - 5 个 atomic tool schema + UIBuilder 由 builder 提供
 */
export function buildAtomicTools(): AtomicToolsBundle {
  ensureNativeEventsBound()
  const builder = new UIBuilder()

  const componentTypes = (nativeComponents as ReadonlyArray<ComponentDef<HTMLElement>>).map(
    (c) => c.type
  )
  const actionTypes = BUSINESS_ACTIONS.map((a) => a.type)

  const appendix = renderAppendix(
    nativeComponents as ReadonlyArray<ComponentDef<HTMLElement>>,
    BUSINESS_ACTIONS
  )

  const { systemPrompt, toolDefinitions } = defineAtomicTools(builder, {
    componentTypes,
    actionTypes,
    systemPromptAppendix: appendix
  })

  return { systemPrompt, toolDefinitions, builder }
}

// ============================================================
// 内部：把组件清单 / 业务 action 渲染成 markdown 段，喂给 builder 的 systemPromptAppendix
// ============================================================

function renderAppendix(
  components: ReadonlyArray<ComponentDef<unknown>>,
  actions: BusinessActionSpec[]
): string {
  const lines: string[] = []

  lines.push('## 当前 app 业务上下文', '')
  lines.push('你运行在一个手机点餐 app 里，三个 tab：', '')
  lines.push('- menu（首页菜单）：展示菜品', '')
  lines.push('- orders（订单）：展示用户当前已点的菜', '')
  lines.push('- profile（我的）：展示昵称、性别', '')
  lines.push('', '**报菜名菜单**（dish_id 取值）：', '')
  lines.push(MENU_FLAT_STRING, '')

  lines.push('## 可用组件', '')
  for (const c of components) {
    lines.push(`### \`${c.type}\` — ${c.label}`, '')
    lines.push(c.description, '')
    if (c.prompt) lines.push(c.prompt, '')
    if (c.events && c.events.length > 0) {
      lines.push(`可触发事件：${c.events.map((e) => `\`${e}\``).join(' / ')}`, '')
    }
    if (c.props) {
      lines.push('props：', '')
      for (const [k, v] of Object.entries(c.props)) {
        const req = v.required ? '**必填**' : '可选'
        const en = v.enum ? ` ∈ {${v.enum.map((x) => JSON.stringify(x)).join(', ')}}` : ''
        const t = v.type ? ` (${v.type})` : ''
        lines.push(`  - \`${k}\`${t} ${req}：${v.description ?? ''}${en}`)
      }
      lines.push('')
    }
  }

  lines.push('## 可用 action（addTrigger 的 actionType 字段）', '')
  for (const a of actions) {
    lines.push(`### \`${a.type}\` — ${a.label}`, '')
    lines.push(a.description, '')
    if (a.prompt) lines.push(a.prompt, '')
    if (a.params) {
      lines.push('参数：', '')
      for (const [k, v] of Object.entries(a.params)) {
        const req = v.required ? '**必填**' : '可选'
        const en = v.enum ? ` ∈ {${v.enum.map((x) => JSON.stringify(x)).join(', ')}}` : ''
        const t = v.type ? ` (${v.type})` : ''
        lines.push(`  - \`${k}\`${t} ${req}：${v.description ?? ''}${en}`)
      }
      lines.push('')
    }
  }

  lines.push('## props 用 `$ref` 引用当前用户数据', '')
  lines.push(
    '在 `addComponent` 的 props 里，`value` 字段可以用 `"$ref:user.<field>"` 引用当前 app 状态，' +
      '挂载时前端会自动替换成真实值。',
    ''
  )
  lines.push('例：', '')
  lines.push('```', '')
  lines.push('addComponent({')
  lines.push('  type: "input",')
  lines.push('  name: "nick",')
  lines.push('  props: { value: "$ref:user.nickname", placeholder: "新昵称" }')
  lines.push('})')
  lines.push('')
  lines.push('addComponent({')
  lines.push('  type: "radio",')
  lines.push('  name: "gen",')
  lines.push('  props: { options: ["male", "female", "other"], value: "$ref:user.gender" }')
  lines.push('})')
  lines.push('```', '')
  lines.push('当前支持的 source：', '')
  lines.push('- `user.nickname` → 当前用户昵称')
  lines.push('- `user.gender` → 当前用户性别（male / female / other）', '')

  return lines.join('\n')
}
