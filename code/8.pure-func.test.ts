import { describe, expect, it } from 'vitest'
import {
  calculateShippingDirectives
} from './7.pure-func'
import { MembershipLevel, Order, OrderId, ShippingDirective, UserId } from './types'

describe('calculateShippingDirectives', () => {
  it('should calculate shipping directives', () => {

    const order: Order = {
      id: OrderId("abc"),
      packages: []
    }
    const user = {
      id: UserId("def"),
      membershipLevel: MembershipLevel.premium
    }

    const expected: ShippingDirective[] = []

    const result = calculateShippingDirectives(order, user)

    expect(result).toEqual(expected)
  })
})
