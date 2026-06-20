<script setup lang="ts">
/**
 * 聊天面板。
 *
 * 接收 useChatSession 产出的 messages 数组，按角色渲染：
 *  - user：右气泡，纯文本
 *  - assistant：左气泡，markdown 渲染（markstream-vue）
 *  - tool：不渲染（AI 调用工具的回执消息，不在 UI 显示）
 *
 * assistant 消息如果有 tool_calls，在气泡底部加一行"已调用工具"标记。
 */

import { computed, nextTick, ref, watch } from 'vue'
import MarkdownRender from 'markstream-vue'
import MessageBubble from './MessageBubble.vue'
import ScrollView from '../../../components/ScrollView.vue'
import type { ChatMessage } from '../../../composables/useChatSession'

/** 维护每条 assistant 消息的 bubble DOM 引用（异步工具挂载点） */
const bubbleEls = new Map<number, HTMLElement>()
function setBubbleRef(msgId: number) {
  return (el: any) => {
    if (el) bubbleEls.set(msgId, el as HTMLElement)
    else bubbleEls.delete(msgId)
  }
}

function bubbleElFor(msgId: number): HTMLElement | null {
  return bubbleEls.get(msgId) ?? null
}

defineExpose({ bubbleElFor, modalHost: ref<HTMLElement | null>(null) })

const props = defineProps<{
  messages: ChatMessage[]
  /** AI 是否还在思考（用于顶部 loading 圆点） */
  thinking: boolean
  /** 错误信息（红条显示） */
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'send', text: string): void
}>()

const scrollEl = ref<InstanceType<typeof ScrollView> | null>(null)
const inputText = ref('')
const sending = ref(false)

const canSend = computed(() => !sending.value && inputText.value.trim().length > 0)

/** 仅渲染 user + assistant 消息（tool 回执不显示） */
const visibleMessages = computed(() =>
  props.messages.filter((m) => m.role === 'user' || m.role === 'assistant')
)

function send() {
  const t = inputText.value.trim()
  if (!t) return
  inputText.value = ''
  sending.value = true
  emit('send', t)
  setTimeout(() => {
    sending.value = false
  }, 300)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function scrollToBottom() {
  const el = scrollEl.value?.getEl()
  if (el) el.scrollTop = el.scrollHeight
}

watch(
  () => props.messages.length,
  () => nextTick(scrollToBottom)
)
watch(
  () => visibleMessages.value.at(-1)?.content,
  () => nextTick(scrollToBottom)
)
</script>

<template>
  <div class="ai-chat-panel">
    <header class="ai-chat-header">
      <span class="ai-chat-status-dot" :class="{ 'ai-chat-status-active': thinking }" />
      <div class="ai-chat-title">
        AI 助手
        <span class="ai-chat-subtitle">Triggerix · MiniMax-M3 · Function Calling</span>
      </div>
    </header>

    <ScrollView ref="scroll" class="ai-chat-scroll">
      <div v-if="visibleMessages.length === 0" class="ai-chat-empty">
        <p class="ai-chat-empty-title">你好，我是点餐助手</p>
        <p class="ai-chat-empty-hint">试试说：「我要点餐」「我要修改昵称」「我要修改性别」</p>
        <p class="ai-chat-empty-hint">「我要取消订单」「我要支付」</p>
      </div>

      <MessageBubble
        v-for="m in visibleMessages"
        :key="m.id"
        :position="m.role === 'user' ? 'right' : 'left'"
      >
        <template v-if="m.role === 'assistant'">
          <div :ref="setBubbleRef(m.id)" class="ai-bubble-content">
            <span v-if="m.streaming && !m.content" class="ai-chat-streaming-dots">···</span>
            <template v-else>
              <MarkdownRender
                mode="chat"
                :content="m.content"
                :final="!m.streaming"
                :max-live-nodes="0"
                :render-batch-size="16"
                :render-batch-delay="8"
                smooth-streaming="auto"
                :fade="false"
                :typewriter="true"
                html-policy="escape"
                class="ai-chat-markdown"
              />
              <div v-if="m.tool_calls && m.tool_calls.length > 0" class="ai-chat-toolcalls">
                <span class="ai-chat-toolcalls-label">已调用工具：</span>
                <span
                  v-for="(tc, idx) in m.tool_calls"
                  :key="tc.id ?? idx"
                  class="ai-chat-toolcall-chip"
                  >{{ tc.name }}</span
                >
              </div>
            </template>
          </div>
        </template>
        <template v-else>
          {{ m.content }}
        </template>
      </MessageBubble>

      <div v-if="error" class="ai-chat-error">{{ error }}</div>
    </ScrollView>

    <div class="ai-chat-inputbar">
      <textarea
        v-model="inputText"
        rows="2"
        placeholder="说点什么…（Shift+Enter 换行）"
        class="ai-chat-input"
        @keydown="onKeydown"
      />
      <button class="ai-chat-send" :disabled="!canSend" @click="send">发送</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ai-chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0a0c11;
}
.ai-chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid #2a3348;
  background: #0c0e14;
  flex-shrink: 0;
}
.ai-chat-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4f5b6e;
  transition: background 0.2s;
}
.ai-chat-status-active {
  background: #5fb3a1;
  box-shadow: 0 0 8px rgba(95, 179, 161, 0.6);
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}
.ai-chat-title {
  font-size: 13px;
  font-weight: 600;
  color: #e6edf3;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ai-chat-subtitle {
  font-size: 10px;
  color: #7a8599;
  font-family: ui-monospace, monospace;
  font-weight: 400;
  letter-spacing: 0.05em;
}
.ai-chat-scroll {
  flex: 1;
  min-height: 0;
  padding: 16px;
}
.ai-chat-empty {
  text-align: center;
  padding: 60px 24px;
  color: #7a8599;
}
.ai-chat-empty-title {
  font-size: 14px;
  color: #c9a84c;
  margin: 0 0 16px;
  font-weight: 600;
}
.ai-chat-empty-hint {
  font-size: 12px;
  color: #7a8599;
  margin: 4px 0;
  line-height: 1.6;
}
.ai-chat-streaming-dots {
  color: #c9a84c;
  letter-spacing: 0.2em;
  animation: pulse 1.2s ease-in-out infinite;
}
.ai-chat-error {
  margin: 8px 0;
  padding: 10px 12px;
  background: rgba(240, 112, 124, 0.12);
  color: #f7b1b9;
  border: 1px solid rgba(240, 112, 124, 0.35);
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
}

/* markstream-vue 暗色气泡样式（参考 imba97-me） */
:deep(.ai-chat-markdown.markstream-vue),
:deep(.ai-bubble-suffix.markstream-vue) {
  color: inherit;
  font-size: 13px;
  line-height: 1.55;
  word-break: break-word;
  // 段落上下间隔（参考 imba97-me 的 --ms-flow-paragraph-y）
  --ms-flow-paragraph-y: 0.25em;

  // 第一个段落不要上边距、最后一个段落不要下边距（参考 imba97-me）
  > .node-slot:first-child .paragraph-node {
    margin-top: 0;
  }
  > .node-slot:last-child .paragraph-node {
    margin-bottom: 0;
  }

  .paragraph-node,
  p {
    margin: var(--ms-flow-paragraph-y) 0;
  }
  .strong-node,
  strong {
    color: #f0d28c;
  }
  .em-node,
  em {
    color: #b9e8dd;
  }
  a {
    color: #4fc3f7;
    text-decoration: underline;
  }
  code {
    background: #1a1f2c;
    color: #f0d28c;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 12px;
  }
  pre {
    background: #1a1f2c;
    border: 1px solid #2a3348;
    border-radius: 6px;
    padding: 8px 10px;
    overflow-x: auto;
    margin: var(--ms-flow-paragraph-y) 0;
    code {
      background: transparent;
      padding: 0;
    }
  }
  ul,
  ol {
    margin: var(--ms-flow-paragraph-y) 0;
    padding-left: 1.4em;
  }
  li {
    margin: 0.1em 0;
  }
  blockquote {
    margin: var(--ms-flow-paragraph-y) 0;
    padding: 4px 10px;
    border-left: 3px solid #c9a84c;
    background: rgba(201, 168, 76, 0.06);
    color: #c9d1d9;
  }
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    color: #f0d28c;
    margin: 0.5em 0 0.2em;
    line-height: 1.3;
  }
  h1 {
    font-size: 1.15em;
  }
  h2 {
    font-size: 1.1em;
  }
  h3 {
    font-size: 1.05em;
  }
  h4,
  h5,
  h6 {
    font-size: 1em;
  }
}
.ai-chat-toolcalls {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 11px;
}
.ai-chat-toolcalls-label {
  color: #7a8599;
  margin-right: 2px;
}
.ai-chat-toolcall-chip {
  font-family: ui-monospace, monospace;
  font-size: 10px;
  padding: 2px 6px;
  background: rgba(201, 168, 76, 0.15);
  color: #f0d28c;
  border: 1px solid rgba(201, 168, 76, 0.3);
  border-radius: 3px;
}
.ai-chat-inputbar {
  display: flex;
  gap: 8px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0));
  border-top: 1px solid #2a3348;
  background: #0c0e14;
  flex-shrink: 0;
}
.ai-chat-input {
  flex: 1;
  resize: none;
  background: #0a0c11;
  color: #e6edf3;
  border: 1px solid #2a3348;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  line-height: 1.5;
  transition: border-color 0.15s;
}
.ai-chat-input:focus {
  border-color: #4fc3f7;
}
.ai-chat-send {
  background: linear-gradient(180deg, #c9a84c, #a8862e);
  color: #1a1408;
  border: 0;
  border-radius: 6px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  align-self: stretch;
  flex-shrink: 0;
  transition: filter 0.15s;
}
.ai-chat-send:hover:not(:disabled) {
  filter: brightness(1.1);
}
.ai-chat-send:disabled {
  background: #2a3348;
  color: #4f5b6e;
  cursor: not-allowed;
}
.ai-bubble-content {
  // assistant 消息气泡内容容器（异步工具的 UI 模板 mount 到这里）
  display: flex;
  flex-direction: column;
  gap: 6px;
}
// 异步工具的 UI 模板外层包装（mountTemplate 时动态创建）
// 样式从 src/ai-app-shared/templateStyles.scss 引入
:deep(.ai-template-mount) {
  // 透传 scoped 样式限制：把外层 mount 的样式声明下来
  // （实际样式在 templateStyles.scss 里）
}
</style>
