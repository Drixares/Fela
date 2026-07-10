/** Static data mirroring the Origin dashboard screenshot — no live data yet. */

export interface NetWorthPoint {
  day: number
  value: number
}

/** Plateau then a late climb, matching the reference chart shape. */
export const NET_WORTH_SERIES: NetWorthPoint[] = [
  0, 40, 80, 120, 160, 200, 230, 260, 290, 310, 330, 345, 355, 360, 365, 370, 372, 375, 378, 380,
  385, 395, 420, 460, 520, 600, 700, 820, 950, 1072
].map((value, index) => ({ day: index + 1, value }))

export interface FebruaryDay {
  day: number
  amount: number
}

export const FEBRUARY_DAYS: FebruaryDay[] = Array.from({ length: 28 }, (_, i) => ({
  day: i + 1,
  amount: i + 1 === 12 ? 72 : 0
}))

export interface RecentTransaction {
  name: string
  date: string
  amount: string
  kind: 'purchase' | 'transfer'
  hidden?: boolean
}

export const RECENT_TRANSACTIONS: RecentTransaction[] = [
  { name: 'Taobao', date: 'Feb 12', amount: '$71.95', kind: 'purchase' },
  { name: 'To SGD (Added)', date: 'Feb 12', amount: '+$50.00', kind: 'transfer', hidden: true },
  { name: 'Kraken Exchange', date: 'Jan 21', amount: '$10.00', kind: 'transfer', hidden: true },
  { name: 'Grab', date: 'Feb 10', amount: '$106.39', kind: 'purchase' }
]
