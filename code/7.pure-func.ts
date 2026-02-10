import { UserId, OrderId, PackageId, ItemId, Warehouse } from './types'
import { getConsolidationDiscount, calculateShippingCost, withPremiumLabels, type User } from './utils'

export type Item = {
  readonly id: ItemId
  readonly name: string
  readonly price: number
  readonly weight: number
  readonly labels: readonly string[]
}

export type Package = {
  readonly id: PackageId
  readonly warehouse: Warehouse
  readonly items: Item[]
}

export type Order = {
  readonly id: OrderId
  readonly customerId: UserId
  readonly packages: Package[]
}

export type ShippingDirective = {
  readonly order: Order
  readonly package: Package
  readonly itemId: ItemId
  readonly shippingCost: number
  readonly labels: readonly string[]
  consolidationDiscount: number
}

export type WarehouseSystem = {
  notifyPackageReady(warehouse: Warehouse, orderId: OrderId, packageId: PackageId): void
  notifyPackagesReady(warehouse: Warehouse, orderId: OrderId, packages: PackageId[]): void
}

export type CustomerNotifications = {
  notifyItemShipping(customerId: UserId, itemId: ItemId): void
}

export type OrderFetcher = {
  fetch(orderId: OrderId): Order
}

export type ShippingHandler = {
  dispatch(directives: ShippingDirective[]): void
}

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
        consolidationDiscount: 0
      })
    }
  }

  for (const directive of directives) {
    const warehouseItemCount = warehouseCounts.get(directive.package.warehouse)!
    directive.consolidationDiscount = getConsolidationDiscount(warehouseItemCount)
  }

  return directives
}
