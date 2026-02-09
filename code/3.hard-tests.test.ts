import { describe, it, expect } from 'vitest'
import { DB, CartFetcher, LoyaltyProgram, MarketingBudget, Tax, Billing } from './2.no-mutation'

describe('processCheckout', () => {
  it('should process checkout', () => {
    DB.init({ test: true })
    CartFetcher.init({ test: true })
    LoyaltyProgram.init({ test: true })
    MarketingBudget.init({ test: true })
    Tax.init({ test: true })
    Billing.init({ test: true })

    // ... actual test
  })
})
