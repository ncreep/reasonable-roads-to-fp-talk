import { UserId } from './types'

export type User = {
  readonly id: UserId
  readonly membershipLevel: string
}

export function getConsolidationDiscount(itemCount: number): number {
  if (itemCount >= 10) return 0.20
  if (itemCount >= 5) return 0.10
  if (itemCount >= 3) return 0.05
  return 0
}

export function calculateShippingCost(weight: number, price: number): number {
  return weight * 2.5 + (price > 100 ? 0 : 5)
}

export const withPremiumLabels = (user: User, labels: readonly string[]): readonly string[] =>
  user.membershipLevel === 'premium'
    ? [...labels, 'PRIORITY', 'VIP_CUSTOMER']
    : labels
