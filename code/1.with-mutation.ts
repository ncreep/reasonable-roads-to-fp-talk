import { UserId, ProductId, CampaignId } from './ids'

export type User = {
  id: UserId
  membershipLevel: string
}

export type Discount = {
  code: string
  percent: number
  campaignId: CampaignId
}

export type Product = {
  id: ProductId
  basePrice: number
  discounts: Discount[]
}

export const LoyaltyProgram = {
  init(config: { test: boolean }) { },

  addPoints(userId: UserId, amount: number): void { }
}

export const MarketingBudget = {
  init(config: { test: boolean }) { },

  allocate(campaignId: CampaignId, amount: number): void { }
}

export const Tax = {
  init(config: { test: boolean }) { },

  recordTransaction(userId: UserId, productId: ProductId, amount: number): void { }
}

export const DB = {
  init(config: { test: boolean }) { },

  getProductsByIds(ids: ProductId[]): Product[] { return [] },

  getUserCart(userId: UserId): ProductId[] { return [] }
}

export const CartFetcher = {
  cache: new Map<UserId, Product[]>(),

  init(config: { test: boolean }) { },

  fetch(user: User): Product[] {
    if (this.cache.has(user.id)) {
      return this.cache.get(user.id)!
    }

    const productIds = DB.getUserCart(user.id)
    const products = DB.getProductsByIds(productIds)

    this.cache.set(user.id, products)
    return products
  }
}

export const Billing = {
  init(config: { test: boolean }) { },

  bill(user: User, total: number): void { }
}

export const premiumDiscount: Discount =
  { code: 'MEMBER20', percent: 20, campaignId: CampaignId('premium-member') }

export function processCheckout(user: User): void {
  const products = CartFetcher.fetch(user)

  if (user.membershipLevel === 'premium') {
    for (const p of products) {
      p.discounts.push(premiumDiscount)
    }
  }

  let total = 0

  for (const p of products) {
    LoyaltyProgram.addPoints(user.id, p.basePrice)

    let totalDiscount = 0

    for (const d of p.discounts) {
      const discountAmount = p.basePrice * (d.percent / 100)
      MarketingBudget.allocate(d.campaignId, discountAmount)

      totalDiscount += discountAmount
    }

    const discountedPrice = p.basePrice - totalDiscount
    Tax.recordTransaction(user.id, p.id, discountedPrice)

    total += discountedPrice
  }

  Billing.bill(user, total)
}
