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
import { createRuntime, type RefResolver } from '@triggerix/runtime'
import { mountNative, components as nativeComponents } from 'triggerix-ai-component-native'
import { button, checkbox, input, select, uploadButton } from 'triggerix-ai-component-native'
import type { ComponentDef } from '@triggerix-ai/component'
import type { BuiltUI, ExecuteCallResult, UIBuilder } from '@triggerix-ai/builder'
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

export interface UseChatSessionOptions {
  /** LLM 的工具定义（atomic + domain 工具 schema），buildAtomicTools 的产物 */
  tools: ReadonlyArray<ToolDefinition>
  /**
   * 客户端已拼好的 system prompt（buildAtomicTools 的产物）。
   * 客户端发 API 时一起发给 netlify function，function 不再自己拼。
   */
  systemPrompt: string
  /** 业务 handler 池（action 名 → handler） */
  handlers: Map<string, ToolHandler>
  /** UIBuilder 实例（submit 时取 mountTarget） */
  builder: UIBuilder
  /**
   * atomic + domain 工具的统一 executeCall 入口（来自 buildAtomicTools()）。
   * 所有非 submit 工具调用都走这里：
   *  - atomic 工具 → 修改 builder
   *  - domain 工具 → 调 handler，data 字段回喂给 LLM
   */
  executeCall: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<ExecuteCallResult> | ExecuteCallResult
  /** 找到 assistant 消息气泡的 DOM 元素（用于挂 BuiltUI） */
  getBubbleEl?: (msgId: number) => HTMLElement | null
  /** 兜底挂载点（找不到 bubble 时用） */
  modalSlot?: Ref<HTMLElement | null>
  /** 业务侧弹 toast 的方法 */
  pushToast: (message: string, tone?: ToastTone) => void
  /**
   * 解析 component props 里的 `"$ref:user.nickname"` 字符串。
   * Forwarded directly to `mountNative` as `refResolver`, which delegates to
   * the runtime's `resolveRefsDeep` after normalising the string form to
   * `{ $ref: 'user.nickname' }`. Without this, component props containing
   * `$ref:...` strings are left as-is.
   *
   * Distinct from the runtime's own `refResolver` (which resolves names of
   * mounted DOM elements in action params); this one points at host-app
   * state (e.g. `user.nickname` → `foodApp.nickname.value`).
   */
  propRefResolver?: RefResolver
  /** LLM API 端点，默认 `/api/ai`（Netlify Function） */
  endpoint?: string
  /**
   * 多轮 tool calling 最大轮数（防无限循环），默认 3。
   * 修复后空文本回复会立刻停，所以默认 3 足够覆盖
   * getMenu → addComponent...addTrigger → submit 的完整链路。
   */
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
    opts.pushToast?.('已关闭', 'info')
  }
  runtime.registerAction('emit_event', async (params?: Record<string, unknown>) => {
    const raw = (params ?? {}).event
    const event = typeof raw === 'string' ? raw : ''
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

    // mountNative normalises any "$ref:xxx" strings inside component props
    // to the runtime's { $ref: 'xxx' } object form and then resolves them
    // against the supplied refResolver (typically reading from host-app
    // state such as foodApp.nickname.value).
    currentScope = mountNative(
      { components: built.components, triggers: built.triggers as never },
      wrapper,
      nativeComponents as unknown as ReadonlyArray<ComponentDef<HTMLElement>>,
      (eventId, source, payload) => {
        void runtime.emit(eventId, source, payload)
      },
      opts.propRefResolver
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

    // a11y：给独立的表单控件（input / textarea / select）补 name 属性。
    // 跳过 radio group 内部的 input——它们的 name 由 radio 组件自己设置成共享值，
    // 一旦被这里覆盖就会破坏单选分组（每个变成独立 radio）。
    // input 已经有 name（如 radio / select 组件自己设的）也不动。
    wrapper
      .querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        'input, textarea, select'
      )
      .forEach((el, i) => {
        if (el.closest('[data-component-type="radio"]')) return
        if (!el.name) el.name = `ai-tpl-${msgId}-${i}`
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
  /**
   * 递归把 `{ item: [...] }` 这种 XML-RPC / struct-wrapped 数组解包成裸数组。
   *
   * 部分上游 LLM（例如当前用的 MiniMax-M3）会按 XML-RPC 协议把 tool call 里的
   * 数组字段（如 select / radio 的 `options`）序列化成 `{ item: [...] }` 对象。
   * 我们的组件 schema 声明的是 `array`，渲染层拿到 `object` 会直接 `Array.isArray(...)` 失败
   * 退化成空数组 → 页面上 select 是空的。
   *
   * 只解包符合"恰好是 `{ item: [...] }`"形态的 object（避免误伤真正的 option 对象等）；
   * 已经为数组的值原样返回；其余值递归处理（数组/对象都遍历）。
   */
  function unwrapStructArrays<T>(v: T): T {
    if (Array.isArray(v)) {
      return v.map((item) => unwrapStructArrays(item)) as unknown as T
    }
    if (v !== null && typeof v === 'object') {
      const obj = v as Record<string, unknown>
      const keys = Object.keys(obj)
      if (keys.length === 1 && keys[0] === 'item' && Array.isArray(obj.item)) {
        return unwrapStructArrays(obj.item) as unknown as T
      }
      const out: Record<string, unknown> = {}
      for (const k of keys) out[k] = unwrapStructArrays(obj[k])
      return out as unknown as T
    }
    return v
  }

  /**
   * submit + mount 的统一入口。任何"草稿已完成，挂到指定 assistant 气泡"的场景都走这里
   * （正常 submit 工具调用、AI 忘 submit 的兜底都共用）。
   *
   * submit 不走 executeCall——它的语义是"返回 mountTarget 并 mount"，
   * executeCall 只能返回 ExecuteCallResult，没有 mount 副作用。
   */
  function submitAndMount(msgId: number): ToolResult {
    const sr = opts.builder.submit()
    if (!sr.ok) return { ok: false, message: sr.errors.join('; ') }
    return mountUI(sr.mountTarget, msgId)
      ? { ok: true, message: 'UI mounted' }
      : { ok: false, message: 'Failed to mount UI (no container)' }
  }

  async function runAtomicCall(call: ToolCall, msgId: number): Promise<ToolResult> {
    // submit 是关键路径：builder.submit() 返回 mountTarget，立即挂到消息气泡
    if (call.name === 'submit') return submitAndMount(msgId)

    // clear 走 builder.clear() 只重置草稿，**不**卸载已挂载的 UI；
    // 旧模板留在气泡里就成了"幽灵"。所以在派发之前主动卸载一次。
    if (call.name === 'clear') unmountUI()

    // 其他 atomic + domain 工具全部走 executeCall 统一派发
    const r = await opts.executeCall(call.name, call.args ?? {})
    if (!r.ok) return { ok: false, message: r.errors.join('; ') }
    // domain 工具的 data 字段会作为 tool message 的内容回喂给 LLM 下一轮
    return { ok: true, data: r.data }
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
        systemPrompt: opts.systemPrompt,
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
        args: unwrapStructArrays(args) as Record<string, unknown>
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

  /**
   * 单轮 stream + 处理 tool calls。
   * 返回 true 表示外层 loop 应停止，三种情况都返回 true：
   *  1. LLM 调了 submit 并成功 → 已挂 UI，没理由再问
   *  2. LLM 这一轮**没有 tool_call**（纯文本回复）→ LLM 认为已经答完，不应该再追问
   *  3. 走到 for 循环末尾（所有 tool 跑完，但都不是 submit）→ 让外层决定下一轮
   *
   * 第 2 点是关键修复：之前 `return false` 导致 LLM 在没工具可调时连续生成 3-5 条
   * 几乎相同的"好的，请告诉我..."气泡，用户体验炸裂。
   */
  async function runOneRound(): Promise<boolean> {
    const aiMsg = pushMsg({ role: 'assistant', content: '', streaming: true })

    try {
      const { content, toolCalls } = await streamOnce()
      aiMsg.content = content
      aiMsg.streaming = false

      if (toolCalls.length === 0) return true

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
        // submit 成功后立即跳出整个 chat loop：AI 不需要再发一个"好的"气泡，
        // round 1 的 aiMsg.content 已经是 AI 的唯一一句话回复
        if (call.name === 'submit' && result.ok) return true
      }
      return false
    } catch (err) {
      aiMsg.streaming = false
      const msg = err instanceof Error ? err.message : String(err)
      aiMsg.content = aiMsg.content ? `${aiMsg.content}\n\n[错误: ${msg}]` : `[错误: ${msg}]`
      throw err
    }
  }

  /** 多轮 driver：任一轮 submit 成功 / 空文本回复则提前终止。 */
  async function runRounds(): Promise<void> {
    const maxRounds = opts.maxRounds ?? 3
    for (let i = 0; i < maxRounds; i++) {
      if (await runOneRound()) return
    }
  }

  /**
   * 兜底：AI 调了很多 addComponent / addTrigger 但忘了调 submit（或被 maxRounds 卡住），
   * 自动把已构建的草稿挂到最后一个 assistant 气泡。
   */
  function autoMountDraft(): void {
    if (opts.builder.components.length === 0) return
    const lastAssistant = [...messages.value].reverse().find((m) => m.role === 'assistant')
    if (!lastAssistant) return
    submitAndMount(lastAssistant.id)
  }

  async function send(text: string): Promise<void> {
    pushMsg({ role: 'user', content: text })
    thinking.value = true
    error.value = null

    try {
      await runRounds()
      autoMountDraft()
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
