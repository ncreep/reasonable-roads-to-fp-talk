import { describe, it } from 'vitest'
import {
  OrderFulfillmentService,
  type WarehouseSystem,
  type CustomerNotifications,
  type OrderFetcher,
  type ShippingHandler,
} from './4.dep-injection'

describe('processShipping', () => {
  it('should process shipping', () => {
    const warehouseSystem: WarehouseSystem = {
      notifyPackageReady(warehouse, orderId, packageId): void { },
      notifyPackagesReady(warehouse, orderId, packages): void { }
    }

    const customerNotifications: CustomerNotifications = {
      notifyItemShipping(customerId, item): void { }
    }

    // TODO point out how DB is no longer needed

    const orderFetcher: OrderFetcher = {
      fetch(orderId) {
        throw new Error("not implemented")
      }
    }

    const shippingHandler: ShippingHandler = {
      dispatch(directives): void { }
    }

    const orderFulfillmentService = new OrderFulfillmentService(
      orderFetcher,
      warehouseSystem,
      customerNotifications,
      shippingHandler
    )

    // ... actual test
  })
})
