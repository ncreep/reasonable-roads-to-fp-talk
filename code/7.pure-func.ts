import { UserId, ProductId, CampaignId } from './ids'

export type User = {
  readonly id: UserId
  readonly membershipLevel: string
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

export type DiscountedTotal = {
  readonly appliedDiscounts: readonly AppliedDiscount[]
  readonly finalPrices: readonly FinalPrice[]
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

    discountedTotal.appliedDiscounts.forEach(ad =>
      this.marketingBudget.allocate(ad.discount.campaignId, ad.amount)
    )

    discountedTotal.finalPrices.forEach(fp => {
      this.loyaltyProgram.addPoints(user.id, fp.product.basePrice)
      this.tax.recordTransaction(user.id, fp.product.id, fp.price)
    })

    this.billing.bill(user, discountedTotal.total)
  }
}

export function calcTotal(products: Product[], userDiscounts: Discount[]): DiscountedTotal {
  const appliedDiscounts: AppliedDiscount[] = []
  const finalPrices: FinalPrice[] = []

  let total = 0

  for (const p of products) {
    const allDiscounts = [...userDiscounts, ...p.discounts]

    let totalDiscount = 0

    for (const d of allDiscounts) {
      const discountAmount = p.basePrice * (d.percent / 100)

      appliedDiscounts.push({
        discount: d,
        amount: discountAmount
      })

      totalDiscount += discountAmount
    }

    const discountedPrice = p.basePrice - totalDiscount

    finalPrices.push({
      product: p,
      price: discountedPrice
    })

    total += discountedPrice
  }

  return {
    appliedDiscounts,
    finalPrices,
    total
  }
}
