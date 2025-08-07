import { prisma } from '../../../server/lib/db';

interface TokenCost {
  model: string;
  inputCost: number; // per 1k tokens
  outputCost: number; // per 1k tokens
}

interface UsageMetrics {
  userId: string;
  period: 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  totalTokens: number;
  totalCost: number;
  features: {
    chat: { calls: number; tokens: number; cost: number };
    vision: { calls: number; tokens: number; cost: number };
    voice: { calls: number; tokens: number; cost: number };
    suggestions: { calls: number; tokens: number; cost: number };
  };
  topCommands: Array<{ intent: string; count: number }>;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
}

interface AIPerformanceMetrics {
  feature: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  successRate: number;
  errorTypes: Record<string, number>;
}

export class AIAnalyticsService {
  // OpenAI pricing as of 2024 (in USD per 1k tokens)
  private readonly tokenCosts: Record<string, TokenCost> = {
    'gpt-4-turbo-preview': { model: 'gpt-4-turbo-preview', inputCost: 0.01, outputCost: 0.03 },
    'gpt-4-vision-preview': { model: 'gpt-4-vision-preview', inputCost: 0.01, outputCost: 0.03 },
    'gpt-3.5-turbo': { model: 'gpt-3.5-turbo', inputCost: 0.0005, outputCost: 0.0015 },
    'text-embedding-3-small': { model: 'text-embedding-3-small', inputCost: 0.00002, outputCost: 0 },
  };

  async trackUsage(data: {
    userId: string;
    feature: string;
    action: string;
    tokensUsed?: number;
    model?: string;
    responseTime?: number;
    success: boolean;
    error?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      // Calculate cost if tokens and model provided
      let cost = 0;
      if (data.tokensUsed && data.model) {
        const pricing = this.tokenCosts[data.model];
        if (pricing) {
          // Assuming balanced input/output for simplicity
          const inputTokens = data.tokensUsed / 2;
          const outputTokens = data.tokensUsed / 2;
          cost = (inputTokens * pricing.inputCost + outputTokens * pricing.outputCost) / 1000;
        }
      }

      await prisma.aIUsageAnalytics.create({
        data: {
          userId: data.userId,
          feature: data.feature,
          action: data.action,
          tokensUsed: data.tokensUsed,
          cost,
          responseTime: data.responseTime,
          success: data.success,
          error: data.error,
          metadata: data.metadata,
        },
      });
    } catch (error) {
      console.error('Failed to track AI usage:', error);
    }
  }

  async getUserMetrics(
    userId: string,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<UsageMetrics> {
    const now = new Date();
    const startDate = this.getStartDate(now, period);

    // Fetch usage data
    const usage = await prisma.aIUsageAnalytics.findMany({
      where: {
        userId,
        timestamp: {
          gte: startDate,
          lte: now,
        },
      },
    });

    // Fetch command data
    const commands = await prisma.aICommand.findMany({
      where: {
        userId,
        executedAt: {
          gte: startDate,
          lte: now,
        },
      },
      select: {
        intent: true,
      },
    });

    // Calculate metrics
    const features = {
      chat: this.calculateFeatureMetrics(usage.filter(u => u.feature === 'chat')),
      vision: this.calculateFeatureMetrics(usage.filter(u => u.feature === 'vision')),
      voice: this.calculateFeatureMetrics(usage.filter(u => u.feature === 'voice')),
      suggestions: this.calculateFeatureMetrics(usage.filter(u => u.feature === 'suggestions')),
    };

    // Calculate top commands
    const commandCounts = commands.reduce((acc, cmd) => {
      acc[cmd.intent] = (acc[cmd.intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCommands = Object.entries(commandCounts)
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate overall metrics
    const totalTokens = usage.reduce((sum, u) => sum + (u.tokensUsed || 0), 0);
    const totalCost = usage.reduce((sum, u) => sum + (u.cost || 0), 0);
    const avgResponseTime = usage.length > 0
      ? usage.reduce((sum, u) => sum + (u.responseTime || 0), 0) / usage.length
      : 0;
    const successCount = usage.filter(u => u.success).length;
    const successRate = usage.length > 0 ? (successCount / usage.length) * 100 : 100;
    const errorRate = usage.length > 0 ? ((usage.length - successCount) / usage.length) * 100 : 0;

    return {
      userId,
      period,
      startDate,
      endDate: now,
      totalTokens,
      totalCost,
      features,
      topCommands,
      averageResponseTime: Math.round(avgResponseTime),
      successRate: Math.round(successRate * 10) / 10,
      errorRate: Math.round(errorRate * 10) / 10,
    };
  }

  private calculateFeatureMetrics(usage: any[]): {
    calls: number;
    tokens: number;
    cost: number;
  } {
    return {
      calls: usage.length,
      tokens: usage.reduce((sum, u) => sum + (u.tokensUsed || 0), 0),
      cost: usage.reduce((sum, u) => sum + (u.cost || 0), 0),
    };
  }

  private getStartDate(now: Date, period: 'day' | 'week' | 'month' | 'year'): Date {
    const startDate = new Date(now);
    
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    return startDate;
  }

  async getSystemMetrics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalTokensToday: number;
    totalCostToday: number;
    featureUsage: Record<string, number>;
    errorRate: number;
    performanceMetrics: AIPerformanceMetrics[];
  }> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    // Get today's usage
    const todayUsage = await prisma.aIUsageAnalytics.findMany({
      where: {
        timestamp: {
          gte: startOfDay,
          lte: now,
        },
      },
    });

    // Get unique users
    const uniqueUsers = new Set(todayUsage.map(u => u.userId));
    
    // Get total users
    const totalUsers = await prisma.user.count();

    // Calculate feature usage
    const featureUsage = todayUsage.reduce((acc, u) => {
      acc[u.feature] = (acc[u.feature] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate performance metrics by feature
    const features = ['chat', 'vision', 'voice', 'suggestions'];
    const performanceMetrics: AIPerformanceMetrics[] = [];

    for (const feature of features) {
      const featureData = todayUsage.filter(u => u.feature === feature);
      
      if (featureData.length > 0) {
        const responseTimes = featureData
          .map(u => u.responseTime || 0)
          .filter(t => t > 0)
          .sort((a, b) => a - b);

        const successCount = featureData.filter(u => u.success).length;
        const errorTypes = featureData
          .filter(u => !u.success && u.error)
          .reduce((acc, u) => {
            acc[u.error!] = (acc[u.error!] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

        performanceMetrics.push({
          feature,
          avgResponseTime: responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0,
          p95ResponseTime: this.percentile(responseTimes, 0.95),
          p99ResponseTime: this.percentile(responseTimes, 0.99),
          successRate: (successCount / featureData.length) * 100,
          errorTypes,
        });
      }
    }

    const totalTokensToday = todayUsage.reduce((sum, u) => sum + (u.tokensUsed || 0), 0);
    const totalCostToday = todayUsage.reduce((sum, u) => sum + (u.cost || 0), 0);
    const errorCount = todayUsage.filter(u => !u.success).length;
    const errorRate = todayUsage.length > 0 ? (errorCount / todayUsage.length) * 100 : 0;

    return {
      totalUsers,
      activeUsers: uniqueUsers.size,
      totalTokensToday,
      totalCostToday,
      featureUsage,
      errorRate: Math.round(errorRate * 10) / 10,
      performanceMetrics,
    };
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.min(index, sorted.length - 1)];
  }

  async generateUsageReport(userId: string): Promise<{
    daily: UsageMetrics;
    weekly: UsageMetrics;
    monthly: UsageMetrics;
    recommendations: string[];
  }> {
    const [daily, weekly, monthly] = await Promise.all([
      this.getUserMetrics(userId, 'day'),
      this.getUserMetrics(userId, 'week'),
      this.getUserMetrics(userId, 'month'),
    ]);

    const recommendations = this.generateRecommendations(monthly);

    return {
      daily,
      weekly,
      monthly,
      recommendations,
    };
  }

  private generateRecommendations(metrics: UsageMetrics): string[] {
    const recommendations: string[] = [];

    // High error rate
    if (metrics.errorRate > 10) {
      recommendations.push('Consider simplifying your commands for better recognition');
    }

    // Heavy vision usage
    if (metrics.features.vision.calls > 50) {
      recommendations.push('You\'re using image recognition frequently - consider batch scanning');
    }

    // Low success rate
    if (metrics.successRate < 80) {
      recommendations.push('Try using suggested commands for better results');
    }

    // High token usage
    if (metrics.totalTokens > 100000) {
      recommendations.push('Your usage is high - consider more concise commands');
    }

    // Suggest underused features
    if (metrics.features.voice.calls === 0) {
      recommendations.push('Try voice commands for hands-free operation');
    }

    if (metrics.features.suggestions.calls === 0) {
      recommendations.push('Get recipe suggestions based on your pantry items');
    }

    return recommendations;
  }

  // Alert if approaching limits
  async checkUsageLimits(userId: string): Promise<{
    warnings: string[];
    limits: {
      daily: { used: number; limit: number; percentage: number };
      monthly: { used: number; limit: number; percentage: number };
    };
  }> {
    const dailyMetrics = await this.getUserMetrics(userId, 'day');
    const monthlyMetrics = await this.getUserMetrics(userId, 'month');

    // Define limits (these could be stored in database per user tier)
    const dailyTokenLimit = 50000;
    const monthlyTokenLimit = 1000000;
    const dailyCostLimit = 5.0;
    const monthlyCostLimit = 50.0;

    const warnings: string[] = [];

    // Check daily limits
    const dailyPercentage = (dailyMetrics.totalTokens / dailyTokenLimit) * 100;
    if (dailyPercentage > 80) {
      warnings.push(`Daily token usage at ${Math.round(dailyPercentage)}%`);
    }

    if (dailyMetrics.totalCost > dailyCostLimit * 0.8) {
      warnings.push(`Daily cost approaching limit: $${dailyMetrics.totalCost.toFixed(2)}`);
    }

    // Check monthly limits
    const monthlyPercentage = (monthlyMetrics.totalTokens / monthlyTokenLimit) * 100;
    if (monthlyPercentage > 80) {
      warnings.push(`Monthly token usage at ${Math.round(monthlyPercentage)}%`);
    }

    if (monthlyMetrics.totalCost > monthlyCostLimit * 0.8) {
      warnings.push(`Monthly cost approaching limit: $${monthlyMetrics.totalCost.toFixed(2)}`);
    }

    return {
      warnings,
      limits: {
        daily: {
          used: dailyMetrics.totalTokens,
          limit: dailyTokenLimit,
          percentage: Math.round(dailyPercentage),
        },
        monthly: {
          used: monthlyMetrics.totalTokens,
          limit: monthlyTokenLimit,
          percentage: Math.round(monthlyPercentage),
        },
      },
    };
  }
}

// Singleton instance
let analyticsService: AIAnalyticsService | null = null;

export function getAnalyticsService(): AIAnalyticsService {
  if (!analyticsService) {
    analyticsService = new AIAnalyticsService();
  }
  return analyticsService;
}