/**
 * Camera Scanning API Routes
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { VisionServiceFactory } from '../services/vision/VisionServiceFactory';
import { DuplicateDetectionService } from '../services/scanning/duplicate-detection.service';
import { ScanSessionService } from '../services/scanning/scan-session.service';
import { calculateImageHash } from '../../utils/image';
import type { ScanImageRequest, ScanImageResponse } from '../../types/camera-scanning';

const app = new Hono();
const prisma = new PrismaClient();

// Middleware to get userId (assumes auth middleware sets this)
// You'll need to adapt this to your auth system
const requireAuth = async (c: any, next: any) => {
  const userId = c.get('userId') || c.req.header('x-user-id');
  if (!userId) {
    return c.json({ success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }, 401);
  }
  c.set('userId', userId);
  await next();
};

// Apply auth middleware to all routes
app.use('*', requireAuth);

// ============================================================================
// POST /api/scanning/scan - Scan an image
// ============================================================================
app.post('/scan', async (c) => {
  try {
    const body: ScanImageRequest = await c.req.json();
    const userId = c.get('userId');

    // Validate request
    const schema = z.object({
      image: z.string().min(100), // Base64 string
      options: z.object({
        mode: z.enum(['snapshot', 'continuous']).default('snapshot'),
        provider: z.string().optional(),
        confidenceThreshold: z.number().min(0).max(1).optional(),
        extractNutrition: z.boolean().optional(),
        extractExpiry: z.boolean().optional()
      }),
      sessionId: z.string().optional()
    });

    const validated = schema.parse(body);

    // Get or create session
    const session = await ScanSessionService.getOrCreateSession(
      userId,
      validated.sessionId,
      validated.options.mode.toUpperCase() as any
    );

    // Get provider (or use default)
    const providerName = validated.options.provider || process.env.CAMERA_SCANNING_DEFAULT_PROVIDER || 'gemini-1.5-pro';
    const provider = VisionServiceFactory.getProvider(providerName);

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(validated.image, 'base64');
    const imageHash = await calculateImageHash(imageBuffer);

    // Scan image
    const startTime = Date.now();
    const result = await provider.scanImage(imageBuffer, validated.options as any);
    const processingTime = Date.now() - startTime;

    // Save scan result
    const scanResult = await prisma.scanResult.create({
      data: {
        sessionId: session.id,
        userId,
        provider: providerName,
        imageHash,
        imageSize: imageBuffer.length,
        detectedItems: JSON.stringify(result.items),
        rawResponse: JSON.stringify(result.rawResponse),
        confidence: result.confidence,
        processingTimeMs: result.processingTime,
        cost: result.cost,
        success: true,
        metadata: {
          options: validated.options
        }
      }
    });

    // Detect duplicates
    const duplicates = await DuplicateDetectionService.detectDuplicates(
      userId,
      result.items
    );

    const response: ScanImageResponse = {
      success: true,
      data: {
        scanResult: {
          ...scanResult,
          detectedItems: result.items as any
        } as any,
        duplicates
      }
    };

    return c.json(response);

  } catch (error: any) {
    console.error('Scan error:', error);
    return c.json({
      success: false,
      error: {
        message: error.message || 'Scan failed',
        code: 'SCAN_FAILED',
        details: error
      }
    }, 500);
  }
});

// ============================================================================
// GET /api/scanning/providers - List available providers
// ============================================================================
app.get('/providers', async (c) => {
  try {
    const providerInfo = VisionServiceFactory.getProviderInfo();

    return c.json({
      providers: providerInfo.map(p => ({
        name: p.name,
        displayName: p.name.replace(/-/g, ' ').toUpperCase(),
        version: p.version,
        capabilities: p.capabilities,
        estimatedCost: p.estimatedCost,
        isAvailable: true
      }))
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// GET /api/scanning/session/:sessionId - Get session details
// ============================================================================
app.get('/session/:sessionId', async (c) => {
  try {
    const userId = c.get('userId');
    const { sessionId } = c.req.param();

    const session = await prisma.scanSession.findFirst({
      where: {
        id: sessionId,
        userId
      },
      include: {
        scanResults: true
      }
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const stats = await ScanSessionService.getSessionStats(sessionId);

    return c.json({ session, stats });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// POST /api/scanning/session/:sessionId/complete - Complete a session
// ============================================================================
app.post('/session/:sessionId/complete', async (c) => {
  try {
    const userId = c.get('userId');
    const { sessionId } = c.req.param();

    // Verify ownership
    const session = await prisma.scanSession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const updated = await ScanSessionService.completeSession(sessionId);
    const stats = await ScanSessionService.getSessionStats(sessionId);

    return c.json({ session: updated, stats });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// POST /api/scanning/add-items - Add scanned items to pantry
// ============================================================================
app.post('/add-items', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const schema = z.object({
      scanResultId: z.string(),
      items: z.array(z.object({
        detectedItem: z.any(),
        locationId: z.string(),
        userEdits: z.any().optional()
      }))
    });

    const validated = schema.parse(body);

    // Verify scan result ownership
    const scanResult = await prisma.scanResult.findFirst({
      where: { id: validated.scanResultId, userId }
    });

    if (!scanResult) {
      return c.json({ error: 'Scan result not found' }, 404);
    }

    const addedItems = [];
    let skippedDuplicates = 0;

    for (const { detectedItem, locationId, userEdits } of validated.items) {
      const finalItem = userEdits || detectedItem;

      // Create pantry item
      const created = await prisma.pantryItem.create({
        data: {
          userId,
          locationId,
          name: finalItem.name,
          amount: finalItem.quantity.amount.toString(),
          unit: finalItem.quantity.unit,
          category: finalItem.category,
          expirationDate: finalItem.expiryDate ? new Date(finalItem.expiryDate) : null,
          scanSessionId: scanResult.sessionId,
          scanResultId: scanResult.id,
          scanConfidence: finalItem.confidence,
          detectedName: detectedItem.name,
          wasEdited: !!userEdits
        }
      });

      addedItems.push({
        id: created.id,
        name: created.name,
        wasEdited: created.wasEdited
      });
    }

    return c.json({
      success: true,
      data: {
        addedItems,
        skippedDuplicates
      }
    });

  } catch (error: any) {
    console.error('Add items error:', error);
    return c.json({
      success: false,
      error: {
        message: error.message,
        code: 'ADD_ITEMS_FAILED'
      }
    }, 500);
  }
});

// ============================================================================
// POST /api/scanning/feedback - Submit feedback on scan results
// ============================================================================
app.post('/feedback', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const schema = z.object({
      scanResultId: z.string(),
      feedbackType: z.enum(['THUMBS_UP', 'THUMBS_DOWN', 'CORRECTION']),
      itemIndex: z.number().optional(),
      incorrectValue: z.any().optional(),
      correctValue: z.any().optional(),
      comment: z.string().optional()
    });

    const validated = schema.parse(body);

    const feedback = await prisma.scanFeedback.create({
      data: {
        scanResultId: validated.scanResultId,
        userId,
        feedbackType: validated.feedbackType as any,
        itemIndex: validated.itemIndex,
        incorrectValue: validated.incorrectValue ? JSON.stringify(validated.incorrectValue) : null,
        correctValue: validated.correctValue ? JSON.stringify(validated.correctValue) : null,
        comment: validated.comment
      }
    });

    return c.json({ success: true, feedback });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;
