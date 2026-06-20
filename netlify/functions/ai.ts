// Netlify Functions 通过 esbuild 部署时打包，本地 vp check 类型校验跳过
// @ts-nocheck
import destr from 'destr'
import { buildAtomicTools } from '../../src/ai-app-shared/atomicTools'
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

interface FrontendRequest {
  messages: FrontendMessage[]
}

declare const process: { env: Record<string, string | undefined> }

// ============================================================
// 入口：只做路由 + body 解析 + 注入 systemPrompt/tools + 调 provider
// （不包含任何 AI 协议代码，provider 自己负责）
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

  // system prompt + tools 由 buildAtomicTools 注入（不依赖前端传）
  const { systemPrompt, toolDefinitions } = buildAtomicTools()

  // 前端 snake_case → ChatRequest camelCase
  const chatRequest = {
    systemPrompt,
    messages: body.messages.map((m) => {
      if (m.role === 'tool') {
        return { role: 'tool', toolCallId: m.tool_call_id ?? '', name: m.name, content: m.content }
      }
      if (m.role === 'assistant') {
        return { role: 'assistant', content: m.content, toolCalls: m.tool_calls }
      }
      return { role: 'user', content: m.content }
    }),
    tools: toolDefinitions.map((t: any) => ({
      name: t.function.name,
      description: t.function.description ?? '',
      parameters: t.function.parameters ?? { type: 'object', properties: {} }
    }))
  }

  const provider = createAnthropicProvider({ baseUrl, apiKey, model })
  return provider.chat(chatRequest)
}
