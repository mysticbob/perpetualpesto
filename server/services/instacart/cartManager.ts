import { prisma as db } from '../../lib/db'
import { InstacartProduct, productMatcher } from './productMatcher'
import { instacartAuth } from './authManager'
import { GroceryItem } from '../../../src/contexts/GroceryContext'

export interface CartItem {
  groceryItemId: string
  productId: string
  quantity: number
  price?: number
}

export interface Cart {
  id: string
  userId: string
  status: string
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  serviceFee: number
  tax: number
  total: number
}

export class CartManager {
  /**
   * Create a new cart for a user
   */
  async createCart(userId: string, groceryItems: GroceryItem[]): Promise<string> {
    // Check if user has auth
    const authStatus = await instacartAuth.getAuthStatus(userId)
    if (!authStatus.isConnected) {
      throw new Error('Instacart account not connected')
    }

    // Get auth record
    const auth = await db.instacartAuth.findUnique({
      where: { userId }
    })
    
    if (!auth) {
      throw new Error('Authentication record not found')
    }

    // Create cart in database
    const cart = await db.instacartCart.create({
      data: {
        userId,
        instacartAuthId: auth.id,
        status: 'draft',
        itemCount: groceryItems.length
      }
    })

    // Match products and add to cart
    const matches = await productMatcher.matchGroceryItems(groceryItems)
    
    for (const match of matches) {
      if (match.matchedProduct) {
        await this.addItemToCart(cart.id, {
          groceryItemId: match.groceryItem.id,
          productId: match.matchedProduct.id,
          name: match.matchedProduct.name,
          quantity: this.parseQuantity(match.groceryItem.amount || '1'),
          price: match.matchedProduct.price
        })
      }
    }

    return cart.id
  }

  /**
   * Add item to cart
   */
  async addItemToCart(
    cartId: string,
    item: {
      groceryItemId: string
      productId: string
      name: string
      quantity: number
      price?: number
    }
  ): Promise<void> {
    const totalPrice = item.price ? item.price * item.quantity : null

    await db.instacartCartItem.create({
      data: {
        cartId,
        groceryItemId: item.groceryItemId,
        instacartProductId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price || null,
        totalPrice
      }
    })

    // Update cart totals
    await this.updateCartTotals(cartId)
  }

  /**
   * Update item quantity in cart
   */
  async updateItemQuantity(
    cartId: string,
    itemId: string,
    quantity: number
  ): Promise<void> {
    const item = await db.instacartCartItem.findFirst({
      where: { cartId, id: itemId }
    })

    if (!item) {
      throw new Error('Item not found in cart')
    }

    const totalPrice = item.price ? item.price * quantity : null

    await db.instacartCartItem.update({
      where: { id: itemId },
      data: {
        quantity,
        totalPrice
      }
    })

    await this.updateCartTotals(cartId)
  }

  /**
   * Remove item from cart
   */
  async removeItemFromCart(cartId: string, itemId: string): Promise<void> {
    await db.instacartCartItem.delete({
      where: { id: itemId }
    })

    await this.updateCartTotals(cartId)
  }

  /**
   * Update cart totals
   */
  private async updateCartTotals(cartId: string): Promise<void> {
    const items = await db.instacartCartItem.findMany({
      where: { cartId }
    })

    const subtotal = items.reduce((sum, item) => {
      return sum + (item.totalPrice || 0)
    }, 0)

    // Calculate fees (mock values for Phase 1)
    const deliveryFee = subtotal > 3500 ? 0 : 399 // Free delivery over $35
    const serviceFee = Math.round(subtotal * 0.05) // 5% service fee
    const tax = Math.round(subtotal * 0.0875) // 8.75% tax (example)
    const total = subtotal + deliveryFee + serviceFee + tax

    await db.instacartCart.update({
      where: { id: cartId },
      data: {
        itemCount: items.length,
        subtotal,
        deliveryFee,
        serviceFee,
        tax,
        total
      }
    })
  }

  /**
   * Get cart details
   */
  async getCart(cartId: string): Promise<Cart | null> {
    const cart = await db.instacartCart.findUnique({
      where: { id: cartId },
      include: {
        items: true
      }
    })

    if (!cart) {
      return null
    }

    return {
      id: cart.id,
      userId: cart.userId,
      status: cart.status,
      items: cart.items.map(item => ({
        groceryItemId: item.groceryItemId || '',
        productId: item.instacartProductId || '',
        quantity: item.quantity,
        price: item.price || undefined
      })),
      subtotal: cart.subtotal || 0,
      deliveryFee: cart.deliveryFee || 0,
      serviceFee: cart.serviceFee || 0,
      tax: cart.tax || 0,
      total: cart.total || 0
    }
  }

  /**
   * Get user's active carts
   */
  async getUserCarts(userId: string): Promise<Cart[]> {
    const carts = await db.instacartCart.findMany({
      where: {
        userId,
        status: { in: ['draft', 'active'] }
      },
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return carts.map(cart => ({
      id: cart.id,
      userId: cart.userId,
      status: cart.status,
      items: cart.items.map(item => ({
        groceryItemId: item.groceryItemId || '',
        productId: item.instacartProductId || '',
        quantity: item.quantity,
        price: item.price || undefined
      })),
      subtotal: cart.subtotal || 0,
      deliveryFee: cart.deliveryFee || 0,
      serviceFee: cart.serviceFee || 0,
      tax: cart.tax || 0,
      total: cart.total || 0
    }))
  }

  /**
   * Submit cart for checkout
   */
  async submitCart(cartId: string): Promise<{ success: boolean; orderId?: string; checkoutUrl?: string }> {
    const cart = await db.instacartCart.findUnique({
      where: { id: cartId },
      include: { items: true }
    })

    if (!cart) {
      throw new Error('Cart not found')
    }

    // Phase 1: Generate Instacart URL with pre-filled cart
    // Phase 2: Use actual API to submit order
    
    const checkoutUrl = await this.generateInstacartCheckoutUrl(cart)
    
    // Update cart status
    await db.instacartCart.update({
      where: { id: cartId },
      data: { status: 'submitted' }
    })

    // Create order record
    const order = await db.instacartOrder.create({
      data: {
        userId: cart.userId,
        instacartAuthId: cart.instacartAuthId,
        cartId: cart.id,
        status: 'pending',
        total: cart.total
      }
    })

    return {
      success: true,
      orderId: order.id,
      checkoutUrl
    }
  }

  /**
   * Generate Instacart checkout URL
   * Phase 1: Create a deep link to Instacart with items
   */
  private async generateInstacartCheckoutUrl(cart: any): Promise<string> {
    const items = cart.items.map((item: any) => ({
      name: item.name,
      quantity: item.quantity
    }))
    
    // Create search query from items
    const searchQuery = items
      .map((item: any) => `${item.quantity}x ${item.name}`)
      .join(', ')
    
    // Generate Instacart URL
    const baseUrl = 'https://www.instacart.com/store/checkout'
    const params = new URLSearchParams({
      items: searchQuery,
      source: 'nochickenleftbehind'
    })
    
    return `${baseUrl}?${params.toString()}`
  }

  /**
   * Parse quantity from string
   */
  private parseQuantity(amount: string): number {
    const match = amount.match(/^(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 1
  }

  /**
   * Abandon a cart
   */
  async abandonCart(cartId: string): Promise<void> {
    await db.instacartCart.update({
      where: { id: cartId },
      data: { status: 'abandoned' }
    })
  }

  /**
   * Get cart items with product details
   */
  async getCartItemsWithDetails(cartId: string): Promise<Array<{
    id: string
    groceryItemId: string
    product: InstacartProduct | null
    quantity: number
    totalPrice: number
  }>> {
    const items = await db.instacartCartItem.findMany({
      where: { cartId }
    })

    const itemsWithDetails = await Promise.all(
      items.map(async (item) => {
        const product = item.instacartProductId
          ? await productMatcher.getProductDetails(item.instacartProductId)
          : null

        return {
          id: item.id,
          groceryItemId: item.groceryItemId || '',
          product,
          quantity: item.quantity,
          totalPrice: item.totalPrice || 0
        }
      })
    )

    return itemsWithDetails
  }
}

export const cartManager = new CartManager()