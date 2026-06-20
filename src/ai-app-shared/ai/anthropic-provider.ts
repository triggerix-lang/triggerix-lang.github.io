import { createParser } from 'eventsource-parser'
import type { AIProvider, ChatMessage, ChatRequest, ChatTool, ToolCall } from './types'

/**
 * Anthropic 兼容 messages API 的 provider 实现。
 *
 * 负责把协议无关的 ChatRequest 转成 Anthropic 格式、调上游、
 * 再把 Anthropic 流式响应转成 OpenAI 风格 SSE 返回。
 *
 * 这是目前 demo 唯一使用的 provider；netlify function 不感知协议细节。
 *
 * 注意：本实现不写"OpenAI 兼容"代码——所有字段都是 Anthropic 原生协议。
 */

export interface AnthropicProviderOptions {
  /** base URL，不带 /v1/messages 后缀（代码会拼） */
  baseUrl: string
  apiKey: string
  /** 模型名，如 'MiniMax-M3' */
  model: string
  /** 上限 tokens，默认 4096 */
  maxTokens?: number
}

export function createAnthropicProvider(opts: AnthropicProviderOptions): AIProvider {
  const { baseUrl, apiKey, model, maxTokens = 4096 } = opts

  return {
    name: 'anthropic',

    async chat(req: ChatRequest): Promise<Response> {
      const upstream = await fetch(`${stripTrailingSlash(baseUrl)}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          stream: true,
          system: req.systemPrompt,
          thinking: { type: 'disabled' },
          tools: toAnthropicTools(req.tools),
          messages: toAnthropicMessages(req.messages)
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

      return anthropicToOpenAISSE(upstream, model)
    }
  }
}

// ============================================================
// 内部：ChatRequest → Anthropic 格式
// ============================================================

function toAnthropicTools(tools: ChatTool[]): any[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema:
      t.parameters && Object.keys(t.parameters).length > 0
        ? t.parameters
        : { type: 'object', properties: {} }
  }))
}

function toAnthropicMessages(messages: ChatMessage[]): any[] {
  const out: any[] = []

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!

    if (m.role === 'user') {
      out.push({ role: 'user', content: [{ type: 'text', text: m.content }] })
      continue
    }

    if (m.role === 'assistant') {
      const blocks: any[] = []
      if (m.content) blocks.push({ type: 'text', text: m.content })
      if (m.toolCalls && m.toolCalls.length > 0) {
        for (const tc of m.toolCalls) {
          blocks.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.args ?? {}
          })
        }
      }
      // Anthropic 不允许空 content：没有 text / tool_use 就跳过该消息
      if (blocks.length > 0) out.push({ role: 'assistant', content: blocks })
      continue
    }

    if (m.role === 'tool') {
      // Anthropic 的 tool_result 必须包在 user role 里；连续的 tool 合并到一条 user 消息
      const toolResults: any[] = [
        {
          type: 'tool_result',
          tool_use_id: m.toolCallId,
          content: m.content
        }
      ]
      let j = i + 1
      while (j < messages.length && messages[j]?.role === 'tool') {
        const tm = messages[j] as Extract<ChatMessage, { role: 'tool' }>
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tm.toolCallId,
          content: tm.content
        })
        j++
      }
      out.push({ role: 'user', content: toolResults })
      i = j - 1
    }
  }

  return out
}

// ============================================================
// 内部：Anthropic SSE → OpenAI 风格 SSE
// ============================================================

function anthropicToOpenAISSE(upstream: Response, model: string): Response {
  const encoder = new TextEncoder()
  const id = `chatcmpl-${Date.now()}`
  const created = Math.floor(Date.now() / 1000)
  const baseChoice = (delta: any, finishReason: string | null) => ({
    index: 0,
    delta,
    finish_reason: finishReason
  })
  let sentRole = false

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.pipeThrough(new TextDecoderStream()).getReader()

      const send = (delta: any, finishReason: string | null) => {
        if (!sentRole && delta.role === undefined) {
          delta.role = 'assistant'
          sentRole = true
        }
        const chunk = {
          id,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [baseChoice(delta, finishReason)]
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
      }

      const parser = createParser({
        onEvent(event) {
          if (event.data === '[DONE]' || !event.data) return
          let evt: any
          try {
            evt = JSON.parse(event.data)
          } catch {
            return
          }

          switch (evt.type) {
            case 'content_block_start': {
              const block = evt.content_block
              if (block?.type === 'tool_use') {
                send(
                  {
                    tool_calls: [
                      {
                        index: evt.index,
                        id: block.id,
                        type: 'function',
                        function: { name: block.name, arguments: '' }
                      }
                    ]
                  },
                  null
                )
              }
              break
            }
            case 'content_block_delta': {
              const d = evt.delta
              if (d?.type === 'text_delta') {
                send({ content: d.text ?? '' }, null)
              } else if (d?.type === 'input_json_delta') {
                send(
                  {
                    tool_calls: [
                      {
                        index: evt.index,
                        function: { arguments: d.partial_json ?? '' }
                      }
                    ]
                  },
                  null
                )
              }
              // thinking_delta / signature_delta 直接丢
              break
            }
            case 'message_delta': {
              const stop = evt.delta?.stop_reason
              if (stop) {
                const finish = stop === 'tool_use' ? 'tool_calls' : 'stop'
                send({}, finish)
              }
              break
            }
            case 'message_stop': {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              break
            }
            // 忽略：message_start / content_block_stop / ping / error
          }
        }
      })

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        parser.feed(value)
      }
      // 兜底：万一上游忘了 message_stop
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    }
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  })
}

// ============================================================
// 工具
// ============================================================

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '')
}

// 显式导出类型供其他 provider 参考（不必 import）
export type { ToolCall }
