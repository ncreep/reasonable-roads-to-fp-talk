import { UserId, OrderId, PackageId, ItemId, Warehouse, Item, Package, Order, ShippingDirective, ConsolidationDiscount, ShippingCost } from './types'
import { getConsolidationDiscount, calculateShippingCost, withPremiumLabels, withDiscount, type User } from './utils'

export const WarehouseSystem = {
  initialized: false,

  init(config: { test: boolean }) {
    this.initialized = true
  },

  notifyPackageReady(warehouse: Warehouse, orderId: OrderId, packageId: PackageId): void {
    if (!this.initialized) throw new Error('WarehouseSystem not initialized')
  },

  notifyPackagesReady(warehouse: Warehouse, orderId: OrderId, packages: PackageId[]): void {
    if (!this.initialized) throw new Error('WarehouseSystem not initialized')
  }
}

export const CustomerNotifications = {
  initialized: false,

  init(config: { test: boolean }) {
    this.initialized = true
  },

  notifyItemShipping(customerId: UserId, itemId: ItemId, shippingCost: ShippingCost): void {
    if (!this.initialized) throw new Error('CustomerNotifications not initialized')
  }
}

export const DB = {
  initialized: false,

  init(config: { test: boolean }) {
    this.initialized = true
  },

  getItemById(id: ItemId): Item {
    if (!this.initialized) throw new Error('DB not initialized')
    throw new Error('Not implemented')
  },

  getOrderPackages(orderId: OrderId): { packageId: PackageId, warehouse: Warehouse, itemIds: ItemId[] }[] {
    if (!this.initialized) throw new Error('DB not initialized')
    return []
  },

  getOrderCustomer(orderId: UserId): UserId {
    if (!this.initialized) throw new Error('DB not initialized')
    throw new Error('Not implemented')
  }
}

export const OrderFetcher = {
  itemCache: new Map<ItemId, Item>(),
  initialized: false,

  init(config: { test: boolean }) {
    this.initialized = true
  },

  fetch(orderId: OrderId): Order {
    if (!this.initialized) throw new Error('OrderFetcher not initialized')
    const packageData = DB.getOrderPackages(orderId)

    const packages: Package[] = []

    for (const pkgData of packageData) {
      const items: Item[] = []

      for (const itemId of pkgData.itemIds) {
        let item: Item

        if (this.itemCache.has(itemId)) {
          item = this.itemCache.get(itemId)!
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
      packages
    }
  }
}

export const ShippingHandler = {
  initialized: false,

  init(config: { test: boolean }) {
    this.initialized = true
  },

  dispatch(directives: ShippingDirective[]): void {
    if (!this.initialized) throw new Error('ShippingHandler not initialized')
  }
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
      const shippingCost = calculateShippingCost(item.weight, item.price)

      CustomerNotifications.notifyItemShipping(user.id, item.id, shippingCost)

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
