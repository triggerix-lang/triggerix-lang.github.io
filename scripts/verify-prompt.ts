/**
 * 验证 atomicTools 生成的 system prompt 包含新的"完整性原则"和"编辑表单单元"段落。
 *
 * 直接调 buildAtomicTools 渲染 prompt，不需要起 dev server 或打 AI 请求。
 * 跑法：`npx tsx scripts/verify-prompt.ts`
 */
import { buildAtomicTools } from '../src/ai-app-shared/atomicTools'
import process from 'node:process'

const { systemPrompt } = buildAtomicTools({
  menu: () => [],
  tabs: () => [],
  options: () => [],
  coupons: () => [],
  paymentMethods: () => [],
  businessHandlers: new Map(),
  pushToast: () => {}
})

const checks: Array<[string, boolean]> = [
  ['完整性原则章节', systemPrompt.includes('完整性原则')],
  ['逻辑单元表述', systemPrompt.includes('逻辑单元')],
  ['删除了"一个表单 = 输入元素"', !systemPrompt.includes('一个表单 = 输入元素')],
  ['删除了"组件尽量少"', !systemPrompt.includes('组件尽量少')],
  ['当前态回显章节', systemPrompt.includes('当前态回显')],
  ['编辑表单章节', systemPrompt.includes('编辑表单')],
  ['完整性自检', systemPrompt.includes('完整性自检') || systemPrompt.includes('submit 之前必走')],
  [
    '不再含 nickname/gender 表单代码示例',
    !systemPrompt.includes('"nickInput"') && !systemPrompt.includes('"genderRadio"')
  ],
  ['不再含 placeholder 装饰提示', !systemPrompt.includes('不需要 label 包装')],
  ['强调提交校验拦截', systemPrompt.includes('校验拦截') || systemPrompt.includes('完整性校验')]
]

let pass = 0
for (const [name, ok] of checks) {
  console.log(ok ? '✓' : '✗', name)
  if (ok) pass++
}
console.log(`\n${pass}/${checks.length} passed`)

if (pass !== checks.length) process.exit(1)
