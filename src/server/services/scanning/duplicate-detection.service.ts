/**
 * Duplicate Detection Service
 *
 * Detects duplicate items when adding scanned items to pantry
 */

import { PrismaClient } from '@prisma/client';
import { calculateItemSimilarity, findBestMatch } from '../../../utils/fuzzy-match';
import type { DetectedItem, DuplicateMatch } from '../../../types/camera-scanning';

const prisma = new PrismaClient();

export class DuplicateDetectionService {
  /**
   * Detect duplicates for a list of scanned items against user's existing pantry
   */
  static async detectDuplicates(
    userId: string,
    scannedItems: DetectedItem[],
    options?: {
      threshold?: number;
      checkCategory?: boolean;
      checkLocation?: boolean;
    }
  ): Promise<DuplicateMatch[]> {
    const threshold = options?.threshold || 0.80;

    // Get user's existing pantry items
    const existingItems = await prisma.pantryItem.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        amount: true,
        unit: true,
        category: true,
        locationId: true
      }
    });

    const duplicates: DuplicateMatch[] = [];

    for (const scanned of scannedItems) {
      const bestMatch = findBestMatch(
        { name: scanned.name, category: scanned.category },
        existingItems,
        threshold
      );

      if (bestMatch) {
        duplicates.push({
          scannedItem: scanned,
          existingItem: bestMatch.item,
          similarity: bestMatch.similarity,
          suggestedAction: this.determineSuggestedAction(
            scanned,
            bestMatch.item,
            bestMatch.similarity
          ),
          reason: this.generateReason(scanned, bestMatch.item, bestMatch.similarity)
        });
      }
    }

    return duplicates;
  }

  /**
   * Determine the suggested action for a duplicate
   */
  private static determineSuggestedAction(
    scanned: DetectedItem,
    existing: any,
    similarity: number
  ): 'merge' | 'update_quantity' | 'add_new' | 'ignore' {
    // Very high similarity (>95%) - likely the same item
    if (similarity > 0.95) {
      // Check if scanned item has different quantity
      if (scanned.quantity.amount !== parseInt(existing.amount)) {
        return 'update_quantity';
      }
      return 'ignore';
    }

    // High similarity (85-95%) - probably same item, different state
    if (similarity > 0.85) {
      return 'merge';
    }

    // Medium similarity (80-85%) - might be same, let user decide
    if (similarity > 0.80) {
      return 'add_new';
    }

    return 'add_new';
  }

  /**
   * Generate a human-readable reason for the duplicate match
   */
  private static generateReason(
    scanned: DetectedItem,
    existing: any,
    similarity: number
  ): string {
    const similarityPercent = (similarity * 100).toFixed(0);

    if (similarity > 0.95) {
      return `This item is already in your pantry (${similarityPercent}% match)`;
    }

    if (similarity > 0.90) {
      return `Very similar to "${existing.name}" in your pantry (${similarityPercent}% match)`;
    }

    if (similarity > 0.85) {
      return `Similar to "${existing.name}" (${similarityPercent}% match)`;
    }

    return `Possibly matches "${existing.name}" (${similarityPercent}% match)`;
  }

  /**
   * Auto-resolve duplicates based on user preferences
   */
  static async autoResolveDuplicates(
    userId: string,
    duplicates: DuplicateMatch[]
  ): Promise<{
    autoResolved: DuplicateMatch[];
    needsUserInput: DuplicateMatch[];
  }> {
    const autoResolved: DuplicateMatch[] = [];
    const needsUserInput: DuplicateMatch[] = [];

    for (const duplicate of duplicates) {
      // Auto-ignore exact duplicates
      if (duplicate.suggestedAction === 'ignore') {
        autoResolved.push(duplicate);
        continue;
      }

      // Everything else needs user confirmation
      needsUserInput.push(duplicate);
    }

    return { autoResolved, needsUserInput };
  }

  /**
   * Merge a scanned item with an existing pantry item
   */
  static async mergeDuplicate(
    existingItemId: string,
    scannedItem: DetectedItem,
    scanResultId: string
  ): Promise<void> {
    // Update existing item quantity
    await prisma.pantryItem.update({
      where: { id: existingItemId },
      data: {
        amount: scannedItem.quantity.amount.toString(),
        unit: scannedItem.quantity.unit,
        scanResultId,
        scanConfidence: scannedItem.confidence,
        updatedAt: new Date()
      }
    });
  }
}
