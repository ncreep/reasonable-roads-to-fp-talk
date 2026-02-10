import { describe, it } from 'vitest'
import { DB, OrderFetcher, WarehouseSystem, CustomerNotifications, ShippingHandler } from './2.no-mutation'

describe('processShipping', () => {
  it('should process shipping', () => {
    DB.init({ test: true })
    OrderFetcher.init({ test: true })
    WarehouseSystem.init({ test: true })
    CustomerNotifications.init({ test: true })
    ShippingHandler.init({ test: true })

    // ... actual test
  })
})
