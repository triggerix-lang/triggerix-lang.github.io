import { defineAtomicTools, UIBuilder, type DomainTool } from '@triggerix-ai/builder'
import type { ComponentDef } from '@triggerix-ai/component'
import {
  components as nativeComponents,
  button,
  checkbox,
  input,
  select,
  uploadButton
} from 'triggerix-ai-component-native'

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

/**
 * 12 个 action 的元数据：
 *  - 6 个普通业务 action（update_nickname / set_gender / add_to_order /
 *    remove_from_order / clear_orders / switch_tab）
 *  - 1 个特殊 action（emit_event —— 由 useChatSession 注册并处理卸载，不进 businessHandlers）
 *  - 5 个订单状态机 + 优惠券 action（submit_order / pay_order / cancel_order / apply_coupon / clear_coupon）
 *
 * prompt 只给通用提示（取值来源 / 校验规则 / 与 domain 工具的联动），无具体业务实例。
 */
const BUSINESS_ACTIONS: BusinessActionSpec[] = [
  {
    type: 'update_nickname',
    label: '修改昵称',
    description: '把用户的昵称改成 params.nickname 字符串。',
    params: {
      nickname: { type: 'string', required: true, description: '新的昵称（非空）' }
    },
    prompt: 'params.nickname 必填且非空字符串。'
  },
  {
    type: 'set_gender',
    label: '设置性别',
    description: '把用户的性别改成 params.gender。',
    params: {
      gender: {
        type: 'string',
        required: true,
        description:
          '性别取值；构造表单前先用 get_options(<field>) 拉取合法 value/label 列表，gender 取对应选项的 value'
      }
    },
    prompt:
      '构造表单前**必须**先调 `get_options("<field>")` 拿到合法 value/label 列表，' +
      'radio/select 的 options 直接用返回的数组。params.gender 取对应选项的 value 字段。'
  },
  {
    type: 'add_to_order',
    label: '加入订单',
    description: '把一道菜加入当前订单（已有则累加数量）。',
    params: {
      dish_id: {
        type: 'string',
        required: true,
        description: '菜品 ID；不确定时先用 get_menu() 查'
      },
      qty: { type: 'number', description: '数量，默认 1' }
    },
    prompt: '不确定 dish_id 时**先调** `get_menu()` 查当前菜单，不要凭空编造。'
  },
  {
    type: 'remove_from_order',
    label: '从订单移除',
    description: '从订单中移除某道菜（按 dish_id 整条删除）。',
    params: {
      dish_id: {
        type: 'string',
        required: true,
        description: '菜品 ID；不确定时先用 get_menu() 查'
      }
    },
    prompt: '不确定 dish_id 时**先调** `get_menu()` 查当前菜单。'
  },
  {
    type: 'clear_orders',
    label: '清空订单',
    description: '清空整个订单（一键取消所有菜品）。',
    prompt: '无参数。一键清空整个订单。'
  },
  {
    type: 'switch_tab',
    label: '切换 tab',
    description: '切换手机底部 tab。',
    params: {
      tab: {
        type: 'string',
        required: true,
        description: 'tab id（合法值由 get_tabs() 返回）'
      }
    },
    prompt: 'params.tab 必填，可选值由 `get_tabs()` 工具返回。'
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
    },
    prompt: '关闭/取消场景固定传 event="editor.cancelled"。'
  },
  // ============================================================
  // 订单状态机 + 优惠券（5 个）
  // ============================================================
  {
    type: 'submit_order',
    label: '提交订单',
    description: '把当前购物车提交为待支付订单。',
    prompt:
      '无参数。购物车为空时直接报错。提交成功后 cart 清空、coupon 自动清除。' +
      '成功返回 data.order_id 可在后续 pay_order 里引用。'
  },
  {
    type: 'pay_order',
    label: '支付订单',
    description: '支付一个 pending_payment 订单。',
    params: {
      order_id: {
        type: 'string',
        description:
          '订单 id；省略时自动取最新一笔 pending_payment。仅在 user message 明确指定某笔订单时才传。'
      },
      method: {
        type: 'string',
        required: true,
        description:
          '支付方式；构造 radio/select 之前**必须先调** get_payment_methods() 拿合法 value/label',
        enum: ['wechat', 'alipay', 'card']
      }
    },
    prompt:
      'method 必填，enum: wechat / alipay / card。' +
      '构造支付方式选择卡前**必须先调** get_payment_methods() 拿合法 value/label 数组。' +
      'order_id 可省略，省略时自动取最新一笔 pending_payment。'
  },
  {
    type: 'cancel_order',
    label: '取消订单',
    description: '取消一个 pending_payment 订单。已支付/已取消的不能再次取消。',
    params: {
      order_id: { type: 'string', required: true, description: '订单 id' }
    }
  },
  {
    type: 'apply_coupon',
    label: '应用优惠券',
    description: '应用一张优惠券到当前购物车。',
    params: {
      coupon_id: {
        type: 'string',
        required: true,
        description: '优惠券 id；构造选择表单前先调 get_coupons()'
      }
    },
    prompt:
      '构造优惠券选择表单前**必须先调** get_coupons() 拿合法 coupon_id。' +
      '会校验购物车非空 + 满足 minSpend，不满足时报错，coupon 不会被应用。'
  },
  {
    type: 'clear_coupon',
    label: '清除优惠券',
    description: '清除当前已应用的优惠券。',
    prompt: '无参数。'
  }
]

// ============================================================
// Domain 工具（业务动态数据源，由调用方在 buildAtomicTools 里注入）
// ============================================================

/** 给 LLM 用的下拉选项形态（与 radio / select 组件 options 字段兼容） */
export interface OptionItem {
  value: string
  label: string
}

/**
 * Domain 工具集合的运行时数据源。
 * 调用方在 buildAtomicTools 时注入，保证 builder 库不绑死任何业务数据。
 */
export interface DomainDataSources {
  /** 当前菜单（dish_id 列表 + 名称 + 价格等） */
  menu: () => ReadonlyArray<OptionItem & { price?: number; category?: string }>
  /** 当前 tab 列表 */
  tabs: () => ReadonlyArray<OptionItem>
  /**
   * 按"字段 key"（如 "user.gender"）提供的下拉选项。
   * key 不存在 → 返回 undefined；LLM 会收到 options: null。
   */
  options: (field: string) => ReadonlyArray<OptionItem> | undefined
  /** 所有可用优惠券（id + label + minSpend + description） */
  coupons: () => ReadonlyArray<OptionItem & { minSpend: number; description?: string }>
  /** 合法支付方式列表（value + label） */
  paymentMethods: () => ReadonlyArray<OptionItem>
}

/**
 * 把 DomainDataSources 包成 5 个 domain tool，统一进 defineAtomicTools。
 * （get_options / get_menu / get_tabs / get_coupons / get_payment_methods）
 */
function createDomainTools(src: DomainDataSources): ReadonlyArray<DomainTool> {
  return [
    {
      name: 'get_options',
      description:
        '取指定字段的合法 value/label 列表。radio / select 组件需要 options 时**必须先调**这个工具。',
      params: {
        field: {
          type: 'string',
          required: true,
          description: '字段 key（如 "user.gender"），与业务 action 的字段名一致'
        }
      },
      handler: (args) => {
        const field = typeof args.field === 'string' ? args.field : ''
        const opts = src.options(field)
        return opts ?? null
      },
      parallel: true
    },
    {
      name: 'get_menu',
      description:
        '取当前菜单菜品列表（id + 名称 + 价格 + 分类）。add_to_order / remove_from_order 不确定 dish_id 时**必须先调**这个工具。',
      params: {},
      handler: () => src.menu()
    },
    {
      name: 'get_tabs',
      description:
        '取当前 app 的 tab 列表（id + 显示名）。switch_tab 不确定 tab 取值时**必须先调**这个工具。',
      params: {},
      handler: () => src.tabs(),
      parallel: true
    },
    {
      name: 'get_coupons',
      description:
        '取所有可用优惠券（id + label + minSpend + description）。构造优惠券选择表单前**必须先调**这个工具。',
      params: {},
      handler: () => src.coupons(),
      parallel: true
    },
    {
      name: 'get_payment_methods',
      description:
        '取合法支付方式列表（value + label）。构造支付方式选择卡（radio/select）前**必须先调**这个工具。',
      params: {},
      handler: () => src.paymentMethods(),
      parallel: true
    }
  ]
}

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
  /** 5 个 builder atomic + 5 个 domain 工具的统一 executeCall 入口（submit 不走这里） */
  executeCall: ReturnType<typeof defineAtomicTools>['executeCall']
}

/**
 * 构造 demo 用的 atomic tool bundle：
 *  - 收集 native 组件 + 业务 action 的元数据
 *  - 业务动态数据源（菜单 / tabs / options）包成 domain tools
 *  - 拼成 system prompt 喂给 builder
 *  - atomic + domain tool schema + UIBuilder 由 builder 提供
 */
export function buildAtomicTools(src: DomainDataSources): AtomicToolsBundle {
  ensureNativeEventsBound()
  const builder = new UIBuilder()

  const componentTypes = (nativeComponents as ReadonlyArray<ComponentDef<HTMLElement>>).map(
    (c) => c.type
  )
  const actionTypes = BUSINESS_ACTIONS.map((a) => a.type)
  const domainTools = createDomainTools(src)

  const appendix = renderAppendix(
    nativeComponents as ReadonlyArray<ComponentDef<HTMLElement>>,
    BUSINESS_ACTIONS
  )

  const { systemPrompt, toolDefinitions, executeCall } = defineAtomicTools(builder, {
    componentTypes,
    actionTypes,
    domainTools,
    systemPromptAppendix: appendix
  })

  return { systemPrompt, toolDefinitions, builder, executeCall }
}

// ============================================================
// 内部：把组件清单 / 业务 action 渲染成 markdown 段，喂给 builder 的 systemPromptAppendix
// ============================================================

function renderAppendix(
  components: ReadonlyArray<ComponentDef<unknown>>,
  actions: BusinessActionSpec[]
): string {
  const lines: string[] = []

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

  lines.push('## props 用 `$ref` 引用运行时值', '')
  lines.push(
    '在 `addComponent` 或 `updateComponentProp` 的 props / value 里，可以用字符串 **"$ref:<source>.<field>"** 引用运行时状态。',
    '挂载时前端会自动解析成真实值再传给组件 create()。',
    '',
    '两种典型用法：',
    '',
    '1. **设置组件初始值** —— 构造表单时，凡是有 `value` 字段的组件（input / radio / select ...），' +
      '都应当用 `"$ref:user.<field>"` 引用当前状态，让用户打开表单就看到自己当前的数据，而不是空白。',
    '2. **trigger 引用同草稿内的组件值** —— `addTrigger` 的 `actionParams` 里，用 `"$ref:<componentName>.<path>"** ' +
      '指向本草稿内其他已添加组件的值（如某 input 的当前 value）。',
    '',
    '通用语法：',
    '',
    '```',
    'value: "$ref:user.<field>"         // 当前用户态字段（具体可用字段由调用方在附录说明）',
    'value: "$ref:<componentName>.<path>" // 同草稿内另一个已添加组件的值（如 "$ref:nickInput.value"）',
    '```',
    '',
    '$ref 是字面字符串协议，不参与 JSON.parse。',
    ''
  )

  return lines.join('\n')
}
