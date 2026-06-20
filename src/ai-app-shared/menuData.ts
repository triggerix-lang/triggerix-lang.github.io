/**
 * 报菜名菜单数据 - 餐饮点餐 app 业务数据
 * 与前端组件、Netlify Function 共享
 */

export interface MenuItem {
  id: string
  name: string
  price: number
  category: '肉类' | '禽类' | '凉菜' | '腊味'
}

/** 完整报菜名菜谱 */
export const MENU_DATA: MenuItem[] = [
  { id: 'dish_zheng_yang_gao', name: '蒸羊羔', price: 88, category: '肉类' },
  { id: 'dish_zheng_xiong_zhang', name: '蒸熊掌', price: 168, category: '肉类' },
  { id: 'dish_zheng_lu_wei_er', name: '蒸鹿尾儿', price: 128, category: '肉类' },
  { id: 'dish_shao_hua_ya', name: '烧花鸭', price: 58, category: '禽类' },
  { id: 'dish_shao_chi_ji', name: '烧雏鸡', price: 48, category: '禽类' },
  { id: 'dish_shao_zi_e', name: '烧子鹅', price: 68, category: '禽类' },
  { id: 'dish_lu_zhu', name: '卤猪', price: 38, category: '肉类' },
  { id: 'dish_lu_ya', name: '卤鸭', price: 42, category: '禽类' },
  { id: 'dish_jiang_ji', name: '酱鸡', price: 36, category: '禽类' },
  { id: 'dish_la_rou', name: '腊肉', price: 45, category: '腊味' },
  { id: 'dish_song_hua', name: '松花', price: 28, category: '凉菜' },
  { id: 'dish_xiao_du_er', name: '小肚儿', price: 32, category: '腊味' },
  { id: 'dish_liang_rou', name: '晾肉', price: 35, category: '腊味' },
  { id: 'dish_xiang_chang_er', name: '香肠儿', price: 38, category: '腊味' }
]

/** 按分类分组 */
export const MENU_BY_CATEGORY: Record<string, MenuItem[]> = MENU_DATA.reduce(
  (acc, item) => {
    ;(acc[item.category] ??= []).push(item)
    return acc
  },
  {} as Record<string, MenuItem[]>
)
