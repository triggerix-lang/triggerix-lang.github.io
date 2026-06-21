/**
 * 优惠券 + 支付方式静态数据
 *
 * 与 menuData.ts 风格一致：纯静态导出，被 useFoodApp / businessHandlers / atomicTools / MyOrders 共用
 */

export type CouponType = 'amount' | 'percent'

export interface Coupon {
  id: string
  /** 短标题，给 UI / LLM 看的 */
  label: string
  /** 详细说明（description） */
  description: string
  type: CouponType
  /**
   * - amount:  减免的元数
   * - percent: 折扣率，0.95 = 95 折
   */
  value: number
  /** 最低消费（按 cart 小计） */
  minSpend: number
}

/** 全部可用优惠券 */
export const COUPON_DATA: Coupon[] = [
  {
    id: 'coupon_new10',
    label: '满100减10',
    description: '满100元立减10元',
    type: 'amount',
    value: 10,
    minSpend: 100
  },
  {
    id: 'coupon_200_30',
    label: '满200减30',
    description: '满200元立减30元',
    type: 'amount',
    value: 30,
    minSpend: 200
  },
  {
    id: 'coupon_300_50',
    label: '满300减50',
    description: '满300元立减50元',
    type: 'amount',
    value: 50,
    minSpend: 300
  },
  {
    id: 'coupon_95fold',
    label: '95折券',
    description: '全单95折',
    type: 'percent',
    value: 0.95,
    minSpend: 0
  },
  {
    id: 'coupon_freeship',
    label: '免运费(5元)',
    description: '减免运费5元',
    type: 'amount',
    value: 5,
    minSpend: 0
  }
]

/** 合法支付方式（与 SubmittedOrder.paymentMethod 联合类型保持一致） */
export const PAYMENT_METHODS = [
  { value: 'wechat', label: '微信支付' },
  { value: 'alipay', label: '支付宝' },
  { value: 'card', label: '银行卡' }
] as const
