/**
 * Vision Service Factory
 *
 * Manages all vision providers and provides a unified interface for accessing them.
 */

import type { VisionProvider } from './VisionProvider.interface';
import { GeminiVisionProvider } from './providers/gemini-vision.provider';
import { GeminiFlashProvider } from './providers/gemini-flash.provider';
import { OpenAIVisionProvider } from './providers/openai-vision.provider';
import { ClaudeVisionProvider } from './providers/claude-vision.provider';

export class VisionServiceFactory {
  private static providers: Map<string, VisionProvider> = new Map();
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('Initializing vision providers...');

    // Initialize Google Gemini Pro
    if (process.env.GOOGLE_API_KEY) {
      try {
        const geminiPro = new GeminiVisionProvider(process.env.GOOGLE_API_KEY);
        const isValid = await geminiPro.validate();
        if (isValid) {
          this.providers.set('gemini-1.5-pro', geminiPro);
          console.log('✓ Gemini 1.5 Pro initialized');
        } else {
          console.warn('⚠ Gemini 1.5 Pro validation failed');
        }
      } catch (error: any) {
        console.error('Failed to initialize Gemini Pro:', error.message);
      }
    }

    // Initialize Google Gemini Flash
    if (process.env.GOOGLE_API_KEY) {
      try {
        const geminiFlash = new GeminiFlashProvider(process.env.GOOGLE_API_KEY);
        const isValid = await geminiFlash.validate();
        if (isValid) {
          this.providers.set('gemini-1.5-flash', geminiFlash);
          console.log('✓ Gemini 1.5 Flash initialized');
        } else {
          console.warn('⚠ Gemini 1.5 Flash validation failed');
        }
      } catch (error: any) {
        console.error('Failed to initialize Gemini Flash:', error.message);
      }
    }

    // Initialize OpenAI GPT-4 Vision
    if (process.env.OPENAI_API_KEY) {
      try {
        const openaiVision = new OpenAIVisionProvider(process.env.OPENAI_API_KEY);
        const isValid = await openaiVision.validate();
        if (isValid) {
          this.providers.set('gpt-4-vision', openaiVision);
          console.log('✓ GPT-4 Vision initialized');
        } else {
          console.warn('⚠ GPT-4 Vision validation failed');
        }
      } catch (error: any) {
        console.error('Failed to initialize OpenAI Vision:', error.message);
      }
    }

    // Initialize Anthropic Claude 3.5 Sonnet
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const claudeVision = new ClaudeVisionProvider(process.env.ANTHROPIC_API_KEY);
        const isValid = await claudeVision.validate();
        if (isValid) {
          this.providers.set('claude-3.5-sonnet', claudeVision);
          console.log('✓ Claude 3.5 Sonnet initialized');
        } else {
          console.warn('⚠ Claude 3.5 Sonnet validation failed');
        }
      } catch (error: any) {
        console.error('Failed to initialize Claude:', error.message);
      }
    }

    this.initialized = true;

    const activeProviders = this.getAvailableProviders();
    console.log(`Vision providers initialized: ${activeProviders.length} active`);

    if (activeProviders.length === 0) {
      console.warn('⚠ WARNING: No vision providers are available!');
      console.warn('Please set up API keys in .env file');
    }
  }

  static getProvider(name: string): VisionProvider {
    if (!this.initialized) {
      throw new Error('VisionServiceFactory not initialized. Call initialize() first.');
    }

    const provider = this.providers.get(name);
    if (!provider) {
      const available = this.getAvailableProviders();
      throw new Error(
        `Provider "${name}" not found or not initialized. Available providers: ${available.join(', ')}`
      );
    }

    return provider;
  }

  static getAllProviders(): VisionProvider[] {
    if (!this.initialized) {
      throw new Error('VisionServiceFactory not initialized. Call initialize() first.');
    }

    return Array.from(this.providers.values());
  }

  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  static hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  static getDefaultProvider(): VisionProvider {
    const defaultName = process.env.CAMERA_SCANNING_DEFAULT_PROVIDER || 'gemini-1.5-pro';

    if (this.hasProvider(defaultName)) {
      return this.getProvider(defaultName);
    }

    // Fallback to first available provider
    const available = this.getAvailableProviders();
    if (available.length > 0) {
      console.warn(`Default provider "${defaultName}" not available, using "${available[0]}"`);
      return this.getProvider(available[0]);
    }

    throw new Error('No vision providers available');
  }

  static getProviderInfo() {
    const providers = this.getAllProviders();

    return providers.map(provider => ({
      name: provider.name,
      version: provider.version,
      capabilities: provider.getCapabilities(),
      estimatedCost: {
        perImage: provider.getCostEstimate(1024 * 1024), // 1MB image
        per1000Images: provider.getCostEstimate(1024 * 1024) * 1000
      }
    }));
  }

  static reset(): void {
    this.providers.clear();
    this.initialized = false;
  }
}

// Auto-initialize on module load (async, non-blocking)
VisionServiceFactory.initialize().catch(error => {
  console.error('Failed to initialize VisionServiceFactory:', error);
});
