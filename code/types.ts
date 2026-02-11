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

export type Label = { readonly value: string }

export function Label(value: string): Label {
  return { value }
}

export namespace Label {
  export const PRIORITY: Label = Label('PRIORITY')
  export const VIP_CUSTOMER: Label = Label('VIP_CUSTOMER')
}

export type ItemName = { readonly value: string }
export const ItemName = (value: string): ItemName => ({ value })

export type Price = { readonly value: number }
export const Price = (value: number): Price => ({ value })

export type Weight = { readonly value: number }
export const Weight = (value: number): Weight => ({ value })

export type ShippingCost = { readonly value: number }
export const ShippingCost = (value: number): ShippingCost => ({ value })

export type ConsolidationDiscount = { readonly value: number }

export function ConsolidationDiscount(value: number): ConsolidationDiscount {
  return { value }
}

export namespace ConsolidationDiscount {
  export const zero: ConsolidationDiscount = ConsolidationDiscount(0)
}

export enum MembershipLevel {
  regular = 'regular',
  premium = 'premium'
}

export type User = {
  readonly id: UserId
  readonly membershipLevel: MembershipLevel
}

export type Item = {
  readonly id: ItemId
  readonly name: ItemName
  readonly price: Price
  readonly weight: Weight
  readonly labels: readonly Label[]
}

export type Package = {
  readonly id: PackageId
  readonly warehouse: Warehouse
  readonly items: Item[]
}

export type Order = {
  readonly id: OrderId
  readonly packages: Package[]
}

export type ShippingDirective = {
  readonly order: Order
  readonly package: Package
  readonly itemId: ItemId
  readonly shippingCost: ShippingCost
  readonly labels: readonly Label[]
  readonly consolidationDiscount: ConsolidationDiscount
}

export interface WarehouseSystem {
  notifyPackageReady(warehouse: Warehouse, orderId: OrderId, packageId: PackageId): void
  notifyPackagesReady(warehouse: Warehouse, orderId: OrderId, packages: PackageId[]): void
}

export interface CustomerNotifications {
  notifyItemShipping(customerId: UserId, itemId: ItemId, shippingCost: ShippingCost): void
}

export interface OrderFetcher {
  fetch(orderId: OrderId): Order
}

export interface ShippingHandler {
  dispatch(directives: ShippingDirective[]): void
}
