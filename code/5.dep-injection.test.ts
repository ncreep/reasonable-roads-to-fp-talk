import { describe, it } from 'vitest'
import {
  OrderFulfillmentService,
  type WarehouseSystem,
  type CustomerNotifications,
  type OrderFetcher,
  type ShippingHandler,
} from './4.dep-injection'
import { MembershipLevel, OrderId, UserId } from './types'

describe('processShipping', () => {
  it('should process shipping', () => {
    const orderFetcher: OrderFetcher = {
      fetch(orderId) {
        throw new Error("not implemented")
      }
    }

    const warehouseSystem: WarehouseSystem = {
      notifyPackageReady(warehouse, orderId, packageId): void { },
      notifyPackagesReady(warehouse, orderId, packages): void { }
    }

    const customerNotifications: CustomerNotifications = {
      notifyItemShipping(customerId, item): void { }
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

    const orderId = OrderId("abc")
    const user = {
      id: UserId("def"),
      membershipLevel: MembershipLevel.premium
    }

    // orderFulfillmentService.processShipping(orderId, user)

    // ... actual test
  })
})
