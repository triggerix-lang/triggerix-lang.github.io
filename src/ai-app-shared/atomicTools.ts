import { defineAtomicTools, UIBuilder, type DomainTool } from '@triggerix-ai/builder'
import type { ComponentDef } from '@triggerix-ai/component'
import type { ToolParamDef } from '@triggerix-ai/fn'
import {
  components as nativeComponents,
  button,
  checkbox,
  input,
  select,
  uploadButton
} from 'triggerix-ai-component-native'
import type { ToolHandler, ToolCtx, ToastTone } from './businessHandlers'

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
  /** 参数 schema（给 LLM 看，复用 builder 库的 ToolParamDef —— 字段全 + 可选 array/integer 等） */
  params?: Record<string, ToolParamDef>
  /** 使用提示 / 注意事项（可选） */
  prompt?: string
}

/**
 * 18 个 action 的元数据：
 *  - 2 个基础用户 action（update_nickname / set_gender）
 *  - 6 个默认偏好 action（update_default_dining_mode / update_default_utensil_count /
 *    update_default_notes / update_dietary_preference / update_taste_preference /
 *    update_dietary_restriction）
 *  - 3 个订单 CRUD action（add_to_order / remove_from_order / clear_orders）
 *  - 1 个 tab action（switch_tab）
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
  // 默认偏好（6 个）—— 与 set_gender 同模式：enum 取值走 get_options(<field>)
  // ============================================================
  {
    type: 'update_default_dining_mode',
    label: '设置默认就餐方式',
    description: '把默认就餐方式改成 params.mode。',
    params: {
      mode: {
        type: 'string',
        required: true,
        description:
          '就餐方式取值；构造表单前先用 get_options("user.defaultDiningMode") 拉取合法 value/label 列表'
      }
    },
    prompt:
      '构造表单前**必须**先调 `get_options("user.defaultDiningMode")` 拿到合法 value/label 列表。'
  },
  {
    type: 'update_default_utensil_count',
    label: '设置默认餐具数量',
    description: '把默认餐具数量（0-3 份）改成 params.count。',
    params: {
      count: {
        type: 'integer',
        required: true,
        description: '0-3 之间的整数；构造表单前先调 get_options("user.defaultUtensilCount")'
      }
    },
    prompt:
      'params.count 必填，0-3 之间的整数。构造表单前**必须**先调 `get_options("user.defaultUtensilCount")`。'
  },
  {
    type: 'update_default_notes',
    label: '设置默认备注',
    description: '把默认下单备注改成 params.notes 字符串。',
    params: {
      notes: { type: 'string', required: true, description: '新的默认备注（非空）' }
    },
    prompt: 'params.notes 必填且非空字符串。'
  },
  {
    type: 'update_dietary_preference',
    label: '设置饮食偏好',
    description: '把饮食偏好改成 params.preference。',
    params: {
      preference: {
        type: 'string',
        required: true,
        description:
          '饮食偏好取值；构造表单前先用 get_options("user.dietaryPreference") 拉取合法 value/label 列表'
      }
    },
    prompt:
      '构造表单前**必须**先调 `get_options("user.dietaryPreference")` 拿到合法 value/label 列表。'
  },
  {
    type: 'update_taste_preference',
    label: '设置口味偏好',
    description: '把口味偏好改成 params.preference。',
    params: {
      preference: {
        type: 'string',
        required: true,
        description:
          '口味偏好取值；构造表单前先用 get_options("user.tastePreference") 拉取合法 value/label 列表'
      }
    },
    prompt:
      '构造表单前**必须**先调 `get_options("user.tastePreference")` 拿到合法 value/label 列表。'
  },
  {
    type: 'update_dietary_restriction',
    label: '设置饮食禁忌',
    description: '把饮食禁忌改成 params.restriction。',
    params: {
      restriction: {
        type: 'string',
        required: true,
        description:
          '饮食禁忌取值；构造表单前先用 get_options("user.dietaryRestriction") 拉取合法 value/label 列表'
      }
    },
    prompt:
      '构造表单前**必须**先调 `get_options("user.dietaryRestriction")` 拿到合法 value/label 列表。'
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
  /**
   * 5 个 builder atomic + 5 个 domain + 17 个业务 action 的统一 executeCall 入口（submit 不走这里）。
   *
   * 在 builder 库原生 executeCall 外面包了一层 `addComponent` 必填 props 校验：
   * button / radio / select / image / label 漏掉必填项时直接返 `{ok:false, errors}`,
   * 逼 LLM 重试而不是渲染空表单挂到气泡里。
   */
  executeCall: ReturnType<typeof defineAtomicTools>['executeCall']
}

/**
 * 构造 demo 用的 atomic tool bundle：
 *  - 收集 native 组件 + 业务 action 的元数据
 *  - 业务动态数据源（菜单 / tabs / options）包成 domain tools
 *  - **业务 action（除 emit_event）也注册为 DomainTool** —— LLM 可以直接调
 *    `add_to_order` / `apply_coupon` / `submit_order` 等，不再强制走 UI 表单
 *  - 拼好 system prompt 喂给 builder（附录里说明两种调用方式）
 *  - atomic + domain tool schema + UIBuilder 由 builder 提供
 *  - executeCall 加一层 addComponent 必填 props 校验
 */
export function buildAtomicTools(
  src: DomainDataSources & {
    /**
     * 业务 handler 池（key 是 action.type，如 'add_to_order'）。
     * 传了就把这些 action 注册成 DomainTool 让 LLM 直接调；
     * 不传则只暴露 atomic + 5 个数据 domain 工具。
     */
    businessHandlers?: Map<string, ToolHandler>
    /** 业务 handler 内部 pushToast 的转发 */
    pushToast?: (message: string, tone?: ToastTone) => void
  }
): AtomicToolsBundle {
  ensureNativeEventsBound()
  const builder = new UIBuilder()

  // 注入编辑表单单元完整性校验：UIBuilder.submit() 时触发，
  // 任何返回的非空 errors 直接返给 LLM，让它在下一轮补完再 submit。
  // 这里只放"通用编辑表单"规则，不绑死任何具体业务字段。
  installFormCompletenessValidator(builder)

  const componentTypes = (
    nativeComponents as unknown as ReadonlyArray<ComponentDef<HTMLElement>>
  ).map((c) => c.type)
  const actionTypes = BUSINESS_ACTIONS.map((a) => a.type)
  const baseDomainTools = createDomainTools(src)
  const businessDomainTools = src.businessHandlers
    ? createBusinessActionTools(src.businessHandlers, src.pushToast)
    : []
  const domainTools = [...baseDomainTools, ...businessDomainTools]

  const appendix = renderAppendix(
    nativeComponents as unknown as ReadonlyArray<ComponentDef<HTMLElement>>,
    BUSINESS_ACTIONS,
    Boolean(src.businessHandlers)
  )

  const {
    systemPrompt,
    toolDefinitions,
    executeCall: rawExecuteCall
  } = defineAtomicTools(builder, {
    componentTypes,
    actionTypes,
    domainTools,
    systemPromptAppendix: appendix
  })

  // 包一层 addComponent 必填 props 校验。漏填必填项时直接当 tool_result 错误喂回去，
  // 逼 LLM 在下一轮补上，而不是把空表单挂到气泡里。
  const executeCall: typeof rawExecuteCall = async (name, args) => {
    if (name === 'addComponent') {
      const errors = validateAddComponentArgs(args)
      if (errors) return { ok: false, errors }
    }
    return rawExecuteCall(name, args)
  }

  return { systemPrompt, toolDefinitions, builder, executeCall }
}

/**
 * 把 17 个业务 action 包成 DomainTool（emit_event 由 useChatSession 特殊处理，跳过）。
 *
 * 关键设计：handler 的返回值会被 LLM 看到（作为 tool_result content），
 * 所以要按 DomainTool 的"data 优先 / 失败带 error"语义包装。
 *
 * 另：包一层 addComponent 必填 props 校验（button/label/uploadButton 必填 label，
 * radio/select 必填 options，image 必填 src）—— LLM 漏填会立刻报错让它重试，
 * 不至于渲染出"空表单"挂到气泡里让用户看个寂寞。
 */
function createBusinessActionTools(
  handlers: Map<string, ToolHandler>,
  pushToast?: (message: string, tone?: ToastTone) => void
): DomainTool[] {
  const tools: DomainTool[] = []
  for (const action of BUSINESS_ACTIONS) {
    // emit_event 是 useChatSession 的内部信号（卸载 UI），不进 LLM 工具列表
    if (action.type === 'emit_event') continue
    const handler = handlers.get(action.type)
    if (!handler) continue
    tools.push({
      name: action.type,
      description: action.description,
      params: action.params ?? {},
      handler: async (args) => {
        const ctx: ToolCtx = { msgId: -1, pushToast: pushToast ?? (() => {}) }
        const result = await handler(args, ctx)
        // DomainTool 协议：ok=true → 把 data 喂给 LLM；ok=false → 错误信息也要让 LLM 看到
        if (result.ok) {
          return result.data ?? { ok: true, message: result.message }
        }
        return { ok: false, error: result.message ?? 'unknown error' }
      }
    })
  }
  return tools
}

/**
 * addComponent 必填 props 后置校验。
 *
 * builder 库自身只校验 component type 白名单 + name 唯一性，不校验 props 完整性。
 * LLM 经常调用 `addComponent("radio", "x", {})` 这种"半成品"，submit 后挂到气泡里
 * 用户看到的是空表单。补一层校验，把错直接当 tool_result 喂回去逼 LLM 修正。
 */
export function validateAddComponentArgs(args: Record<string, unknown>): string[] | null {
  const type = typeof args.type === 'string' ? args.type : ''
  const name = typeof args.name === 'string' ? args.name : '<unnamed>'
  const props = (args.props && typeof args.props === 'object' ? args.props : {}) as Record<
    string,
    unknown
  >
  const errors: string[] = []

  // 必填项校验
  if (type === 'button' || type === 'uploadButton') {
    if (typeof props.label !== 'string' || props.label.length === 0) {
      errors.push(`Component "${name}" (${type}) 必填 props.label（按钮文字）`)
    }
  }
  if (type === 'radio' || type === 'select') {
    if (!Array.isArray(props.options) || props.options.length === 0) {
      errors.push(
        `Component "${name}" (${type}) 必填 props.options 数组 —— 调 get_options / get_menu / get_coupons / get_payment_methods 拿数据`
      )
    }
  }
  if (type === 'image') {
    if (typeof props.src !== 'string' || props.src.length === 0) {
      errors.push(`Component "${name}" (image) 必填 props.src（图片 URL）`)
    }
  }
  if (type === 'label') {
    if (typeof props.text !== 'string' || props.text.length === 0) {
      errors.push(`Component "${name}" (label) 必填 props.text（标签文字）`)
    }
  }
  // input / radio / select：value 必填，且必须是 "$ref:user.<field>" 字符串。
  // 编辑表单语义下，value 表示"用户当前的数据"，必须回显给用户；留空会让用户看到空表单。
  if (type === 'input' || type === 'radio' || type === 'select') {
    const v = props.value
    if (typeof v !== 'string' || !v.startsWith('$ref:')) {
      errors.push(
        `Component "${name}" (${type}) 必填 props.value，且必须是 "$ref:user.<field>" 字符串 —— 引用当前用户态，让用户打开表单看到自己的数据`
      )
    }
  }

  return errors.length === 0 ? null : errors
}

/**
 * 注入"编辑表单单元完整性"校验到 UIBuilder.onBeforeSubmit。
 *
 * 校验 5 条通用规则（不绑死任何具体业务字段）：
 *  1. 草稿里有可编辑字段（input / radio / select / checkbox）→ 必须有 button
 *     否则用户改完没法提交
 *  2. 每个可编辑字段的 value 必须用 "$ref:user.<field>" 引用当前态
 *     否则用户打开表单看到的是空值，违反"修改"语义
 *  3. radio / select 必须有非空 options 数组（addComponent 阶段已经会拦，
 *     这里再兜底防止 validator 在 addComponent 校验之前先跑）
 *  4. 草稿里有 button → 必须有 trigger 绑它，否则点了没反应
 *  5. label 数量必须 ≥ 可编辑字段数量 —— 用户需要知道每个控件是改什么的
 *
 * 校验不通过时 submit 返回 errors，LLM 在下一轮补完再 submit。
 */
export function installFormCompletenessValidator(builder: UIBuilder): void {
  builder.onBeforeSubmit((components, triggers) => {
    const errors: string[] = []
    const editables = components.filter((c) =>
      ['input', 'radio', 'select', 'checkbox'].includes(c.type)
    )
    const buttons = components.filter((c) => c.type === 'button')

    // 规则 1：可编辑字段 ↔ 提交按钮
    if (editables.length > 0 && buttons.length === 0) {
      errors.push(
        '草稿里有可编辑字段但没有提交按钮：加一个 button（label 用动词如"保存/修改/更新"）' +
          ' + addTrigger 绑定到对应的业务 action'
      )
    }

    // 规则 2：每个可编辑字段的 value 必须用 $ref:user.<field>
    for (const c of editables) {
      const v = (c.props ?? {}).value
      if (typeof v !== 'string' || !v.startsWith('$ref:')) {
        errors.push(
          `组件 "${c.name}" (${c.type}) 的 props.value 必须用 "$ref:user.<field>" 字符串 —— 编辑表单要让用户打开就看到自己现有的数据`
        )
      }
    }

    // 规则 3：radio / select 的 options 必须是非空数组（兜底，正常 addComponent 已拦）
    for (const c of components.filter((x) => x.type === 'radio' || x.type === 'select')) {
      const opts = (c.props ?? {}).options
      if (!Array.isArray(opts) || opts.length === 0) {
        errors.push(
          `组件 "${c.name}" (${c.type}) 缺 props.options —— 先调 get_options("<field>") / get_menu() / get_coupons() / get_payment_methods() 拿数据`
        )
      }
    }

    // 规则 4：有 button 必须有 trigger
    if (buttons.length > 0 && triggers.length === 0) {
      errors.push(
        '草稿里有 button 但没有任何 addTrigger —— 按钮点了没反应，调 addTrigger 把它绑到业务 action'
      )
    }

    // 规则 5：每个可编辑字段必须有 1 个 label —— 用户需要知道每个控件是改什么的
    const labels = components.filter((c) => c.type === 'label')
    if (editables.length > labels.length) {
      errors.push(
        `草稿里有 ${editables.length} 个可编辑字段（input/radio/select/checkbox），但只有 ${labels.length} 个 label —— 每个可编辑字段必须有 1 个 label（props.text = 字段中文名，如"饮食偏好"），用户需要知道每个控件是改什么的`
      )
    }

    return errors
  })
}

// ============================================================
// 内部：把组件清单 / 业务 action 渲染成 markdown 段，喂给 builder 的 systemPromptAppendix
// ============================================================

function renderAppendix(
  components: ReadonlyArray<ComponentDef<unknown>>,
  actions: BusinessActionSpec[],
  /**
   * true → 业务 action 已注册为可直调的 DomainTool，附录里要说明两种调用方式
   * （直接调 / 构造 UI 表单），并强制 LLM 在用户没给全参数时走表单路线。
   * false → 没注册，LLM 看不到这些 action，跳过这段。
   */
  businessActionsDirectCallable: boolean
): string {
  const lines: string[] = []

  // ============================================================
  // 组件清单（先于 override，让 LLM 把组件 props 必填项记牢）
  // ============================================================
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

  // ============================================================
  // 业务 action 两种调用方式（放在组件 / action 列表之后，
  // 这样 LLM 已经看过组件必填 props，再看 override 不会漏）
  // ============================================================
  if (businessActionsDirectCallable) {
    lines.push(
      '## 业务 action 的两种调用方式',
      '',
      '业务 action（`add_to_order` / `apply_coupon` / `submit_order` / `pay_order` / `update_nickname` / `set_gender` / 等）有两种合法调用方式：',
      '',
      '### 方式 A — 直接调用 action 工具（仅当用户当前消息**已经给出所有必需参数**）',
      '',
      '| 用户说 | 直接调 |',
      '| --- | --- |',
      '| "加一份蒸羊羔" | `add_to_order({dish_id: "蒸羊羔", qty: 1})` |',
      '| "用满200减30券" | `apply_coupon({coupon_id: "man200jian30"})` |',
      '| "把昵称改成张三" | `update_nickname({nickname: "张三"})` |',
      '| "把性别改成女" | `set_gender({gender: "female"})` |',
      '| "把默认就餐方式改成堂食" | `update_default_dining_mode({mode: "dine_in"})` |',
      '| "把默认餐具改成 2 份" | `update_default_utensil_count({count: 2})` |',
      '| "把默认备注改成少油少盐" | `update_default_notes({notes: "少油少盐"})` |',
      '| "把饮食偏好改成素食" | `update_dietary_preference({preference: "vegetarian"})` |',
      '| "把口味改成中辣" | `update_taste_preference({preference: "medium"})` |',
      '| "把饮食禁忌改成海鲜" | `update_dietary_restriction({restriction: "seafood"})` |',
      '| "提交订单" | `submit_order()` |',
      '| "用微信支付" | `pay_order({method: "wechat"})` |',
      '',
      '### 方式 B — 构造"编辑表单"逻辑单元（用户表达了意图但**没给完整参数**）',
      '',
      '当用户说"修改/编辑/设置/改 X" 类意图，但当前消息没有给出所有参数值时，' +
        '构造一个**编辑表单逻辑单元**。这个单元由以下组件构成（缺一不可）：',
      '',
      '**1. 输入控件 + 字段标签 —— 每个待编辑字段一组（label + input/radio/select/checkbox）**：',
      '- 文本/数字/密码 → `input`',
      '- 2-4 个互斥选项 → `radio`（options 先用 `get_options("<field>")` 拿）',
      '- 5+ 个选项 → `select`（同上）',
      '- 布尔 → `checkbox`',
      '- **每个可编辑字段前必须有 1 个 `label` 组件**（`props.text` = 字段中文名），用户需要知道每个控件是改什么的',
      '- `user.<field>` → 中文名映射：',
      '  - `user.nickname` → "昵称"',
      '  - `user.gender` → "性别"',
      '  - `user.defaultDiningMode` → "默认就餐方式"',
      '  - `user.defaultUtensilCount` → "默认餐具数量"',
      '  - `user.defaultNotes` → "默认备注"',
      '  - `user.dietaryPreference` → "饮食偏好"',
      '  - `user.tastePreference` → "口味偏好"',
      '  - `user.dietaryRestriction` → "饮食禁忌"',
      '- 推荐顺序：先 `label`，再对应 input/radio/select/checkbox；提交按钮放最后',
      '',
      '**2. 当前态回显 —— 每个输入控件的 `value` 用 `"$ref:user.<field>"`**：',
      '编辑场景下用户打开表单要看到自己现有的数据，value 字段必须用 `$ref` 字符串引用当前用户态（不是字面值）。',
      '新建场景（无当前态）才用字面默认值。',
      '',
      '**3. 数据源前置 —— radio/select 必须先调 domain 工具**：',
      'addComponent radio/select 之前，**必须**先调对应的 domain 工具' +
        '（`get_options("<field>")` / `get_menu()` / `get_coupons()` / `get_payment_methods()`）' +
        '拿到合法 value/label 数组，再传给 `props.options`。硬编码或瞎填会被校验拦截。',
      '',
      '**4. 提交按钮 + addTrigger 绑定**：',
      '- 1 个 `button`，`label` 用动词（保存/修改/更新/应用）',
      '- 通过 `addTrigger("button.click", "<按钮名>", "<actionType>", { ... })` 把它的 click 事件绑到对应的业务 action',
      '- 多字段表单调多次 `addTrigger`（eventType/eventSource 相同会自动 sequence 串行执行）',
      '- `actionParams` 里引用组件当前值用 `"$ref:<componentName>.value"`（注意是 `.value`，不要省略）',
      '',
      '**5. 最后必须调 `submit`**：不调 submit 只是草稿，不会显示。submit 时会跑完整性校验（缺组件 / 缺 trigger / value 不规范），错误信息直接告诉你具体缺什么，**补完再 submit**。',
      '',
      '### 完整性自检（submit 之前必走）',
      '- 用户消息里每个待编辑字段都有对应输入控件？',
      '- **每个可编辑字段前都有 1 个 label**（`props.text` = 字段中文名）？',
      '- 每个输入控件的 value 都用 `"$ref:user.<field>"`？',
      '- 至少有一个 button + 至少一个 addTrigger？',
      '- radio/select 的 options 来自 domain 工具（不是硬编码）？',
      '',
      '任何一项不满足 → 补完再 submit。**残缺草稿会被校验拦截**，用户看到空表单没法救。',
      '',
      '### 不要两者都做（会重复执行）',
      '',
      '判断标准：**当前这条 user message 里有没有给出所有必需参数？**',
      '- 是 → 方式 A（直接调）',
      '- 否 → 方式 B（编辑表单单元）',
      '',
      '调完 action 后只用 1 句话告诉用户结果（如"好的，已加蒸羊羔 × 1"），不要再问下一句。',
      ''
    )
  }

  return lines.join('\n')
}
