/**
 * Google Gemini 1.5 Flash Vision Provider (Budget, High-Speed)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseVisionProvider } from '../VisionProvider.interface';
import type { DetectedItem, ProviderCapabilities } from '../../../../types/camera-scanning';

export class GeminiFlashProvider extends BaseVisionProvider {
  name = 'gemini-1.5-flash';
  version = '1.5';

  private client: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    super();
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2048,
      }
    });
  }

  protected async callAPI(
    image: Buffer | string,
    prompt: string
  ): Promise<any> {
    const imageData = typeof image === 'string'
      ? image
      : image.toString('base64');

    const result = await this.model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageData,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    return result.response.text();
  }

  protected parseResponse(response: any): DetectedItem[] {
    try {
      // Remove markdown code blocks if present
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '').replace(/```\n?$/g, '');
      }

      const parsed = JSON.parse(jsonStr);
      const items = parsed.items || [];

      return this.normalizeResponse(items);
    } catch (error: any) {
      console.error('Failed to parse Gemini Flash response:', error);
      console.error('Response was:', response);
      throw new Error(`Failed to parse response: ${error.message}`);
    }
  }

  getCostEstimate(imageSize: number): number {
    // Gemini 1.5 Flash pricing (as of 2024)
    // Input: $0.00001875 per image (< 128k tokens)
    // Output: $0.000075 per 1k tokens
    // Estimate ~1500 tokens for image + ~500 for response
    const inputCost = 0.00001875;
    const outputCost = 0.000075 * (500 / 1000);
    return inputCost + outputCost;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxImageSize: 20 * 1024 * 1024, // 20MB
      supportedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      supportsVideo: true,
      supportsBatch: false,
      supportsNutrition: true,
      supportsOCR: true,
      avgResponseTime: 800, // Much faster than Pro
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 4000000 // Higher throughput than Pro
      }
    };
  }

  async validate(): Promise<boolean> {
    try {
      // Test with a simple prompt
      const result = await this.model.generateContent(['Say "OK"']);
      const text = result.response.text();
      return text.includes('OK');
    } catch (error) {
      console.error('Gemini Flash validation failed:', error);
      return false;
    }
  }
}
