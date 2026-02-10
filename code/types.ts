export type UserId = { readonly value: string }
export const UserId = (value: string): UserId => ({ value })

export type ProductId = { readonly value: string }
export const ProductId = (value: string): ProductId => ({ value })

export type CampaignId = { readonly value: string }
export const CampaignId = (value: string): CampaignId => ({ value })

export type OrderId = { readonly value: string }
export const OrderId = (value: string): OrderId => ({ value })

export type PackageId = { readonly value: string }
export const PackageId = (value: string): PackageId => ({ value })

export type ItemId = { readonly value: string }
export const ItemId = (value: string): ItemId => ({ value })

export type Warehouse = { readonly value: string }
export const Warehouse = (value: string): Warehouse => ({ value })

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

export type ShippingDirective = {
  readonly order: Order
  readonly package: Package
  readonly itemId: ItemId
  readonly shippingCost: number
  readonly labels: readonly string[]
  readonly consolidationDiscount: number
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
