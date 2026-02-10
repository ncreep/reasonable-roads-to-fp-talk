import { UserId, OrderId, PackageId, ItemId, Warehouse } from './types'
import { getConsolidationDiscount, calculateShippingCost, withPremiumLabels } from './utils'
import _ from 'lodash'

export type User = {
  readonly id: UserId
  readonly membershipLevel: "regular" | "premium"
}

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

export type ItemInfo = {
  readonly order: Order
  readonly package: Package
  readonly item: Item
  readonly labels: readonly string[]
}

export type ShippingDirective = {
  readonly order: Order
  readonly package: Package
  readonly itemId: ItemId
  readonly shippingCost: number
  readonly labels: readonly string[]
  readonly consolidationDiscount: number
}

export type WarehouseSystem = {
  notifyPackageReady(warehouse: Warehouse, orderId: OrderId, packages: PackageId): void
  notifyPackagesReady(warehouse: Warehouse, orderId: OrderId, packages: PackageId[]): void
}

export type CustomerNotifications = {
  notifyItemShipping(customerId: UserId, itemId: ItemId): void
}

export type ShippingHandler = {
  dispatch(directives: ShippingDirective[]): void
}

export type OrderFetcher = {
  fetch(orderId: OrderId): Order
}

export class OrderFulfillmentService {
  constructor(
    private readonly orderFetcher: OrderFetcher,
    private readonly warehouseSystem: WarehouseSystem,
    private readonly customerNotifications: CustomerNotifications,
    private readonly shippingHandler: ShippingHandler
  ) { }

  processShipping(orderId: OrderId, user: User): void {
    const order = this.orderFetcher.fetch(orderId)

    const directives = calculateShippingDirectives(order, user)

    this.fireNotifications(orderId, directives)

    this.shippingHandler.dispatch(directives)
  }

  private fireNotifications(orderId: OrderId, directives: ShippingDirective[]): void {
    _(directives)
      .forEach(this.notifyItemShipping)
      .groupBy(warehouse)
      .forEach(this.notifyPackagesReady(orderId))
      .value()
  }

  private notifyItemShipping = (directive: ShippingDirective) => {
    this.customerNotifications.notifyItemShipping(
      directive.order.customerId,
      directive.itemId
    )
  }

  private notifyPackagesReady = (orderId: OrderId) =>
    (warehouseDirectives: ShippingDirective[], warehouse: string) => {
      const packageIds = _.uniq(warehouseDirectives.map(d => d.package.id))
      this.warehouseSystem.notifyPackagesReady(Warehouse(warehouse), orderId, packageIds)
    }
}

export function calculateShippingDirectives(order: Order, user: User): ShippingDirective[] {
  return _(order.packages)
    .flatMap(toItems(order))
    .map(addPremiumLabels(user))
    .groupBy(warehouse)
    .flatMap(addConsolidationDiscount)
    .value()
}

const addPremiumLabels = (user: User) => (info: ItemInfo): ItemInfo => ({
  ...info,
  labels: withPremiumLabels(user, info.item.labels)
})

const toItemInfo = (order: Order, pkg: Package) => (item: Item): ItemInfo => ({
  order,
  package: pkg,
  item,
  labels: item.labels
})

const addConsolidationDiscount = (warehouseItems: ItemInfo[]): ShippingDirective[] => {
  const itemCount = warehouseItems.length
  const consolidationDiscount = getConsolidationDiscount(itemCount)

  return warehouseItems.map(info => ({
    order: info.order,
    package: info.package,
    itemId: info.item.id,
    labels: info.labels,
    shippingCost: calculateShippingCost(info.item.weight, info.item.price),
    consolidationDiscount
  }))
}

const toItems = (order: Order) => (pkg: Package): ItemInfo[] =>
  pkg.items.map(toItemInfo(order, pkg))

const warehouse =
  (withPackage: { package: Package }) => withPackage.package.warehouse
