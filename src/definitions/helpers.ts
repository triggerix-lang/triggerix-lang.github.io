import type {
  SlotDef,
  War3ActionDef,
  War3ConditionDef,
  War3EventDef
} from 'triggerix-ui-preset-war3'

/**
 * Locally-typed shape that mirrors what registerEvent/registerAction etc.
 * actually need at runtime. Published @triggerix/editor types currently
 * omit `type` and `label`, so we wrap object literals through these
 * helpers to bypass strict excess-property checks.
 */
interface ItemDef {
  type: string
  label?: string
  template: string
  slots?: Record<string, SlotDef>
}

export function defineEvent(def: ItemDef): War3EventDef {
  return def as unknown as War3EventDef
}

export function defineAction(def: ItemDef): War3ActionDef {
  return def as unknown as War3ActionDef
}

export function defineCondition(def: ItemDef): War3ConditionDef {
  return def as unknown as War3ConditionDef
}
