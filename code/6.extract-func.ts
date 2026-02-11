import { OrderId, Warehouse, Order, ShippingDirective, WarehouseSystem, CustomerNotifications, OrderFetcher, ShippingHandler, ConsolidationDiscount } from './types'
import { getConsolidationDiscount, calculateShippingCost, withPremiumLabels, withDiscount, type User } from './utils'

export class OrderFulfillmentService {
  private readonly shippingDirectivesCalc: ShippingDirectivesCalculator

  constructor(
    private readonly orderFetcher: OrderFetcher,
    warehouseSystem: WarehouseSystem,
    customerNotifications: CustomerNotifications,
    private readonly shippingHandler: ShippingHandler
  ) {
    this.shippingDirectivesCalc = new ShippingDirectivesCalculator(warehouseSystem, customerNotifications)
  }

  processShipping(orderId: OrderId, user: User): void {
    const order = this.orderFetcher.fetch(orderId)

    const directives = this.shippingDirectivesCalc.calculate(order, user)

    this.shippingHandler.dispatch(directives)
  }
}

class ShippingDirectivesCalculator {
  constructor(
    private readonly warehouseSystem: WarehouseSystem,
    private readonly customerNotifications: CustomerNotifications,
  ) { }

  calculate(order: Order, user: User): ShippingDirective[] {
    const directives: ShippingDirective[] = []
    const warehouseCounts = new Map<Warehouse, number>()

    for (const pkg of order.packages) {
      this.warehouseSystem.notifyPackageReady(pkg.warehouse, order.id, pkg.id)

      const currentCount = warehouseCounts.get(pkg.warehouse) || 0
      warehouseCounts.set(pkg.warehouse, currentCount + pkg.items.length)

      for (const item of pkg.items) {
        const shippingCost = calculateShippingCost(item.weight, item.price)

        this.customerNotifications.notifyItemShipping(user.id, item.id, shippingCost)

        directives.push({
          order,
          package: pkg,
          itemId: item.id,
          labels: withPremiumLabels(user, item.labels),
          shippingCost,
          consolidationDiscount: ConsolidationDiscount.zero
        })
      }
    }

    const withDiscounts: ShippingDirective[] = []
    for (const directive of directives) {
      const warehouseItemCount = warehouseCounts.get(directive.package.warehouse)!
      const discount = getConsolidationDiscount(warehouseItemCount)
      const newDirective = withDiscount(directive, discount)

      withDiscounts.push(newDirective)
    }

    return withDiscounts
  }
}
