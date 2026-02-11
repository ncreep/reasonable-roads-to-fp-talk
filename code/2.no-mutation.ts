import { UserId, OrderId, PackageId, ItemId, Warehouse, Item, Package, Order, ShippingDirective, ConsolidationDiscount } from './types'
import { getConsolidationDiscount, calculateShippingCost, withPremiumLabels, withDiscount, type User } from './utils'

export const WarehouseSystem = {
  init(config: { test: boolean }) { },

  notifyPackageReady(warehouse: Warehouse, orderId: OrderId, packageId: PackageId): void { },
  notifyPackagesReady(warehouse: Warehouse, orderId: OrderId, packages: PackageId[]): void { }
}

export const CustomerNotifications = {
  init(config: { test: boolean }) { },

  notifyItemShipping(customerId: UserId, itemId: ItemId): void { }
}

export const DB = {
  init(config: { test: boolean }) { },

  getItemById(id: ItemId): Item { throw new Error('Not implemented') },

  getOrderPackages(orderId: OrderId): { packageId: PackageId, warehouse: Warehouse, itemIds: ItemId[] }[] {
    return []
  },

  getOrderCustomer(orderId: UserId): UserId {
    return UserId('')
  }
}

export const OrderFetcher = {
  itemCache: new Map<ItemId, Item>(),

  init(config: { test: boolean }) { },

  fetch(orderId: OrderId): Order {
    const customerId = DB.getOrderCustomer(orderId)
    const packageData = DB.getOrderPackages(orderId)

    const packages: Package[] = []

    for (const pkgData of packageData) {
      const items: Item[] = []

      for (const itemId of pkgData.itemIds) {
        let item: Item

        if (this.itemCache.has(itemId)) {
          item = (this.itemCache.get(itemId)!)
        } else {
          item = DB.getItemById(itemId)
          this.itemCache.set(item.id, item)
        }

        items.push(item)
      }

      packages.push({
        id: pkgData.packageId,
        warehouse: pkgData.warehouse,
        items
      })
    }

    return {
      id: orderId,
      customerId,
      packages
    }
  }
}

export const ShippingHandler = {
  init(config: { test: boolean }) { },

  dispatch(directives: ShippingDirective[]): void { }
}

export function processShipping(orderId: OrderId, user: User): void {
  const order = OrderFetcher.fetch(orderId)

  const directives: ShippingDirective[] = []
  const warehouseCounts = new Map<Warehouse, number>()

  for (const pkg of order.packages) {
    WarehouseSystem.notifyPackageReady(pkg.warehouse, orderId, pkg.id)

    const currentCount = warehouseCounts.get(pkg.warehouse) || 0
    warehouseCounts.set(pkg.warehouse, currentCount + pkg.items.length)

    for (const item of pkg.items) {
      CustomerNotifications.notifyItemShipping(order.customerId, item.id)

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

  ShippingHandler.dispatch(withDiscounts)
}
