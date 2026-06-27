// Integration smoke test for the demo's edit-form validator + executor.
// Simulates AI tool calls and verifies the form-completeness rules kick in
// at the right points (addComponent for value validation, submit for
// cross-component invariants).

import { describe, expect, it } from 'vite-plus/test'
import { installFormCompletenessValidator, validateAddComponentArgs } from '../atomicTools'
import { UIBuilder } from '@triggerix-ai/builder'

describe('demo edit-form validator', () => {
  describe('validateAddComponentArgs (per-call)', () => {
    it('rejects input with no value at all', () => {
      const errors = validateAddComponentArgs({
        type: 'input',
        name: 'nick',
        props: { placeholder: '昵称' }
      })
      expect(errors).not.toBeNull()
      expect(errors![0]).toContain('必填 props.value')
    })

    it('rejects input with literal (non-$ref) value', () => {
      const errors = validateAddComponentArgs({
        type: 'input',
        name: 'nick',
        props: { value: '张三' }
      })
      expect(errors).not.toBeNull()
      expect(errors![0]).toContain('$ref:user.<field>')
    })

    it('accepts input with $ref value', () => {
      const errors = validateAddComponentArgs({
        type: 'input',
        name: 'nick',
        props: { value: '$ref:user.nickname' }
      })
      expect(errors).toBeNull()
    })

    it('rejects radio with no options', () => {
      const errors = validateAddComponentArgs({
        type: 'radio',
        name: 'gender',
        props: { value: '$ref:user.gender' }
      })
      expect(errors).not.toBeNull()
      expect(errors![0]).toContain('options')
    })

    it('rejects radio with empty options array', () => {
      const errors = validateAddComponentArgs({
        type: 'radio',
        name: 'gender',
        props: { value: '$ref:user.gender', options: [] }
      })
      expect(errors).not.toBeNull()
    })

    it('accepts radio with options and $ref value', () => {
      const errors = validateAddComponentArgs({
        type: 'radio',
        name: 'gender',
        props: {
          value: '$ref:user.gender',
          options: [{ value: 'male', label: '男' }]
        }
      })
      expect(errors).toBeNull()
    })

    it('rejects button without label', () => {
      const errors = validateAddComponentArgs({
        type: 'button',
        name: 'btn',
        props: {}
      })
      expect(errors).not.toBeNull()
      expect(errors![0]).toContain('label')
    })
  })

  describe('installFormCompletenessValidator (submit-time)', () => {
    // The actual rule set mirrors what the user originally hit:
    // - editable without button → rejected
    // - button without trigger → rejected
    // - input without $ref value → rejected
    // - complete draft → accepted

    function makeBuilder() {
      const b = new UIBuilder()
      b.setValidTypes({
        componentType: new Set(['input', 'radio', 'select', 'checkbox', 'button', 'label']),
        actionType: new Set(['save'])
      })
      installFormCompletenessValidator(b)
      return b
    }

    it('reproduces the original bug case: AI only adds input, no button', () => {
      const b = makeBuilder()
      b.addComponent('input', 'nick', { value: '$ref:user.nickname' })
      const r = b.submit()
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.errors.some((e) => e.includes('提交按钮'))).toBe(true)
      }
    })

    it('rejects button with no trigger', () => {
      const b = makeBuilder()
      b.addComponent('input', 'nick', { value: '$ref:user.nickname' })
      b.addComponent('button', 'btn', { label: '保存' })
      // no addTrigger called
      const r = b.submit()
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.errors.some((e) => e.includes('addTrigger'))).toBe(true)
      }
    })

    it('rejects input without $ref value at submit time', () => {
      // AI calls addComponent("input", "nick", { value: "" }) somehow bypasses
      // addComponent validation (e.g. via direct builder.addComponent in tests,
      // or the value got cleared by an updateComponentProp). Submit must still catch.
      const b = makeBuilder()
      b.addComponent('input', 'nick', { value: '' })
      b.addComponent('button', 'btn', { label: '保存' })
      b.addTrigger('button.click', 'btn', 'save', {})
      const r = b.submit()
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.errors.some((e) => e.includes('$ref:user.<field>'))).toBe(true)
      }
    })

    it('rejects radio with no options at submit time', () => {
      const b = makeBuilder()
      b.addComponent('radio', 'gender', { value: '$ref:user.gender' })
      b.addComponent('button', 'btn', { label: '保存' })
      b.addTrigger('button.click', 'btn', 'save', {})
      const r = b.submit()
      expect(r.ok).toBe(false)
    })

    it('accepts the full nickname + gender form', () => {
      const b = makeBuilder()
      b.addComponent('input', 'nick', { value: '$ref:user.nickname' })
      b.addComponent('radio', 'gender', {
        value: '$ref:user.gender',
        options: [
          { value: 'male', label: '男' },
          { value: 'female', label: '女' }
        ]
      })
      b.addComponent('button', 'btn', { label: '保存' })
      b.addTrigger('button.click', 'btn', 'save', { name: '$ref:nick.value' })
      const r = b.submit()
      expect(r.ok).toBe(true)
    })

    it('accepts readonly/info-only drafts (no editable, just labels)', () => {
      // User intent: "show me my orders". No input/radio/select, just labels.
      // Should pass even without a button.
      const b = makeBuilder()
      b.addComponent('label', 'info', { text: '这是你的订单列表' })
      const r = b.submit()
      expect(r.ok).toBe(true)
    })
  })
})
