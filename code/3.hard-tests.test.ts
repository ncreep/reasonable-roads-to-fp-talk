import { describe, expect, it } from 'vitest'
import { DB, OrderFetcher, WarehouseSystem, CustomerNotifications, ShippingHandler, processShipping } from './2.no-mutation'
import { MembershipLevel, OrderId, UserId } from './types'

describe('processShipping', () => {
  it('should process shipping', () => {
    DB.init({ test: true })
    OrderFetcher.init({ test: true })
    WarehouseSystem.init({ test: true })
    CustomerNotifications.init({ test: true })
    ShippingHandler.init({ test: true })

    const orderId = OrderId("abc")
    const user = {
      id: UserId("def"),
      membershipLevel: MembershipLevel.premium
    }

    // ... actual test
    processShipping(orderId, user)

  })
})
