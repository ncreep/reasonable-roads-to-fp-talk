import { OrderId, Warehouse, Order, ShippingDirective, WarehouseSystem, CustomerNotifications, OrderFetcher, ShippingHandler, ConsolidationDiscount } from './types'
import { getConsolidationDiscount, calculateShippingCost, withPremiumLabels, withDiscount, type User } from './utils'

export class OrderFulfillmentService {
  constructor(
    private readonly orderFetcher: OrderFetcher,
    private readonly warehouseSystem: WarehouseSystem,
    private readonly customerNotifications: CustomerNotifications,
    private readonly shippingHandler: ShippingHandler
  ) {}

  processShipping(orderId: OrderId, user: User): void {
    const order = this.orderFetcher.fetch(orderId)

    const directives = calculateShippingDirectives(order, user)

    for (const pkg of order.packages) {
      this.warehouseSystem.notifyPackageReady(pkg.warehouse, orderId, pkg.id)

      for (const item of pkg.items) {
        this.customerNotifications.notifyItemShipping(order.customerId, item.id)
      }
    }

    this.shippingHandler.dispatch(directives)
  }
}

export function calculateShippingDirectives(order: Order, user: User): ShippingDirective[] {
  const directives: ShippingDirective[] = []
  const warehouseCounts = new Map<Warehouse, number>()

  for (const pkg of order.packages) {
    const currentCount = warehouseCounts.get(pkg.warehouse) || 0
    warehouseCounts.set(pkg.warehouse, currentCount + pkg.items.length)

    for (const item of pkg.items) {
      const shippingCost = calculateShippingCost(item.weight, item.price)

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
