import type { War3ActionDef, War3EventDef } from 'triggerix-editor-preset-war3'
import { defineCondition as defineConditionImpl } from 'triggerix-editor-preset-war3'

/**
 * Identity wrappers that keep the demo definitions consistent in style.
 * The published @triggerix/editor types now include `id` and `label`, so
 * no excess-property workaround is needed.
 */
export function defineEvent(def: War3EventDef): War3EventDef {
  return def
}

export function defineAction(def: War3ActionDef): War3ActionDef {
  return def
}

export const defineCondition = defineConditionImpl
