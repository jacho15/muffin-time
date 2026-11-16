import { describe, it, expect } from 'vitest'
import { groupByCard } from '../lib/budget'

const expenses = [
  { card: 'Visa', amount: 10 },
  { card: 'Visa', amount: 5.5 },
  { card: null, amount: 40 },
  { card: '', amount: 1 },
  { card: 'Amex', amount: '3' },
]

describe('groupByCard', () => {
  it('sums amounts and sorts largest first, grouping empty cards as No card', () => {
    expect(groupByCard(expenses, 'amount')).toEqual([
      { name: 'No card', value: 41 },
      { name: 'Visa', value: 15.5 },
      { name: 'Amex', value: 3 },
    ])
  })

  it('counts transactions', () => {
    expect(groupByCard(expenses, 'count')).toEqual([
      { name: 'Visa', value: 2 },
      { name: 'No card', value: 2 },
      { name: 'Amex', value: 1 },
    ])
  })

  it('returns an empty list for no expenses', () => {
    expect(groupByCard([], 'amount')).toEqual([])
  })
})
