import { UserId, OrderId, PackageId, ItemId, Warehouse, Label, ItemName, Price, Weight, MembershipLevel, ShippingCost, ConsolidationDiscount } from './types'
import { getConsolidationDiscount, calculateShippingCost } from './utils'

export type User = {
  id: UserId
  membershipLevel: MembershipLevel
}

export type Item = {
  id: ItemId
  name: ItemName
  price: Price
  weight: Weight
  labels: Label[]
}

export type Package = {
  id: PackageId
  warehouse: Warehouse
  items: Item[]
}

export type Order = {
  id: OrderId
  packages: Package[]
}

export type ShippingDirective = {
  order: Order
  package: Package
  itemId: ItemId
  shippingCost: ShippingCost
  labels: Label[]
  consolidationDiscount: ConsolidationDiscount
}

export const WarehouseSystem = {
  init(config: { test: boolean }) { },

  notifyPackageReady(warehouse: Warehouse, orderId: OrderId, packageId: PackageId): void { },
  notifyPackagesReady(warehouse: Warehouse, orderId: OrderId, packages: PackageId[]): void { }
}

export const CustomerNotifications = {
  init(config: { test: boolean }) { },

  notifyItemShipping(customerId: UserId, itemId: ItemId, shippingCost: ShippingCost): void { }
}

export const DB = {
  init(config: { test: boolean }) { },

  getItemById(id: ItemId): Item { throw new Error('Not implemented') },

  getOrderPackages(orderId: OrderId): { packageId: PackageId, warehouse: Warehouse, itemIds: ItemId[] }[] {
    return []
  },

  getOrderCustomer(orderId: OrderId): UserId {
    throw new Error('Not implemented')
  }
}

export const OrderFetcher = {
  itemCache: new Map<ItemId, Item>(),

  init(config: { test: boolean }) { },

  fetch(orderId: OrderId): Order {
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

  if (user.membershipLevel === MembershipLevel.premium) {
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
      const shippingCost = calculateShippingCost(item.weight, item.price)

      CustomerNotifications.notifyItemShipping(user.id, item.id, shippingCost)

      directives.push({
        order,
        package: pkg,
        itemId: item.id,
        labels: item.labels,
        shippingCost,
        consolidationDiscount: ConsolidationDiscount.zero
      })
    }
  }

  for (const directive of directives) {
    const warehouseItemCount = warehouseCounts.get(directive.package.warehouse)!
    directive.consolidationDiscount = getConsolidationDiscount(warehouseItemCount)
  }

  ShippingHandler.dispatch(directives)
}
