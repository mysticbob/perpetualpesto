import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../server/lib/db';
import axios from 'axios';

// Test server configuration
const BASE_URL = 'http://localhost:3003';
const TEST_USER_EMAIL = 'test@example.com';

describe('API Integration Tests', () => {
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.upsert({
      where: { email: TEST_USER_EMAIL },
      update: {},
      create: {
        email: TEST_USER_EMAIL,
        name: 'Test User',
        firebaseUid: 'test-firebase-uid',
      },
    });
    testUserId = user.id;

    // Note: In a real scenario, you'd get a Firebase auth token here
    authToken = 'mock-token';
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.pantryItem.deleteMany({ where: { userId: testUserId } });
    await prisma.recipe.deleteMany({ where: { createdBy: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await axios.get(`${BASE_URL}/health`);

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('healthy');
      expect(response.data.database).toBe('connected');
    });
  });

  describe('Recipe API', () => {
    let testRecipeId: string;

    afterEach(async () => {
      if (testRecipeId) {
        await prisma.recipe.delete({ where: { id: testRecipeId } }).catch(() => {});
      }
    });

    it('should create a recipe', async () => {
      const newRecipe = {
        name: 'Test Recipe',
        description: 'A delicious test recipe',
        prepTime: 15,
        cookTime: 30,
        totalTime: 45,
        servings: 4,
        ingredients: [
          { name: 'chicken', amount: '2', unit: 'lbs' },
          { name: 'rice', amount: '1', unit: 'cup' },
        ],
        instructions: [
          { step: 'Cook the chicken' },
          { step: 'Cook the rice' },
          { step: 'Combine and serve' },
        ],
      };

      const response = await axios.post(
        `${BASE_URL}/api/recipes`,
        newRecipe,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.status).toBe(201);
      expect(response.data.name).toBe(newRecipe.name);
      expect(response.data.ingredients).toHaveLength(2);
      expect(response.data.instructions).toHaveLength(3);

      testRecipeId = response.data.id;
    });

    it('should fetch recipes list', async () => {
      const response = await axios.get(`${BASE_URL}/api/recipes`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should return 400 for invalid recipe data', async () => {
      const invalidRecipe = {
        name: '', // Invalid: empty name
      };

      try {
        await axios.post(
          `${BASE_URL}/api/recipes`,
          invalidRecipe,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('Pantry API', () => {
    let testItemId: string;

    afterEach(async () => {
      if (testItemId) {
        await prisma.pantryItem.delete({ where: { id: testItemId } }).catch(() => {});
      }
    });

    it('should add item to pantry', async () => {
      const newItem = {
        name: 'Chicken',
        quantity: 2,
        unit: 'lbs',
        location: 'fridge',
      };

      const response = await axios.post(
        `${BASE_URL}/api/pantry`,
        newItem,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.status).toBe(201);
      expect(response.data.name).toBe(newItem.name);
      expect(response.data.quantity).toBe(newItem.quantity);

      testItemId = response.data.id;
    });

    it('should get user pantry items', async () => {
      const response = await axios.get(
        `${BASE_URL}/api/pantry`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should update pantry item', async () => {
      // First create an item
      const item = await prisma.pantryItem.create({
        data: {
          name: 'Milk',
          quantity: 1,
          unit: 'gallon',
          location: { connect: { name: 'Fridge' } },
          user: { connect: { id: testUserId } },
        },
      });
      testItemId = item.id;

      // Update it
      const updates = { quantity: 2 };
      const response = await axios.patch(
        `${BASE_URL}/api/pantry/${testItemId}`,
        updates,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.status).toBe(200);
      expect(response.data.quantity).toBe(2);
    });

    it('should delete pantry item', async () => {
      // First create an item
      const item = await prisma.pantryItem.create({
        data: {
          name: 'Temporary Item',
          quantity: 1,
          unit: 'piece',
          location: { connect: { name: 'Pantry' } },
          user: { connect: { id: testUserId } },
        },
      });

      const response = await axios.delete(
        `${BASE_URL}/api/pantry/${item.id}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.status).toBe(204);

      // Verify deletion
      const deleted = await prisma.pantryItem.findUnique({
        where: { id: item.id },
      });
      expect(deleted).toBeNull();
    });
  });

  describe('Recipe Extraction API', () => {
    it('should extract recipe from URL (mock)', async () => {
      // Note: This will fail in real environment without actual recipe URL
      // In production, you'd mock the axios.get in the extract route

      const testUrl = 'https://example.com/recipe';

      try {
        const response = await axios.post(
          `${BASE_URL}/api/extract`,
          { url: testUrl },
          { timeout: 5000 }
        );

        // If successful (unlikely with example.com)
        expect(response.status).toBe(200);
        expect(response.data.name).toBeDefined();
      } catch (error: any) {
        // Expected for invalid URL
        expect([400, 500]).toContain(error.response?.status);
      }
    });

    it('should return 400 for missing URL', async () => {
      try {
        await axios.post(`${BASE_URL}/api/extract`, {});
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('AI API (requires OpenAI key)', () => {
    // These tests require OPENAI_API_KEY to be set
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

    it.skipIf(!hasOpenAIKey)('should process chat message', async () => {
      const response = await axios.post(
        `${BASE_URL}/api/ai/chat`,
        {
          userId: testUserId,
          messages: [{ role: 'user', content: 'Hello' }],
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.status).toBe(200);
      expect(response.data.response).toBeDefined();
    });

    it.skipIf(!hasOpenAIKey)('should suggest recipes', async () => {
      const response = await axios.post(
        `${BASE_URL}/api/ai/suggest-recipes`,
        {
          userId: testUserId,
          ingredients: ['chicken', 'rice'],
          preferences: {
            dietary: [],
            maxPrepTime: 60,
          },
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.suggestions)).toBe(true);
    });

    it('should check AI service health', async () => {
      const response = await axios.get(`${BASE_URL}/api/ai/health`);

      expect(response.status).toBe(200);
      expect(response.data.status).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      try {
        await axios.get(`${BASE_URL}/api/nonexistent`);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should handle malformed JSON', async () => {
      try {
        await axios.post(
          `${BASE_URL}/api/recipes`,
          'invalid json',
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });
});
