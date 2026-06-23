// Netlify Functions 通过 esbuild 部署时打包，本地 vp check 类型校验跳过
// @ts-nocheck
import destr from 'destr'
import { createAnthropicProvider } from '../../src/ai-app-shared/ai/anthropic-provider'

// ============================================================
// 入站：前端 useChatSession 发的 snake_case 格式
// （前端用的是简化 tool_call 格式 {id, name, args}，不是 OpenAI 风格）
// ============================================================

interface FrontendMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: Array<{ id: string; name: string; args: Record<string, unknown> }>
  tool_call_id?: string
  name?: string
}

interface FrontendTool {
  name: string
  description?: string
  parameters?: Record<string, unknown>
}

interface FrontendRequest {
  /**
   * 客户端已构造好的 system prompt（buildAtomicTools 产物）。
   * 客户端负责把业务 handler 包成 DomainTool 再发上来，
   * server 端拿不到 foodApp 状态，没法自己拼。
   */
  systemPrompt?: string
  messages: FrontendMessage[]
  /** 客户端传来的 tool schema（buildAtomicTools.toolDefinitions 标准化后） */
  tools?: FrontendTool[]
}

declare const process: { env: Record<string, string | undefined> }

// ============================================================
// 入口：只做路由 + body 解析 + 转发到 provider
// systemPrompt / tools 完全由客户端提供（兼容旧请求的兜底见下）
// ============================================================

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const baseUrl = process.env.AI_API_URL
  const apiKey = process.env.AI_API_KEY
  const model = process.env.AI_MODEL ?? 'MiniMax-M3'

  if (!baseUrl || !apiKey) {
    return new Response(JSON.stringify({ error: 'Missing AI_API_URL or AI_API_KEY env' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  let body: FrontendRequest
  try {
    body = destr<FrontendRequest>(await req.text())
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 客户端必须发 systemPrompt（前端 useChatSession 已统一加）——
  // 没有就拒绝，避免 server 用不一致的 prompt 调 LLM
  if (typeof body.systemPrompt !== 'string' || body.systemPrompt.length === 0) {
    return new Response(
      JSON.stringify({ error: 'systemPrompt is required (must be built client-side)' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  // 前端 snake_case → ChatRequest camelCase
  const chatRequest = {
    systemPrompt: body.systemPrompt,
    messages: body.messages.map((m) => {
      if (m.role === 'tool') {
        return { role: 'tool', toolCallId: m.tool_call_id ?? '', name: m.name, content: m.content }
      }
      if (m.role === 'assistant') {
        return { role: 'assistant', content: m.content, toolCalls: m.tool_calls }
      }
      return { role: 'user', content: m.content }
    }),
    // 前端 useChatSession 直传 defineAtomicTools 的 toolDefinitions（OpenAI 风格
    // `{ type: 'function', function: { name, description, parameters } }`），
    // 这里扁平化成 ChatTool 形态供 provider 用。
    tools: (body.tools ?? []).map((t: any) => ({
      name: t.function?.name ?? t.name ?? '',
      description: t.function?.description ?? t.description ?? '',
      parameters: t.function?.parameters ?? t.parameters ?? { type: 'object', properties: {} }
    }))
  }

  const provider = createAnthropicProvider({ baseUrl, apiKey, model })
  return provider.chat(chatRequest)
}
