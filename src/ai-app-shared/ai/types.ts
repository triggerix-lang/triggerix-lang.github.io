/**
 * AI Provider 抽象层 —— 协议无关的内部 chat 格式。
 *
 * 这层是 demo 侧（src/ai-app-shared/）的契约，不属于 triggerix-ai 底层库：
 *   - 底层库（@triggerix-ai/fn / builder）只负责"问 LLM 什么"（ToolDef → ToolDefinition schema）
 *   - 这层负责"怎么问"（provider 选型、HTTP 协议、SSE 转包）
 *
 * 新增 provider（如 openaiProvider.ts）只需实现 AIProvider 接口。
 * netlify function 不感知具体协议，只调 provider.chat()。
 */

// ============================================================
// 请求
// ============================================================

export interface ChatRequest {
  /** 系统提示（已包含业务上下文） */
  systemPrompt: string
  /** 对话历史（user / assistant / tool） */
  messages: ChatMessage[]
  /** 工具定义（JSON Schema） */
  tools: ChatTool[]
}

export type ChatMessage =
  | { role: 'user'; content: string }
  | {
      role: 'assistant'
      content: string
      /** AI 已发出的工具调用（用于多轮 tool calling 上下文回传） */
      toolCalls?: ToolCall[]
    }
  | {
      role: 'tool'
      /** 对应的 assistant tool_call.id */
      toolCallId: string
      /** 可选：工具名（部分 provider 用作 cache key） */
      name?: string
      /** 工具执行结果（JSON 序列化后的字符串） */
      content: string
    }

export interface ToolCall {
  id: string
  name: string
  /** 已是对象（前端 useChatSession 的实际格式） */
  args: Record<string, unknown>
}

export interface ChatTool {
  name: string
  description: string
  /** JSON Schema (draft-07 兼容) */
  parameters: Record<string, unknown>
}

// ============================================================
// 响应
// ============================================================

/**
 * AIProvider.chat() 统一返回 **OpenAI 风格 SSE Response**：
 *   - chunk: `{choices:[{delta:{role?, content?, tool_calls?}, finish_reason?}]}`
 *   - 结束: `data: [DONE]`
 *
 * 这样前端 useChatSession.ts 的 SSE 解析器（基于 OpenAI 格式）零改动。
 * 具体 provider 内部负责把自家协议（Anthropic 等）转成这个统一格式。
 */
export interface AIProvider {
  readonly name: string
  chat(req: ChatRequest): Promise<Response>
}
