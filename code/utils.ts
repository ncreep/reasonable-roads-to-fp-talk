import { type User, type ShippingDirective, Label, Weight, Price, MembershipLevel, ShippingCost, ConsolidationDiscount } from './types'

export type { User }

export function getConsolidationDiscount(itemCount: number): ConsolidationDiscount {
  if (itemCount >= 10) return ConsolidationDiscount(0.20)
  if (itemCount >= 5) return ConsolidationDiscount(0.10)
  if (itemCount >= 3) return ConsolidationDiscount(0.05)
  return ConsolidationDiscount(0)
}

export function calculateShippingCost(weight: Weight, price: Price): ShippingCost {
  return ShippingCost(weight.value * 2.5 + (price.value > 100 ? 0 : 5))
}

export const withPremiumLabels = (user: User, labels: readonly Label[]): readonly Label[] =>
  user.membershipLevel === MembershipLevel.premium
    ? [...labels, Label.PRIORITY, Label.VIP_CUSTOMER]
    : labels

export const withDiscount = (directive: ShippingDirective, consolidationDiscount: ConsolidationDiscount): ShippingDirective => ({
  ...directive,
  consolidationDiscount
})
