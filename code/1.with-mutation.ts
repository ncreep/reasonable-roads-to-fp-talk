import { UserId, OrderId, PackageId, ItemId, Warehouse, Label } from './types'
import { getConsolidationDiscount, calculateShippingCost } from './utils'

export type User = {
  id: UserId
  membershipLevel: string
}

export type Item = {
  id: ItemId
  name: string
  price: number
  weight: number
  labels: Label[]
}

export type Package = {
  id: PackageId
  warehouse: Warehouse
  items: Item[]
}

export type Order = {
  id: OrderId
  customerId: UserId
  packages: Package[]
}

export type ShippingDirective = {
  order: Order
  package: Package
  itemId: ItemId
  shippingCost: number
  labels: Label[]
  consolidationDiscount: number
}

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

  getOrderCustomer(orderId: OrderId): UserId {
    return UserId('')
  }
}

export const OrderFetcher = {
  itemCache: new Map<ItemId, Item>(),

  init(config: { test: boolean }) { },

  fetch(orderId: OrderId): Order {
    const customerId = DB.getOrderCustomer(orderId)
    const packageData = DB.getOrderPackages(orderId)

    const packages: Package[] = packageData.map(pkgData => {
      let items: Item[] = []

      for (const itemId of pkgData.itemIds) {
        if (this.itemCache.has(itemId)) {
          items.push(this.itemCache.get(itemId)!)
        } else {
          const item = DB.getItemById(itemId)
          this.itemCache.set(item.id, item)
          items.push(item)
        }
      }

      return {
        id: pkgData.packageId,
        warehouse: pkgData.warehouse,
        items
      }
    })

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

  if (user.membershipLevel === 'premium') {
    for (const pkg of order.packages) {
      for (const item of pkg.items) {
        item.labels.push(Label.PRIORITY)
        item.labels.push(Label.VIP_CUSTOMER)
      }
    }
  }

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
        labels: item.labels,
        shippingCost,
        consolidationDiscount: 0
      })
    }
  }

  for (const directive of directives) {
    const warehouseItemCount = warehouseCounts.get(directive.package.warehouse)!
    directive.consolidationDiscount = getConsolidationDiscount(warehouseItemCount)
  }

  ShippingHandler.dispatch(directives)
}
