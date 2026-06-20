import type { AIProvider, ChatMessage, ChatRequest, ChatTool } from './types'

/**
 * OpenAI 兼容 chat/completions API 的 provider 实现。
 *
 * 当前 demo 不使用（生产用 anthropic-provider），但保留作为抽象层验证：
 * 同一个 AIProvider 接口可以由多个协议实现，netlify function 可热切换。
 *
 * 注意：OpenAI 响应本身就是 OpenAI 风格 SSE，所以这里**直接透传**上游流，
 * 不用像 anthropic-provider 那样做 SSE 转换。这是 OpenAI provider 的天然优势。
 */

export interface OpenAIProviderOptions {
  /** base URL，不带 /chat/completions 后缀（代码会拼） */
  baseUrl: string
  apiKey: string
  /** 模型名 */
  model: string
  /** 上限 tokens，默认不传（上游决定） */
  maxTokens?: number
}

export function createOpenAIProvider(opts: OpenAIProviderOptions): AIProvider {
  const { baseUrl, apiKey, model, maxTokens } = opts

  return {
    name: 'openai',

    async chat(req: ChatRequest): Promise<Response> {
      const upstream = await fetch(`${stripTrailingSlash(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
          stream: true,
          messages: [
            { role: 'system', content: req.systemPrompt },
            ...req.messages.map(toOpenAIMessage)
          ],
          tools: req.tools.map(toOpenAITool)
        })
      })

      if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => '')
        return new Response(
          JSON.stringify({
            error: `AI upstream error ${upstream.status}`,
            detail: text.slice(0, 1000)
          }),
          { status: upstream.status, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // OpenAI 响应本身就是 OpenAI 风格 SSE，透传即可
      return new Response(upstream.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive'
        }
      })
    }
  }
}

// ============================================================
// 内部：ChatRequest → OpenAI 格式
// ============================================================

function toOpenAITool(t: ChatTool) {
  return {
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters:
        t.parameters && Object.keys(t.parameters).length > 0
          ? t.parameters
          : { type: 'object', properties: {} }
    }
  }
}

function toOpenAIMessage(m: ChatMessage) {
  if (m.role === 'tool') {
    return {
      role: 'tool' as const,
      tool_call_id: m.toolCallId,
      content: m.content,
      ...(m.name ? { name: m.name } : {})
    }
  }
  if (m.role === 'assistant') {
    return {
      role: 'assistant' as const,
      content: m.content,
      ...(m.toolCalls && m.toolCalls.length > 0
        ? {
            tool_calls: m.toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.args ?? {})
              }
            }))
          }
        : {})
    }
  }
  return { role: 'user' as const, content: m.content }
}

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '')
}
