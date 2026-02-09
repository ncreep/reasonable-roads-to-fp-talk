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

    let total = this.calcTotal(products, user, userDiscounts)

    this.billing.bill(user, total)
  }

  private calcTotal(products: Product[], user: User, userDiscounts: Discount[]): number {
    let total = 0

    for (const p of products) {
      this.loyaltyProgram.addPoints(user.id, p.basePrice)

      const allDiscounts = [...userDiscounts, ...p.discounts]

      let totalDiscount = 0

      for (const d of allDiscounts) {
        const discountAmount = p.basePrice * (d.percent / 100)
        this.marketingBudget.allocate(d.campaignId, discountAmount)

        totalDiscount += discountAmount
      }

      const discountedPrice = p.basePrice - totalDiscount
      this.tax.recordTransaction(user.id, p.id, discountedPrice)

      total += discountedPrice
    }

    return total
  }
}
