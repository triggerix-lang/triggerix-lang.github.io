/**
 * useChatSession —— 原子工具模式的统一 composable。
 *
 * 职责：
 *  1. SSE 流式聊天（SSE 解析 + 多 tool_call 累积）
 *  2. 业务 handler 注册到 triggerix runtime（让 UI 模板的 trigger 能直接调）
 *  3. UIBuilder 提交的 BuiltUI 挂载到 assistant 消息气泡
 *  4. 多轮 tool calling 循环（AI 调 atomic 工具 → 调 builder → submit 后 mount）
 *
 * 关键设计：
 *  - **AI 调 atomic 工具**：`executeCall(name, args)` 把 AI 的工具调用 apply 到 UIBuilder
 *  - **submit 后** builder 返回 BuiltUI → 立即 mountNative 到 assistant 气泡
 *  - **模板里 button.click** → triggerix runtime → `runtime.registerAction` → 业务 handler
 *  - **$ref 解析**：triggerix runtime 0.0.11+ 通过 `refResolver` 自动解析 action params 里的 $ref
 */

import destr from 'destr'
import { ref, type Ref } from 'vue'
import { createRuntime } from '@triggerix/runtime'
import { mountNative, components as nativeComponents } from 'triggerix-ai-component-native'
import { button, checkbox, input, select, uploadButton } from 'triggerix-ai-component-native'
import type { ComponentDef } from '@triggerix-ai/component'
import type { BuiltUI, UIBuilder } from '@triggerix-ai/builder'
import type { ToolDefinition } from '@triggerix-ai/fn'
import { createParser } from 'eventsource-parser'

// ============================================================
// 公共类型
// ============================================================

export type ToastTone = 'info' | 'success' | 'warn' | 'error'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant' | 'tool'
  content: string
  /** assistant role 携带的 tool_calls（SSE 累积完成后填入） */
  tool_calls?: ToolCall[]
  /** tool role 携带：对应 tool_call.id */
  tool_call_id?: string
  /** tool role 携带：被调用的工具名 */
  name?: string
  /** assistant 是否还在流式（控制渲染 loading） */
  streaming?: boolean
}

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
}

/**
 * 把 props 树里所有 `$ref:xxx` 字符串替换成 resolver 返回的真实值（递归处理对象/数组）。
 * 例：`{ value: "$ref:user.nickname" }` → `{ value: "游客" }`
 *     `{ options: [{ value: "$ref:user.x" }] }` → 同样递归
 */
function resolvePropRefs(value: unknown, resolver: PropRefResolver): unknown {
  if (typeof value === 'string') {
    if (value.startsWith('$ref:')) return resolver(value.slice(5))
    return value
  }
  if (Array.isArray(value)) return value.map((v) => resolvePropRefs(v, resolver))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolvePropRefs(v, resolver)
    }
    return out
  }
  return value
}

export interface ToolResult {
  ok: boolean
  message?: string
  data?: unknown
}

/** UIBuilder submit 后的挂载接口（由 useChatSession 注入） */
export interface UIMounter {
  /** 挂 BuiltUI 到指定 assistant 消息气泡（也支持 unmount 之前挂的） */
  mount: (built: BuiltUI, msgId: number) => void
  /** 卸载当前挂载的 UI（用户操作完成 / emit_event → editor.cancelled） */
  unmount: () => void
}

export interface ToolCtx {
  msgId: number
  pushToast: (message: string, tone?: ToastTone) => void
}

export type ToolHandler<TArgs = any> = (args: TArgs, ctx: ToolCtx) => Promise<ToolResult>

// ============================================================
// useChatSession
// ============================================================

/** 解析 component props 里的 `$ref:user.nickname` 等字符串 → 当前 app 状态的实际值 */
export type PropRefResolver = (path: string) => unknown

export interface UseChatSessionOptions {
  /** LLM 的工具定义（atomic 工具：addComponent / addTrigger / ...） */
  tools: ReadonlyArray<ToolDefinition>
  /** 业务 handler 池（action 名 → handler） */
  handlers: Map<string, ToolHandler>
  /** UIBuilder 实例（AI 调 atomic 工具时 apply 到它；submit 时取 mountTarget） */
  builder: UIBuilder
  /** 找到 assistant 消息气泡的 DOM 元素（用于挂 BuiltUI） */
  getBubbleEl?: (msgId: number) => HTMLElement | null
  /** 兜底挂载点（找不到 bubble 时用） */
  modalSlot?: Ref<HTMLElement | null>
  /** 业务侧弹 toast 的方法 */
  pushToast: (message: string, tone?: ToastTone) => void
  /**
   * 解析 props 里的 `$ref:xxx` 字符串（如 `$ref:user.nickname` → 当前用户昵称）。
   * 挂载前 useChatSession 会调这个，替换所有 `$ref:xxx` 为真实值。
   * 不传则 props 里的 `$ref:xxx` 保持原样不替换。
   */
  propRefResolver?: PropRefResolver
  /** LLM API 端点，默认 `/api/ai`（Netlify Function） */
  endpoint?: string
  /** 多轮 tool calling 最大轮数（防无限循环），默认 5 */
  maxRounds?: number
}

export function useChatSession(opts: UseChatSessionOptions) {
  const messages = ref<ChatMessage[]>([])
  const thinking = ref(false)
  const error = ref<string | null>(null)

  // ============== Runtime ==============
  // 按 instance.name 索引的 DOM 元素（用于 triggerix runtime 的 $ref 解析）
  const elementByName = new Map<string, HTMLElement>()

  // triggerix runtime 0.0.11+ 支持 refResolver：action params 里的 { $ref: 'inp.value' }
  // 会在调用 handler 前自动解析为 inp.value 的实际值
  const runtime = createRuntime({
    refResolver: (ref: string) => {
      const [name, ...path] = ref.split('.')
      const el = elementByName.get(name ?? '')
      if (!el) return undefined
      return path.reduce((cur: unknown, k) => {
        if (cur == null) return undefined
        return (cur as Record<string, unknown>)[k]
      }, el as unknown)
    }
  })
  let currentScope: { unmount: () => void } | null = null
  let currentWrapper: HTMLElement | null = null
  const mountedTriggerIds: string[] = []
  /** emit_event 处理：用户点"取消"按钮 → runtime 派发 emit_event → unmount */
  const cancelHandler = () => {
    unmountUI()
  }
  runtime.registerAction('emit_event', async (params?: Record<string, unknown>) => {
    const event = asString((params ?? {}).event)
    if (event === 'editor.cancelled') {
      cancelHandler()
    }
  })

  // ============================================================
  // Native 组件的 DOM event → Triggerix event ID 绑定
  // （必须显式调 bind()，native 库默认不绑任何事件）
  // bind() 用 set()，重复调是覆盖，幂等
  // ============================================================
  let nativeBound = false
  function bindNativeEventsOnce() {
    if (nativeBound) return
    nativeBound = true
    button.bind('click', 'button.click')
    input.bind('blur', 'input.blur').bind('change', 'input.change')
    checkbox.bind('change', 'checkbox.change')
    select.bind('change', 'select.change')
    uploadButton.bind('change', 'upload.complete')
  }

  function unmountUI(): void {
    if (currentScope) {
      currentScope.unmount()
      currentScope = null
    }
    if (currentWrapper) {
      currentWrapper.remove()
      currentWrapper = null
    }
    elementByName.clear()
    for (const id of mountedTriggerIds) {
      try {
        runtime.removeTrigger(id)
      } catch {
        // trigger 可能不存在，忽略
      }
    }
    mountedTriggerIds.length = 0
  }

  function mountUI(built: BuiltUI, msgId: number): boolean {
    unmountUI()
    bindNativeEventsOnce()
    // 找 assistant 消息气泡
    const bubbleEl = opts.getBubbleEl?.(msgId) ?? null
    const slot = bubbleEl ?? opts.modalSlot?.value
    if (!slot) return false

    // 外层 wrapper
    const wrapper = document.createElement('div')
    wrapper.className = 'ai-template-mount'
    slot.appendChild(wrapper)
    currentWrapper = wrapper

    // 挂载前 resolve 组件 props 里的 `$ref:xxx` 字符串（如 `$ref:user.nickname` → '游客'）
    // 这样 AI 在 addComponent 的 props 里直接传 $ref:user.xxx 就能拿到当前 app 状态
    const resolver = opts.propRefResolver
    const resolvedComponents = resolver
      ? built.components.map((c) => ({
          ...c,
          props: resolvePropRefs(c.props ?? {}, resolver) as Record<string, unknown>
        }))
      : built.components

    currentScope = mountNative(
      { components: resolvedComponents, triggers: built.triggers as never },
      wrapper,
      nativeComponents as unknown as ReadonlyArray<ComponentDef<HTMLElement>>,
      (eventId, source, payload) => {
        void runtime.emit(eventId, source, payload)
      }
    )

    // 给 wrapper 内的 native 元素加 BEM 类（统一外部样式）
    for (const [tag, bemSuffix] of [
      ['button', 'button'],
      ['input', 'input'],
      ['label', 'label'],
      ['select', 'select'],
      ['textarea', 'input']
    ] as const) {
      wrapper.querySelectorAll(tag).forEach((el) => {
        el.classList.add(`ai-template-mount_${bemSuffix}`)
      })
    }
    // card / image 特殊处理：card 是 div，image 是 img
    wrapper.querySelectorAll('div[data-component-type="card"]').forEach((el) => {
      el.classList.add('ai-template-mount_card')
    })
    wrapper.querySelectorAll('img').forEach((el) => {
      el.classList.add('ai-template-mount_image')
    })

    // 按 instance.name 索引元素（用于 $ref 解析）
    elementByName.clear()
    const children = Array.from(wrapper.children) as HTMLElement[]
    for (let i = 0; i < built.components.length && i < children.length; i++) {
      const inst = built.components[i]
      if (inst?.name) {
        elementByName.set(inst.name, children[i]!)
      }
    }

    // a11y：给 form 元素加 id/name、给 label 加 for 关联
    const formEls = wrapper.querySelectorAll<HTMLElement>('input, textarea, select')
    const ids: string[] = []
    formEls.forEach((el, i) => {
      const id = `ai-tpl-${msgId}-${i}`
      el.id = id
      el.setAttribute('name', `ai-tpl-${msgId}-${i}`)
      ids.push(id)
    })
    wrapper.querySelectorAll<HTMLLabelElement>('label').forEach((label, i) => {
      if (ids[i]) label.setAttribute('for', ids[i])
    })

    for (const t of built.triggers) {
      try {
        runtime.addTrigger(t as never)
        mountedTriggerIds.push((t as { id: string }).id)
      } catch {
        // ignore
      }
    }

    return true
  }

  // ============== 业务发送（多轮 tool calling 循环） ==============

  // 把所有业务 handler 注册为 runtime action
  // （模板 trigger 触发的 action 直接走 handler；$ref 解析由 runtime 通过 refResolver 自动完成）
  for (const [name, handler] of opts.handlers) {
    runtime.registerAction(name, async (params?: Record<string, unknown>) => {
      const ctx: ToolCtx = {
        msgId: -1,
        pushToast: opts.pushToast
      }
      await handler((params ?? {}) as any, ctx)
    })
  }

  // ============== 工具调用 ==============
  /** 工具参数里任意 unknown → string（安全：null/undefined/object 都不爆） */
  function asString(v: unknown): string {
    if (typeof v === 'string') return v
    if (v == null) return ''
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return JSON.stringify(v)
  }

  /**
   * 5 个 atomic 工具在 builder 上的入口（直接在 useChatSession 里写，
   * 避免把 executeCall 桥接接口漏出去给 caller 增加复杂度）。
   */
  function applyAtomicCall(
    name: string,
    args: Record<string, unknown>
  ): { ok: true } | { ok: false; errors: string[] } {
    switch (name) {
      case 'addComponent': {
        const t = asString(args.type)
        const n = asString(args.name)
        const p = (args.props && typeof args.props === 'object' ? args.props : undefined) as
          | Record<string, unknown>
          | undefined
        return opts.builder.addComponent(t, n, p)
      }
      case 'updateComponentProp': {
        const n = asString(args.name)
        const pn = asString(args.propName)
        // value 是 JSON 字符串（builder schema 限 type:string），parse 回来给 builder
        let parsed: unknown = args.value
        if (typeof args.value === 'string') {
          try {
            parsed = JSON.parse(args.value)
          } catch {
            parsed = args.value
          }
        }
        return opts.builder.updateComponentProp(n, pn, parsed)
      }
      case 'addTrigger': {
        const et = asString(args.eventType)
        const es = asString(args.eventSource)
        const at = asString(args.actionType)
        const ap = (
          args.actionParams && typeof args.actionParams === 'object' ? args.actionParams : {}
        ) as Record<string, unknown>
        return opts.builder.addTrigger(et, es, at, ap)
      }
      case 'clear':
        return opts.builder.clear()
      case 'submit': {
        const r = opts.builder.submit()
        return r.ok ? { ok: true } : { ok: false, errors: r.errors }
      }
      default:
        return { ok: false, errors: [`Unknown atomic tool: "${name}"`] }
    }
  }

  async function runAtomicCall(call: ToolCall, msgId: number): Promise<ToolResult> {
    // submit 是关键路径：builder.submit() 返回 mountTarget，立即挂到消息气泡
    if (call.name === 'submit') {
      const sr = opts.builder.submit()
      if (!sr.ok) return { ok: false, message: sr.errors.join('; ') }
      const ok = mountUI(sr.mountTarget, msgId)
      return ok
        ? { ok: true, message: 'UI mounted' }
        : { ok: false, message: 'Failed to mount UI (no container)' }
    }

    const r = applyAtomicCall(call.name, call.args ?? {})
    if (!r.ok) return { ok: false, message: r.errors.join('; ') }
    return { ok: true }
  }

  // ============== SSE 解析 ==============
  interface ToolCallAccum {
    id?: string
    name?: string
    args: string
  }

  async function streamOnce(): Promise<{ content: string; toolCalls: ToolCall[] }> {
    const endpoint = opts.endpoint ?? '/api/ai'

    const outbound = messages.value.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
      ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      ...(m.name ? { name: m.name } : {})
    }))

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[useChatSession][outbound] messages =', JSON.stringify(outbound, null, 2))
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: outbound,
        tools: opts.tools
      })
    })

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      throw new Error(`AI 请求失败 ${res.status}: ${text.slice(0, 200)}`)
    }

    let contentBuf = ''
    const toolCallAccum = new Map<number, ToolCallAccum>()

    const parser = createParser({
      onEvent(event) {
        if (event.data === '[DONE]' || !event.data) return

        const json = destr<any>(event.data)
        if (!json?.choices) return

        const choice = json.choices[0]
        const delta = choice?.delta
        if (!delta) return

        if (typeof delta.content === 'string' && delta.content.length > 0) {
          contentBuf += delta.content
        }

        if (Array.isArray(delta.tool_calls)) {
          for (const t of delta.tool_calls) {
            const cur = toolCallAccum.get(t.index) ?? { args: '' }
            if (t.id) cur.id = t.id
            if (t.function?.name) cur.name = t.function.name
            if (typeof t.function?.arguments === 'string') cur.args += t.function.arguments
            toolCallAccum.set(t.index, cur)
          }
        }
      }
    })

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      parser.feed(value)
    }

    const toolCalls: ToolCall[] = []
    for (const [, acc] of toolCallAccum) {
      if (!acc.name) continue
      let args: Record<string, unknown> = {}
      try {
        args = acc.args ? JSON.parse(acc.args) : {}
      } catch {
        args = {}
      }
      toolCalls.push({
        id: acc.id ?? `call_${Math.random().toString(36).slice(2)}`,
        name: acc.name,
        args
      })
    }

    return { content: contentBuf, toolCalls }
  }

  // ============== 业务发送（多轮 tool calling 循环） ==============
  let msgSeq = 0
  function nextId() {
    return ++msgSeq
  }

  function pushMsg(msg: Omit<ChatMessage, 'id'>): ChatMessage {
    const idx = messages.value.length
    messages.value.push({ id: nextId(), ...msg })
    return messages.value[idx]!
  }

  async function send(text: string): Promise<void> {
    pushMsg({ role: 'user', content: text })
    thinking.value = true
    error.value = null

    const maxRounds = opts.maxRounds ?? 5
    let round = 0

    try {
      while (round++ < maxRounds) {
        const aiMsg = pushMsg({ role: 'assistant', content: '', streaming: true })

        try {
          const { content, toolCalls } = await streamOnce()
          aiMsg.content = content
          aiMsg.streaming = false

          if (toolCalls.length === 0) break

          aiMsg.tool_calls = toolCalls

          // 处理每一个工具调用
          // submit 工具调用是同步的：handler 内部 mount 后立即完成
          for (const call of toolCalls) {
            const result = await runAtomicCall(call, aiMsg.id)
            pushMsg({
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: call.id,
              name: call.name
            })
          }
        } catch (err) {
          aiMsg.streaming = false
          const msg = err instanceof Error ? err.message : String(err)
          aiMsg.content = aiMsg.content ? `${aiMsg.content}\n\n[错误: ${msg}]` : `[错误: ${msg}]`
          throw err
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      thinking.value = false
    }
  }

  return {
    messages,
    thinking,
    error,
    send,
    /** 主动清理（一般不需要，组件 unmount 时会自动调） */
    dispose: () => {
      unmountUI()
    }
  }
}
