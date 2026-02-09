import { describe, it, expect } from 'vitest'
import {
  CheckoutService,
  type LoyaltyProgram,
  type MarketingBudget,
  type Tax,
  type DB,
  type CartFetcher,
  type Billing,
  type User
} from './4.dep-injection'

describe('processCheckout', () => {
  it('should process checkout', () => {
    const loyaltyProgram: LoyaltyProgram = {
      addPoints(userId: string, amount: number): void { }
    }

    const marketingBudget: MarketingBudget = {
      allocate(campaignId: string, amount: number): void { }
    }

    const tax: Tax = {
      recordTransaction(userId: string, productId: string, amount: number): void { }
    }

    // TODO point out how DB is no longer needed

    const cartFetcher: CartFetcher = {
      fetch(user: User) { return [] }
    }

    const billing: Billing = {
      bill(user: User, total: number): void { }
    }

    const checkoutService = new CheckoutService(
      cartFetcher,
      loyaltyProgram,
      marketingBudget,
      tax,
      billing
    )

    // ... actual test
  })
})
