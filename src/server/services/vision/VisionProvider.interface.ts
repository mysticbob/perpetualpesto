/**
 * Vision Provider Abstraction Layer
 *
 * This module defines the interface and base class for all vision AI providers.
 * Each provider (OpenAI, Anthropic, Google, etc.) implements this interface.
 */

import type {
  ScanOptions,
  ProviderScanResult,
  ProviderCapabilities,
  DetectedItem
} from '../../../types/camera-scanning';

export interface VisionProvider {
  name: string;
  version: string;

  /**
   * Scan an image and detect pantry items
   */
  scanImage(
    image: Buffer | string,
    options: ScanOptions
  ): Promise<ProviderScanResult>;

  /**
   * Get cost estimate for scanning an image
   */
  getCostEstimate(imageSize: number): number;

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities;

  /**
   * Validate API key and connection
   */
  validate(): Promise<boolean>;
}

export abstract class BaseVisionProvider implements VisionProvider {
  abstract name: string;
  abstract version: string;

  protected abstract callAPI(
    image: Buffer | string,
    prompt: string
  ): Promise<any>;

  async scanImage(
    image: Buffer | string,
    options: ScanOptions
  ): Promise<ProviderScanResult> {
    const startTime = Date.now();

    try {
      const prompt = this.buildPrompt(options);
      const rawResponse = await this.callAPI(image, prompt);
      const items = this.parseResponse(rawResponse);
      const processingTime = Date.now() - startTime;

      const imageSize = typeof image === 'string'
        ? Buffer.from(image, 'base64').length
        : image.length;

      const cost = this.getCostEstimate(imageSize);

      return {
        items,
        confidence: this.calculateConfidence(items),
        processingTime,
        cost,
        rawResponse
      };
    } catch (error: any) {
      throw new Error(`${this.name} scan failed: ${error.message}`);
    }
  }

  protected buildPrompt(options: ScanOptions): string {
    const mode = options.mode || 'snapshot';
    const extractNutrition = options.extractNutrition !== false;
    const extractExpiry = options.extractExpiry !== false;

    let prompt = `You are a food and grocery recognition expert. Analyze the provided image and identify all food items, groceries, spices, or pantry items visible.

For each item detected, provide:
1. **name**: The specific product name (e.g., "Heinz Tomato Ketchup" not just "ketchup")
2. **category**: One of [produce, canned_goods, condiments, spices, dairy, frozen, beverages, snacks, baking, grains, pasta, sauces, oils, meat, seafood, bread, cereal, other]
3. **quantity**:
   - amount: number of items
   - unit: bottle/jar/can/box/bag/etc
   - size: if visible on packaging (e.g., "24 oz", "1 L")
   - estimatedFillLevel: 0.0 to 1.0 (0.5 = half full). If unopened/new, use 1.0`;

    if (extractExpiry) {
      prompt += `\n4. **expiryDate**: If visible on packaging, format as YYYY-MM-DD. If not visible, omit this field.`;
    }

    if (extractNutrition) {
      prompt += `\n5. **nutrition** (if label is clearly readable):
   - servingSize
   - calories
   - protein
   - carbohydrates
   - fat`;
    }

    prompt += `\n6. **confidence**: Your confidence in this identification (0.0 to 1.0)

Return ONLY valid JSON in this exact format:
{
  "items": [
    {
      "name": "string",
      "category": "string",
      "quantity": {
        "amount": 1,
        "unit": "string",
        "size": "string",
        "estimatedFillLevel": 1.0
      },`;

    if (extractExpiry) {
      prompt += `\n      "expiryDate": "YYYY-MM-DD" or null,`;
    }

    if (extractNutrition) {
      prompt += `\n      "nutrition": { ... } or null,`;
    }

    prompt += `\n      "confidence": 0.95
    }
  ]
}

Important:
- Be specific with names (brands, varieties)
- For produce, include type and estimated count
- For spices in generic jars, try to identify from label or appearance
- If multiple similar items, count them separately
- Estimate fill levels carefully based on visual cues
- Only include nutrition if you can clearly read the label`;

    if (mode === 'continuous') {
      prompt += `\n- This is a video frame. Focus on items you're highly confident about (>0.85)`;
    }

    return prompt;
  }

  protected abstract parseResponse(response: any): DetectedItem[];

  protected calculateConfidence(items: DetectedItem[]): number {
    if (items.length === 0) return 0;
    const totalConfidence = items.reduce((sum, item) => sum + item.confidence, 0);
    return totalConfidence / items.length;
  }

  protected normalizeResponse(rawItems: any[]): DetectedItem[] {
    return rawItems.map(item => ({
      name: item.name || 'Unknown Item',
      category: item.category || 'other',
      quantity: {
        amount: item.quantity?.amount || 1,
        unit: item.quantity?.unit || 'item',
        size: item.quantity?.size,
        estimatedFillLevel: item.quantity?.estimatedFillLevel || 1.0
      },
      expiryDate: item.expiryDate,
      nutrition: item.nutrition,
      confidence: item.confidence || 0.5,
      boundingBox: item.boundingBox,
      metadata: item.metadata
    }));
  }

  abstract getCostEstimate(imageSize: number): number;
  abstract getCapabilities(): ProviderCapabilities;
  abstract validate(): Promise<boolean>;
}
