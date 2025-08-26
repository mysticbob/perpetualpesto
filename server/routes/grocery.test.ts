import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import groceryApp from './grocery'

// Mock the database
vi.mock('../lib/db', () => ({
  prisma: {
    groceryItem: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn()
  }
}))

const mockDb = await import('../lib/db')

describe('Grocery API Routes', () => {
  const mockUserId = 'user123'
  const mockGroceryItems = [
    {
      id: 'item1',
      userId: mockUserId,
      name: 'Milk',
      amount: '1',
      unit: 'gallon',
      category: 'dairy',
      completed: false,
      addedDate: new Date('2024-01-01T10:00:00Z')
    },
    {
      id: 'item2',
      userId: mockUserId,
      name: 'Bread',
      amount: '2',
      unit: 'loaves',
      category: 'bakery',
      completed: true,
      addedDate: new Date('2024-01-01T11:00:00Z')
    },
    {
      id: 'item3',
      userId: mockUserId,
      name: 'Apples',
      amount: '3',
      unit: 'lbs',
      category: 'produce',
      completed: false,
      addedDate: new Date('2024-01-01T12:00:00Z')
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET / - Get user grocery items', () => {
    it('should return user grocery items successfully', async () => {
      mockDb.prisma.groceryItem.findMany.mockResolvedValue(mockGroceryItems)

      const response = await groceryApp.request(
        new Request('http://localhost/?userId=' + mockUserId, {
          method: 'GET'
        })
      )

      expect(response.status).toBe(200)
      const result = await response.json()
      
      expect(result.items).toHaveLength(3)
      expect(result.items[0]).toEqual({
        id: 'item1',
        name: 'Milk',
        amount: '1',
        unit: 'gallon',
        category: 'dairy',
        completed: false,
        addedDate: '2024-01-01T10:00:00.000Z'
      })
      
      expect(mockDb.prisma.groceryItem.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { addedDate: 'desc' }
      })
    })

    it('should return error when userId is missing', async () => {
      const response = await groceryApp.request(
        new Request('http://localhost/', {
          method: 'GET'
        })
      )

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBe('User ID is required')
      expect(mockDb.prisma.groceryItem.findMany).not.toHaveBeenCalled()
    })

    it('should return empty array when user has no items', async () => {
      mockDb.prisma.groceryItem.findMany.mockResolvedValue([])

      const response = await groceryApp.request(
        new Request('http://localhost/?userId=' + mockUserId, {
          method: 'GET'
        })
      )

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.items).toEqual([])
    })

    it('should handle database errors gracefully', async () => {
      mockDb.prisma.groceryItem.findMany.mockRejectedValue(new Error('Database connection failed'))

      const response = await groceryApp.request(
        new Request('http://localhost/?userId=' + mockUserId, {
          method: 'GET'
        })
      )

      expect(response.status).toBe(500)
      const result = await response.json()
      expect(result.error).toBe('Failed to fetch grocery data')
    })

    it('should order items by addedDate descending', async () => {
      mockDb.prisma.groceryItem.findMany.mockResolvedValue(mockGroceryItems)

      await groceryApp.request(
        new Request('http://localhost/?userId=' + mockUserId, {
          method: 'GET'
        })
      )

      expect(mockDb.prisma.groceryItem.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { addedDate: 'desc' }
      })
    })

    it('should properly transform date objects to ISO strings', async () => {
      const itemWithDate = {
        ...mockGroceryItems[0],
        addedDate: new Date('2024-01-15T14:30:00.123Z')
      }
      mockDb.prisma.groceryItem.findMany.mockResolvedValue([itemWithDate])

      const response = await groceryApp.request(
        new Request('http://localhost/?userId=' + mockUserId, {
          method: 'GET'
        })
      )

      const result = await response.json()
      expect(result.items[0].addedDate).toBe('2024-01-15T14:30:00.123Z')
    })
  })

  describe('POST / - Save user grocery items', () => {
    const mockItemsToSave = [
      {
        id: 'new1',
        name: 'Tomatoes',
        amount: '2',
        unit: 'lbs',
        category: 'produce',
        completed: false,
        addedDate: '2024-01-02T10:00:00Z'
      },
      {
        id: 'new2',
        name: 'Chicken breast',
        amount: '1',
        unit: 'lb',
        category: 'meat',
        completed: false,
        addedDate: '2024-01-02T11:00:00Z'
      }
    ]

    it('should save grocery items successfully', async () => {
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const txMock = {
          groceryItem: {
            deleteMany: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({})
          }
        }
        await callback(txMock)
        return {}
      })
      
      mockDb.prisma.$transaction.mockImplementation(mockTransaction)

      const response = await groceryApp.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: mockUserId,
            items: mockItemsToSave
          })
        })
      )

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.success).toBe(true)
      
      expect(mockDb.prisma.$transaction).toHaveBeenCalled()
      
      // Verify the transaction callback was called with proper operations
      const transactionCallback = mockDb.prisma.$transaction.mock.calls[0][0]
      const mockTx = {
        groceryItem: {
          deleteMany: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({})
        }
      }
      
      await transactionCallback(mockTx)
      
      expect(mockTx.groceryItem.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId }
      })
      expect(mockTx.groceryItem.create).toHaveBeenCalledTimes(2)
    })

    it('should return error when userId is missing', async () => {
      const response = await groceryApp.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: mockItemsToSave
          })
        })
      )

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBe('User ID is required')
      expect(mockDb.prisma.$transaction).not.toHaveBeenCalled()
    })

    it('should handle empty items array', async () => {
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const txMock = {
          groceryItem: {
            deleteMany: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({})
          }
        }
        await callback(txMock)
        return {}
      })
      
      mockDb.prisma.$transaction.mockImplementation(mockTransaction)

      const response = await groceryApp.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: mockUserId,
            items: []
          })
        })
      )

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.success).toBe(true)
    })

    it('should properly convert date strings to Date objects', async () => {
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const txMock = {
          groceryItem: {
            deleteMany: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({})
          }
        }
        await callback(txMock)
        return {}
      })
      
      mockDb.prisma.$transaction.mockImplementation(mockTransaction)

      await groceryApp.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: mockUserId,
            items: mockItemsToSave
          })
        })
      )

      const transactionCallback = mockDb.prisma.$transaction.mock.calls[0][0]
      const mockTx = {
        groceryItem: {
          deleteMany: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({})
        }
      }
      
      await transactionCallback(mockTx)

      // Verify that dates are converted to Date objects
      expect(mockTx.groceryItem.create).toHaveBeenCalledWith({
        data: {
          id: 'new1',
          userId: mockUserId,
          name: 'Tomatoes',
          amount: '2',
          unit: 'lbs',
          category: 'produce',
          completed: false,
          addedDate: new Date('2024-01-02T10:00:00Z')
        }
      })
    })

    it('should handle transaction failures gracefully', async () => {
      mockDb.prisma.$transaction.mockRejectedValue(new Error('Transaction failed'))

      const response = await groceryApp.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: mockUserId,
            items: mockItemsToSave
          })
        })
      )

      expect(response.status).toBe(500)
      const result = await response.json()
      expect(result.error).toBe('Failed to save grocery data')
    })

    it('should handle malformed JSON gracefully', async () => {
      const response = await groceryApp.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{ invalid json'
        })
      )

      expect(response.status).toBe(500)
      const result = await response.json()
      expect(result.error).toBe('Failed to save grocery data')
    })

    it('should replace all existing items for user (delete then create)', async () => {
      let deleteCallCount = 0
      let createCallCount = 0

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const txMock = {
          groceryItem: {
            deleteMany: vi.fn().mockImplementation(() => {
              deleteCallCount++
              return Promise.resolve({})
            }),
            create: vi.fn().mockImplementation(() => {
              createCallCount++
              return Promise.resolve({})
            })
          }
        }
        await callback(txMock)
        return {}
      })
      
      mockDb.prisma.$transaction.mockImplementation(mockTransaction)

      await groceryApp.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: mockUserId,
            items: mockItemsToSave
          })
        })
      )

      expect(deleteCallCount).toBe(1)
      expect(createCallCount).toBe(2) // One for each item
    })
  })

  describe('Data transformation and validation', () => {
    it('should handle various date formats in input', async () => {
      const itemsWithDifferentDates = [
        {
          id: 'date1',
          name: 'Item 1',
          amount: '1',
          unit: 'piece',
          category: 'other',
          completed: false,
          addedDate: '2024-01-01T10:00:00.000Z'
        },
        {
          id: 'date2',
          name: 'Item 2',
          amount: '1',
          unit: 'piece',
          category: 'other',
          completed: false,
          addedDate: '2024-01-01T10:00:00Z' // Without milliseconds
        }
      ]

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const txMock = {
          groceryItem: {
            deleteMany: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({})
          }
        }
        await callback(txMock)
        return {}
      })
      
      mockDb.prisma.$transaction.mockImplementation(mockTransaction)

      const response = await groceryApp.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: mockUserId,
            items: itemsWithDifferentDates
          })
        })
      )

      expect(response.status).toBe(200)
    })

    it('should handle items with missing optional fields', async () => {
      const itemWithMissingFields = {
        id: 'minimal',
        name: 'Minimal Item',
        amount: '1',
        unit: 'piece',
        // category: missing
        completed: false,
        addedDate: '2024-01-01T10:00:00Z'
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const txMock = {
          groceryItem: {
            deleteMany: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({})
          }
        }
        await callback(txMock)
        return {}
      })
      
      mockDb.prisma.$transaction.mockImplementation(mockTransaction)

      const response = await groceryApp.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: mockUserId,
            items: [itemWithMissingFields]
          })
        })
      )

      expect(response.status).toBe(200)
    })

    it('should handle items with null values', async () => {
      const itemWithNulls = {
        id: 'null-item',
        name: 'Item with nulls',
        amount: '1',
        unit: null,
        category: null,
        completed: false,
        addedDate: '2024-01-01T10:00:00Z'
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const txMock = {
          groceryItem: {
            deleteMany: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({})
          }
        }
        await callback(txMock)
        return {}
      })
      
      mockDb.prisma.$transaction.mockImplementation(mockTransaction)

      const response = await groceryApp.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: mockUserId,
            items: [itemWithNulls]
          })
        })
      )

      expect(response.status).toBe(200)
    })
  })

  describe('Performance and edge cases', () => {
    it('should handle large number of items', async () => {
      const largeItemList = Array.from({ length: 100 }, (_, i) => ({
        id: `item${i}`,
        name: `Item ${i}`,
        amount: '1',
        unit: 'piece',
        category: 'test',
        completed: false,
        addedDate: '2024-01-01T10:00:00Z'
      }))

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const txMock = {
          groceryItem: {
            deleteMany: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({})
          }
        }
        await callback(txMock)
        return {}
      })
      
      mockDb.prisma.$transaction.mockImplementation(mockTransaction)

      const response = await groceryApp.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: mockUserId,
            items: largeItemList
          })
        })
      )

      expect(response.status).toBe(200)
      
      const transactionCallback = mockDb.prisma.$transaction.mock.calls[0][0]
      const mockTx = {
        groceryItem: {
          deleteMany: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({})
        }
      }
      
      await transactionCallback(mockTx)
      expect(mockTx.groceryItem.create).toHaveBeenCalledTimes(100)
    })

    it('should handle concurrent requests to the same user', async () => {
      // This test simulates what might happen with concurrent requests
      mockDb.prisma.groceryItem.findMany.mockResolvedValue(mockGroceryItems)

      const requests = Array.from({ length: 5 }, () =>
        groceryApp.request(
          new Request('http://localhost/?userId=' + mockUserId, {
            method: 'GET'
          })
        )
      )

      const responses = await Promise.all(requests)
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      expect(mockDb.prisma.groceryItem.findMany).toHaveBeenCalledTimes(5)
    })

    it('should handle very long item names', async () => {
      const longName = 'A'.repeat(500) // Very long item name
      const itemWithLongName = {
        id: 'long-name',
        name: longName,
        amount: '1',
        unit: 'piece',
        category: 'test',
        completed: false,
        addedDate: '2024-01-01T10:00:00Z'
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const txMock = {
          groceryItem: {
            deleteMany: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({})
          }
        }
        await callback(txMock)
        return {}
      })
      
      mockDb.prisma.$transaction.mockImplementation(mockTransaction)

      const response = await groceryApp.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: mockUserId,
            items: [itemWithLongName]
          })
        })
      )

      expect(response.status).toBe(200)
    })

    it('should handle special characters in item data', async () => {
      const itemWithSpecialChars = {
        id: 'special-chars',
        name: 'Item with "quotes" & <tags> and émojis 🍎',
        amount: '1½',
        unit: 'cup',
        category: 'café',
        completed: false,
        addedDate: '2024-01-01T10:00:00Z'
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const txMock = {
          groceryItem: {
            deleteMany: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({})
          }
        }
        await callback(txMock)
        return {}
      })
      
      mockDb.prisma.$transaction.mockImplementation(mockTransaction)

      const response = await groceryApp.request(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: mockUserId,
            items: [itemWithSpecialChars]
          })
        })
      )

      expect(response.status).toBe(200)
    })
  })

  describe('Security considerations', () => {
    it('should not allow access to other users data', async () => {
      const otherUserId = 'other-user-123'
      mockDb.prisma.groceryItem.findMany.mockResolvedValue([])

      await groceryApp.request(
        new Request('http://localhost/?userId=' + otherUserId, {
          method: 'GET'
        })
      )

      expect(mockDb.prisma.groceryItem.findMany).toHaveBeenCalledWith({
        where: { userId: otherUserId },
        orderBy: { addedDate: 'desc' }
      })
    })

    it('should validate userId format', async () => {
      const invalidUserId = ''
      
      const response = await groceryApp.request(
        new Request('http://localhost/?userId=' + invalidUserId, {
          method: 'GET'
        })
      )

      expect(response.status).toBe(400)
      expect(mockDb.prisma.groceryItem.findMany).not.toHaveBeenCalled()
    })

    it('should handle SQL injection attempts gracefully', async () => {
      const maliciousUserId = "'; DROP TABLE groceryItem; --"
      mockDb.prisma.groceryItem.findMany.mockResolvedValue([])

      const response = await groceryApp.request(
        new Request(`http://localhost/?userId=${encodeURIComponent(maliciousUserId)}`, {
          method: 'GET'
        })
      )

      // Should still work because Prisma handles SQL injection
      expect(response.status).toBe(200)
      expect(mockDb.prisma.groceryItem.findMany).toHaveBeenCalledWith({
        where: { userId: maliciousUserId },
        orderBy: { addedDate: 'desc' }
      })
    })
  })
})