import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  Car,
  Gamepad2,
  GraduationCap,
  ShoppingBag,
  Tag,
  Utensils
} from 'lucide-react'

export type SpendPoint = { day: number; february: number; january: number }
export type UpcomingDay = {
  day: number
  muted?: boolean
  highlighted?: boolean
}
export type LatestTransaction = {
  name: string
  date: string
  amount: string
  icon: LucideIcon
  tone: 'orange' | 'neutral'
  hidden?: boolean
}
export type ExpenseCategory = {
  name: string
  percent: number
  amount: string
  icon: LucideIcon
  color: string
}

/** Février : plateau bas puis marche montante vers 72. Janvier : comparaison plus haute, en deux paliers. */
export const SPEND_SERIES: SpendPoint[] = Array.from({ length: 28 }, (_, i) => {
  const day = i + 1
  const february = day < 12 ? 6 : 72
  const january = day < 11 ? 6 : day < 20 ? 96 : 150
  return { day, february, january }
})

export const UPCOMING_DAYS: UpcomingDay[] = [
  { day: 22, muted: true },
  { day: 23, muted: true },
  { day: 24, muted: true },
  { day: 25, muted: true },
  { day: 26, muted: true },
  { day: 27, highlighted: true },
  { day: 28, muted: true },
  { day: 1 },
  { day: 2 },
  { day: 3 },
  { day: 4 },
  { day: 5 },
  { day: 6 },
  { day: 7 }
]

export const LATEST_TRANSACTIONS: LatestTransaction[] = [
  {
    name: 'Taobao',
    date: 'Feb 12',
    amount: '$71.95',
    icon: ShoppingBag,
    tone: 'orange'
  },
  {
    name: 'To SGD (Added)',
    date: 'Feb 12',
    amount: '+$50.00',
    icon: ArrowLeftRight,
    tone: 'neutral',
    hidden: true
  },
  {
    name: 'Kraken Exchange',
    date: 'Jan 21',
    amount: '$10.00',
    icon: ArrowLeftRight,
    tone: 'neutral',
    hidden: true
  },
  {
    name: 'Grab',
    date: 'Jan 21',
    amount: '$106.39',
    icon: Car,
    tone: 'orange'
  },
  {
    name: 'Geo Adventure Indonesia',
    date: 'Jan 13',
    amount: '$291.78',
    icon: Tag,
    tone: 'neutral'
  }
]

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    name: 'Shopping',
    percent: 100,
    amount: '$72',
    icon: ShoppingBag,
    color: 'bg-orange-500'
  },
  {
    name: 'Drinks & dining',
    percent: 0,
    amount: '$0',
    icon: Utensils,
    color: 'bg-yellow-500'
  },
  {
    name: 'Childcare & education',
    percent: 0,
    amount: '$0',
    icon: GraduationCap,
    color: 'bg-sky-500'
  },
  {
    name: 'Auto & transport',
    percent: 0,
    amount: '$0',
    icon: Car,
    color: 'bg-rose-400'
  },
  {
    name: 'Entertainment',
    percent: 0,
    amount: '$0',
    icon: Gamepad2,
    color: 'bg-violet-500'
  }
]
