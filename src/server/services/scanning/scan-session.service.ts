/**
 * Scan Session Service
 *
 * Manages scanning sessions and results
 */

import { PrismaClient } from '@prisma/client';
import type { ScanMode } from '../../../types/camera-scanning';

const prisma = new PrismaClient();

export class ScanSessionService {
  /**
   * Create a new scan session
   */
  static async createSession(userId: string, mode: ScanMode) {
    return await prisma.scanSession.create({
      data: {
        userId,
        mode,
        status: 'IN_PROGRESS'
      }
    });
  }

  /**
   * Get or create a session
   */
  static async getOrCreateSession(userId: string, sessionId?: string, mode: ScanMode = 'SNAPSHOT') {
    if (sessionId) {
      const session = await prisma.scanSession.findUnique({
        where: { id: sessionId }
      });

      if (session && session.status === 'IN_PROGRESS') {
        return session;
      }
    }

    return await this.createSession(userId, mode);
  }

  /**
   * Complete a scan session
   */
  static async completeSession(sessionId: string) {
    return await prisma.scanSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });
  }

  /**
   * Cancel a scan session
   */
  static async cancelSession(sessionId: string) {
    return await prisma.scanSession.update({
      where: { id: sessionId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date()
      }
    });
  }

  /**
   * Get session statistics
   */
  static async getSessionStats(sessionId: string) {
    const session = await prisma.scanSession.findUnique({
      where: { id: sessionId },
      include: {
        scanResults: true,
        pantryItems: true
      }
    });

    if (!session) return null;

    const totalItems = session.scanResults.reduce((sum, result: any) => {
      const items = Array.isArray(result.detectedItems) ? result.detectedItems : JSON.parse(result.detectedItems as string);
      return sum + items.length;
    }, 0);

    return {
      sessionId: session.id,
      mode: session.mode,
      status: session.status,
      totalScans: session.scanResults.length,
      totalItemsDetected: totalItems,
      totalItemsAdded: session.pantryItems.length,
      totalCost: session.totalCost,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      duration: session.completedAt
        ? session.completedAt.getTime() - session.startedAt.getTime()
        : null
    };
  }
}
