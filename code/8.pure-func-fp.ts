import { OrderId, Warehouse, User, Item, Package, Order, ShippingDirective, WarehouseSystem, CustomerNotifications, OrderFetcher, ShippingHandler } from './types'
import { getConsolidationDiscount, calculateShippingCost, withPremiumLabels } from './utils'
import _ from 'lodash'

export type ItemInfo = {
  readonly order: Order
  readonly package: Package
  readonly item: Item
  readonly labels: readonly string[]
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
