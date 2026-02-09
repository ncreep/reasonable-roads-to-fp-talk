import { UserId, ProductId, CampaignId } from './ids'

export type User = {
  readonly id: UserId
  readonly membershipLevel: "regular" | "premium"
}

export type Discount = {
  readonly code: string
  readonly percent: number
  readonly campaignId: CampaignId
}

export type Product = {
  readonly id: ProductId
  readonly basePrice: number
  readonly discounts: readonly Discount[]
}

export type AppliedDiscount = {
  readonly discount: Discount
  readonly amount: number
}

export type FinalPrice = {
  readonly product: Product
  readonly price: number
}

type ProductWith<T> = {
  readonly product: Product
  readonly value: T
}

export type DiscountedTotal = {
  readonly appliedDiscounts: ReadonlyMap<CampaignId, number>
  readonly finalPrices: ReadonlyMap<Product, number>
  readonly total: number
}

export type LoyaltyProgram = {
  addPoints(userId: UserId, amount: number): void
}

export type MarketingBudget = {
  allocate(campaignId: CampaignId, amount: number): void
}

export type Tax = {
  recordTransaction(userId: UserId, productId: ProductId, amount: number): void
}

export type DB = {
  getProductsByIds(ids: ProductId[]): Product[]
  getUserCart(userId: UserId): ProductId[]
}

export type CartFetcher = {
  fetch(user: User): Product[]
}

export type Billing = {
  bill(user: User, total: number): void
}

export const premiumDiscount: Discount =
  { code: 'MEMBER20', percent: 20, campaignId: CampaignId('premium-member') }

export function getUserDiscounts(user: User): Discount[] {
  return (user.membershipLevel === 'premium') ?
    [premiumDiscount] :
    []
}

export class CheckoutService {
  constructor(
    private readonly cartFetcher: CartFetcher,
    private readonly loyaltyProgram: LoyaltyProgram,
    private readonly marketingBudget: MarketingBudget,
    private readonly tax: Tax,
    private readonly billing: Billing
  ) { }

  processCheckout(user: User): void {
    const products = this.cartFetcher.fetch(user)

    const userDiscounts = getUserDiscounts(user)

    const discountedTotal = calcTotal(products, userDiscounts)

    discountedTotal.appliedDiscounts.forEach((amount, campaignId) =>
      this.marketingBudget.allocate(campaignId, amount)
    )

    discountedTotal.finalPrices.forEach((finalPrice, product) => {
      this.loyaltyProgram.addPoints(user.id, product.basePrice)
      this.tax.recordTransaction(user.id, product.id, finalPrice)
    })

    this.billing.bill(user, discountedTotal.total)
  }
}

import _ from 'lodash'

type ProductWithDiscounts = {
  product: Product
  allDiscounts: Discount[]
}

type DiscountApplication = {
  campaignId: CampaignId
  amount: number
}

const enrichWithUserDiscounts = (userDiscounts: Discount[]) => (product: Product): ProductWithDiscounts => ({
  product,
  allDiscounts: [...userDiscounts, ...product.discounts]
})

const calculateDiscountAmount = (basePrice: number) => (discount: Discount): DiscountApplication => ({
  campaignId: discount.campaignId,
  amount: basePrice * (discount.percent / 100)
})

const toDiscountApplications = ({ product, allDiscounts }: ProductWithDiscounts): DiscountApplication[] =>
  _.map(allDiscounts, calculateDiscountAmount(product.basePrice))

const sumApplications = ([campaignId, applications]: [CampaignId, DiscountApplication[]]): [CampaignId, number] =>
  [campaignId, _.sumBy(applications, 'amount')]

const calculateFinalPrice = ({ product, allDiscounts }: ProductWithDiscounts): [Product, number] => {
  const totalDiscount = _.sumBy(allDiscounts, d => d.percent / 100) * product.basePrice
  return [product, product.basePrice - totalDiscount]
}

export function calcTotal(products: Product[], userDiscounts: Discount[]): DiscountedTotal {
  const productsWithDiscounts = _.map(products, enrichWithUserDiscounts(userDiscounts))

  const discountApplications = _.flatMap(productsWithDiscounts, toDiscountApplications)

  const appliedDiscountsMap = new Map(
    Array.from(
      Map.groupBy(discountApplications, app => app.campaignId),
      sumApplications
    )
  )

  const finalPricesMap = new Map(
    _.map(productsWithDiscounts, calculateFinalPrice)
  )

  const total = _.sum([...finalPricesMap.values()])

  return {
    appliedDiscounts: appliedDiscountsMap,
    finalPrices: finalPricesMap,
    total
  }
}

// TODO do not touch
// import _ from 'lodash'
//
// const applyDiscounts = (withDiscounts: ProductWith<Discount[]>): ProductWith<AppliedDiscount>[] => {
//   return _.map(withDiscounts.value, applyDiscount(withDiscounts.product))
// }
//
// const applyDiscount = (product: Product) => (discount: Discount): ProductWith<AppliedDiscount> => {
//   const amount = product.basePrice * (discount.percent / 100)
//
//   return {
//     product,
//     value: {
//       amount,
//       discount
//     }
//   }
// }
//
// const mapWithProduct = <T, U>(p: ProductWith<T>, f: (value: T) => U): ProductWith<U> =>
// ({
//   product: p.product,
//   value: f(p.value)
// })
//
// const withUserDiscounts = (userDiscounts: Discount[]) => (product: Product): ProductWith<Discount[]> => ({
//   product,
//   value: [...userDiscounts, ...product.discounts]
// })
//
// function toFinalPrice(value: ProductWith<AppliedDiscount>): ProductWith {
//
// }
//
// const getValue = <T>(p: ProductWith<T>) => p.value
//
// export function calcTotal2(products: Product[], userDiscounts: Discount[]): DiscountedTotal {
//   const a = _.map(products, withUserDiscounts(userDiscounts))
//   const b = _.flatMap(a, applyDiscounts)
//   const c = _.flatMap(b, getValue)
//   const d = _.flatMap(b, toFinalPrice)
//
//   const appliedDiscounts: AppliedDiscount[] = []
//   const finalPrices: FinalPrice[] = []
//
//   let total = 0
//
//   for (const p of products) {
//     const allDiscounts = [...userDiscounts, ...p.discounts]
//
//     let totalDiscount = 0
//
//     for (const d of allDiscounts) {
//       const discountAmount = p.basePrice * (d.percent / 100)
//
//       appliedDiscounts.push({
//         discount: d,
//         amount: discountAmount
//       })
//
//       totalDiscount += discountAmount
//     }
//
//     const discountedPrice = p.basePrice - totalDiscount
//
//     finalPrices.push({
//       product: p,
//       price: discountedPrice
//     })
//
//     total += discountedPrice
//   }
//
//   return {
//     appliedDiscounts,
//     finalPrices,
//     total
//   }
// }
//
