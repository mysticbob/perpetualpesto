import { Hono } from 'hono'
import { instacartAuth } from '../services/instacart/authManager'
import { cartManager } from '../services/instacart/cartManager'
import { productMatcher } from '../services/instacart/productMatcher'

const app = new Hono()

/**
 * Get Instacart auth status for user
 */
app.get('/auth/status', async (c) => {
  try {
    const userId = c.req.query('userId')
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }

    const status = await instacartAuth.getAuthStatus(userId)
    return c.json(status)
  } catch (error) {
    console.error('Error getting auth status:', error)
    return c.json({ error: 'Failed to get auth status' }, 500)
  }
})

/**
 * Start OAuth flow to connect Instacart account
 */
app.get('/auth/connect', async (c) => {
  try {
    const userId = c.req.query('userId')
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }

    const authUrl = instacartAuth.getAuthorizationUrl(userId)
    return c.json({ authUrl })
  } catch (error) {
    console.error('Error starting auth flow:', error)
    return c.json({ error: 'Failed to start authentication' }, 500)
  }
})

/**
 * OAuth callback handler
 */
app.get('/auth/callback', async (c) => {
  try {
    const code = c.req.query('code')
    const state = c.req.query('state')
    const error = c.req.query('error')
    
    if (error) {
      // Redirect to app with error
      return c.redirect(`/settings?instacart_error=${error}`)
    }
    
    if (!code || !state) {
      return c.redirect('/settings?instacart_error=missing_params')
    }

    // Validate state
    const stateData = instacartAuth.validateState(state)
    if (!stateData) {
      return c.redirect('/settings?instacart_error=invalid_state')
    }

    // Exchange code for tokens
    await instacartAuth.exchangeCodeForToken(code, stateData.userId)
    
    // Redirect back to app with success
    return c.redirect('/settings?instacart_connected=true')
  } catch (error) {
    console.error('OAuth callback error:', error)
    return c.redirect('/settings?instacart_error=auth_failed')
  }
})

/**
 * Disconnect Instacart account
 */
app.post('/auth/disconnect', async (c) => {
  try {
    const { userId } = await c.req.json()
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }

    await instacartAuth.disconnectAccount(userId)
    return c.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting account:', error)
    return c.json({ error: 'Failed to disconnect account' }, 500)
  }
})

/**
 * Match grocery items to Instacart products
 */
app.post('/products/match', async (c) => {
  try {
    const { items } = await c.req.json()
    
    if (!items || !Array.isArray(items)) {
      return c.json({ error: 'Items array is required' }, 400)
    }

    const matches = await productMatcher.matchGroceryItems(items)
    return c.json({ matches })
  } catch (error) {
    console.error('Error matching products:', error)
    return c.json({ error: 'Failed to match products' }, 500)
  }
})

/**
 * Create a new cart
 */
app.post('/cart/create', async (c) => {
  try {
    const { userId, items } = await c.req.json()
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }
    
    if (!items || !Array.isArray(items)) {
      return c.json({ error: 'Items array is required' }, 400)
    }

    const cartId = await cartManager.createCart(userId, items)
    const cart = await cartManager.getCart(cartId)
    
    return c.json({ cart })
  } catch (error: any) {
    console.error('Error creating cart:', error)
    
    if (error.message === 'Instacart account not connected') {
      return c.json({ error: 'Please connect your Instacart account first' }, 401)
    }
    
    return c.json({ error: 'Failed to create cart' }, 500)
  }
})

/**
 * Get cart details
 */
app.get('/cart/:cartId', async (c) => {
  try {
    const cartId = c.req.param('cartId')
    const cart = await cartManager.getCart(cartId)
    
    if (!cart) {
      return c.json({ error: 'Cart not found' }, 404)
    }
    
    return c.json({ cart })
  } catch (error) {
    console.error('Error getting cart:', error)
    return c.json({ error: 'Failed to get cart' }, 500)
  }
})

/**
 * Get user's carts
 */
app.get('/carts', async (c) => {
  try {
    const userId = c.req.query('userId')
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }

    const carts = await cartManager.getUserCarts(userId)
    return c.json({ carts })
  } catch (error) {
    console.error('Error getting user carts:', error)
    return c.json({ error: 'Failed to get carts' }, 500)
  }
})

/**
 * Update cart item quantity
 */
app.put('/cart/:cartId/item/:itemId', async (c) => {
  try {
    const cartId = c.req.param('cartId')
    const itemId = c.req.param('itemId')
    const { quantity } = await c.req.json()
    
    if (typeof quantity !== 'number' || quantity < 0) {
      return c.json({ error: 'Valid quantity is required' }, 400)
    }

    await cartManager.updateItemQuantity(cartId, itemId, quantity)
    const cart = await cartManager.getCart(cartId)
    
    return c.json({ cart })
  } catch (error) {
    console.error('Error updating item:', error)
    return c.json({ error: 'Failed to update item' }, 500)
  }
})

/**
 * Remove item from cart
 */
app.delete('/cart/:cartId/item/:itemId', async (c) => {
  try {
    const cartId = c.req.param('cartId')
    const itemId = c.req.param('itemId')
    
    await cartManager.removeItemFromCart(cartId, itemId)
    const cart = await cartManager.getCart(cartId)
    
    return c.json({ cart })
  } catch (error) {
    console.error('Error removing item:', error)
    return c.json({ error: 'Failed to remove item' }, 500)
  }
})

/**
 * Submit cart for checkout
 */
app.post('/cart/:cartId/submit', async (c) => {
  try {
    const cartId = c.req.param('cartId')
    const result = await cartManager.submitCart(cartId)
    
    return c.json(result)
  } catch (error) {
    console.error('Error submitting cart:', error)
    return c.json({ error: 'Failed to submit cart' }, 500)
  }
})

/**
 * Get cart items with product details
 */
app.get('/cart/:cartId/items', async (c) => {
  try {
    const cartId = c.req.param('cartId')
    const items = await cartManager.getCartItemsWithDetails(cartId)
    
    return c.json({ items })
  } catch (error) {
    console.error('Error getting cart items:', error)
    return c.json({ error: 'Failed to get cart items' }, 500)
  }
})

/**
 * Abandon a cart
 */
app.post('/cart/:cartId/abandon', async (c) => {
  try {
    const cartId = c.req.param('cartId')
    await cartManager.abandonCart(cartId)
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Error abandoning cart:', error)
    return c.json({ error: 'Failed to abandon cart' }, 500)
  }
})

export default app