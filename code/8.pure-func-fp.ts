import { UserId, OrderId, PackageId, ItemId } from './ids'
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

export type Warehouse = { readonly value: string }
export const Warehouse = (value: string): Warehouse => ({ value })

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
}

export type ItemInfoWithDiscount = ItemInfo & {
  consolidationDiscount: number
}

export type ShippingDirective = {
  readonly order: Order
  readonly package: Package
  readonly item: Item
  readonly shippingCost: number
  readonly consolidationDiscount: number
}

export type WarehouseSystem = {
  notifyPackageReady(warehouse: Warehouse, orderId: OrderId, packages: PackageId): void
  notifyPackagesReady(warehouse: Warehouse, orderId: OrderId, packages: PackageId[]): void
}

export type CustomerNotifications = {
  notifyItemShipping(customerId: UserId, itemId: ItemId, itemName: string): void
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

    this.performSideEffects(orderId, directives)

    this.shippingHandler.dispatch(directives)
  }

  private performSideEffects(orderId: OrderId, directives: ShippingDirective[]): void {
    _(directives)
      .forEach(directive => {
        this.customerNotifications.notifyItemShipping(
          directive.order.customerId,
          directive.item.id,
          directive.item.name
        )
      })
      .groupBy(d => d.package.warehouse.value)
      .forEach((warehouseDirectives, warehouse) => {
        const packageIds = _.uniq(warehouseDirectives.map(d => d.package.id))
        this.warehouseSystem.notifyPackagesReady(Warehouse(warehouse), orderId, packageIds)
      }).value()
  }
}

export function calculateShippingDirectives(order: Order, user: User): ShippingDirective[] {
  return _(order.packages)
    .flatMap(toItems(order))
    .map(addPremiumLabels(user))
    .groupBy(byWarehouse)
    .flatMap(addConsolidationDiscount)
    .map(toShippingDirective)
    .value()
}

const withLabels = (item: Item, ...newLabels: string[]): Item => ({
  ...item,
  labels: [...item.labels, ...newLabels]
})

const addPremiumLabels = (user: User) => (itemInfo: ItemInfo): ItemInfo => ({
  ...itemInfo,
  item: user.membershipLevel === 'premium'
    ? withLabels(itemInfo.item, 'PRIORITY', 'VIP_CUSTOMER')
    : itemInfo.item
})

const toItemInfo = (order: Order, pkg: Package) => (item: Item): ItemInfo => ({
  order,
  package: pkg,
  item
})

const addConsolidationDiscount = (warehouseItems: ItemInfo[]): ItemInfoWithDiscount[] => {
  const itemCount = warehouseItems.length
  const discountPercent = itemCount >= 10 ? 0.20
    : itemCount >= 5 ? 0.10
      : itemCount >= 3 ? 0.05
        : 0

  return warehouseItems.map(itemInfo => ({
    ...itemInfo,
    consolidationDiscount: itemInfo.item.price * discountPercent
  }))
}

const toShippingDirective = (itemInfo: ItemInfoWithDiscount): ShippingDirective => ({
  order: itemInfo.order,
  package: itemInfo.package,
  item: itemInfo.item,
  shippingCost: itemInfo.item.weight * 2.5 + (itemInfo.item.price > 100 ? 0 : 5),
  consolidationDiscount: itemInfo.consolidationDiscount
})

const toItems = (order: Order) => (pkg: Package): ItemInfo[] =>
  pkg.items.map(toItemInfo(order, pkg))

const byWarehouse =
  (itemInfo: ItemInfo) => itemInfo.package.warehouse
