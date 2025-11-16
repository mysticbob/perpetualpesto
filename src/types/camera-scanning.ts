/**
 * Camera Scanning Type Definitions
 *
 * Comprehensive TypeScript types for the multi-provider camera scanning system.
 * These types support A/B testing, evaluation, and provider abstraction.
 */

// ============================================================================
// Core Scanning Types
// ============================================================================

export type ScanMode = 'snapshot' | 'continuous';

export type ScanSessionStatus = 'in_progress' | 'completed' | 'cancelled';

export interface ScanSession {
  id: string;
  userId: string;
  mode: ScanMode;
  status: ScanSessionStatus;
  totalImages: number;
  totalItemsDetected: number;
  totalItemsConfirmed: number;
  totalCost: number;
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScanOptions {
  mode: ScanMode;
  extractNutrition?: boolean;
  extractExpiry?: boolean;
  confidenceThreshold?: number;
  maxItems?: number;
  provider?: string; // Specify provider or use auto-selection
}

export interface ScanResult {
  id: string;
  sessionId: string;
  userId: string;
  provider: string;
  imageHash?: string;
  imageSize?: number;
  detectedItems: DetectedItem[];
  rawResponse?: any;
  confidence?: number;
  processingTimeMs?: number;
  cost?: number;
  error?: string;
  success: boolean;
  scannedAt: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// Detected Item Types
// ============================================================================

export interface DetectedItem {
  name: string;
  category: ItemCategory;
  quantity: ItemQuantity;
  expiryDate?: Date | string;
  nutrition?: NutritionInfo;
  confidence: number;
  boundingBox?: BoundingBox;
  metadata?: {
    brand?: string;
    packageSize?: string;
    barcode?: string;
    imageRegion?: string;
  };
}

export type ItemCategory =
  | 'produce'
  | 'canned_goods'
  | 'condiments'
  | 'spices'
  | 'dairy'
  | 'frozen'
  | 'beverages'
  | 'snacks'
  | 'baking'
  | 'grains'
  | 'pasta'
  | 'sauces'
  | 'oils'
  | 'meat'
  | 'seafood'
  | 'bread'
  | 'cereal'
  | 'other';

export interface ItemQuantity {
  amount: number;
  unit: string;
  size?: string; // e.g., "24 oz", "1 L"
  estimatedFillLevel?: number; // 0.0 to 1.0 (0.5 = half full)
}

export interface NutritionInfo {
  servingSize?: string;
  servingsPerContainer?: number;
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  [key: string]: any; // Allow additional nutrition fields
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// Provider Abstraction
// ============================================================================

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

export interface ProviderScanResult {
  items: DetectedItem[];
  confidence: number;
  processingTime: number;
  cost: number;
  rawResponse?: any;
  metadata?: Record<string, any>;
}

export interface ProviderCapabilities {
  maxImageSize: number; // in bytes
  supportedFormats: string[]; // ['jpg', 'png', 'webp']
  supportsVideo: boolean;
  supportsBatch: boolean;
  supportsNutrition: boolean;
  supportsOCR: boolean;
  avgResponseTime: number; // in milliseconds
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute?: number;
  };
}

export interface ProviderConfig {
  name: string;
  apiKey: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
}

// ============================================================================
// A/B Testing Types
// ============================================================================

export interface ABTestConfig {
  enabled: boolean;
  weights: Record<string, number>; // provider name -> weight (0-1)
  assignmentStrategy: 'random' | 'user_level' | 'hybrid';
  minScansBeforeAssignment?: number;
}

export interface ProviderAssignment {
  userId: string;
  provider: string;
  assignedAt: Date;
  reason: 'random' | 'best_performer' | 'user_preference' | 'manual';
  metadata?: Record<string, any>;
}

// ============================================================================
// Performance Analytics Types
// ============================================================================

export interface ProviderPerformance {
  id: string;
  provider: string;
  userId?: string;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  periodStart: Date;
  periodEnd: Date;

  // Volume metrics
  totalScans: number;
  successfulScans: number;
  failedScans: number;

  // Accuracy metrics
  itemsDetected: number;
  itemsConfirmed: number;
  itemsRejected: number;
  itemsEdited: number;
  accuracyRate?: number;

  // Performance metrics
  avgConfidence?: number;
  avgProcessingTimeMs?: number;
  p50ProcessingTimeMs?: number;
  p95ProcessingTimeMs?: number;
  p99ProcessingTimeMs?: number;

  // Cost metrics
  totalCost: number;
  avgCostPerScan?: number;

  // User satisfaction
  thumbsUp: number;
  thumbsDown: number;
  satisfactionRate?: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderComparison {
  providers: ProviderPerformanceSummary[];
  timeRange: {
    start: Date;
    end: Date;
  };
  totalScans: number;
  totalCost: number;
}

export interface ProviderPerformanceSummary {
  provider: string;
  accuracy: number;
  avgConfidence: number;
  avgCost: number;
  avgLatency: number;
  successRate: number;
  satisfactionRate: number;
  totalScans: number;
  rank: number;
}

// ============================================================================
// Evaluation Framework Types
// ============================================================================

export interface ScanEvaluation {
  id: string;
  datasetName: string;
  imagePath: string;
  imageHash: string;
  groundTruth: GroundTruthItem[];
  difficulty?: 'easy' | 'medium' | 'hard';
  tags: string[];
  createdBy?: string;
  verified: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroundTruthItem {
  name: string;
  category: ItemCategory;
  quantity: ItemQuantity;
  expiryDate?: string;
  boundingBox?: BoundingBox;
  nutrition?: NutritionInfo;
}

export interface EvaluationResult {
  id: string;
  evaluationId: string;
  provider: string;
  scanResultId?: string;

  // Comparison metrics
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision?: number;
  recall?: number;
  f1Score?: number;

  // Item-level accuracy
  itemsCorrect: number;
  itemsIncorrect: number;
  itemAccuracy?: number;

  // Quantity estimation error
  quantityMAE?: number;

  // Performance
  processingTimeMs?: number;
  cost?: number;

  // Detailed results
  itemMatches?: ItemMatch[];
  confusionMatrix?: ConfusionMatrix;

  evaluatedAt: Date;
  metadata?: Record<string, any>;
}

export interface ItemMatch {
  predicted: DetectedItem;
  groundTruth?: GroundTruthItem;
  matchType: 'true_positive' | 'false_positive' | 'false_negative';
  similarity?: number;
  errors?: {
    nameMatch: boolean;
    categoryMatch: boolean;
    quantityError?: number;
  };
}

export interface ConfusionMatrix {
  matrix: Record<string, Record<string, number>>; // predicted -> actual -> count
  categories: string[];
}

export interface EvaluationDataset {
  name: string;
  description: string;
  evaluations: ScanEvaluation[];
  metadata?: {
    totalImages: number;
    createdDate: Date;
    version: string;
    tags: string[];
  };
}

export interface EvaluationReport {
  dataset: string;
  provider: string;
  overallMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    avgCost: number;
    avgLatency: number;
  };
  byDifficulty: Record<string, EvaluationMetrics>;
  byCategory: Record<string, EvaluationMetrics>;
  detailedResults: EvaluationResult[];
  generatedAt: Date;
}

export interface EvaluationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  sampleCount: number;
}

// ============================================================================
// Feedback Types
// ============================================================================

export type FeedbackType = 'thumbs_up' | 'thumbs_down' | 'correction';

export interface ScanFeedback {
  id: string;
  scanResultId: string;
  userId: string;
  feedbackType: FeedbackType;
  itemIndex?: number;
  incorrectValue?: Partial<DetectedItem>;
  correctValue?: Partial<DetectedItem>;
  comment?: string;
  createdAt: Date;
}

// ============================================================================
// Duplicate Detection Types
// ============================================================================

export interface DuplicateMatch {
  scannedItem: DetectedItem;
  existingItem: {
    id: string;
    name: string;
    amount: string;
    unit: string;
    category?: string;
    locationId: string;
  };
  similarity: number;
  suggestedAction: 'merge' | 'update_quantity' | 'add_new' | 'ignore';
  reason?: string;
}

export interface DuplicateDetectionOptions {
  threshold: number; // 0.0 to 1.0
  checkCategory: boolean;
  fuzzyMatch: boolean;
  checkLocation: boolean;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ScanImageRequest {
  image: string; // base64 encoded
  options: ScanOptions;
  sessionId?: string;
}

export interface ScanImageResponse {
  success: boolean;
  data?: {
    scanResult: ScanResult;
    duplicates?: DuplicateMatch[];
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

export interface AddScannedItemsRequest {
  scanResultId: string;
  items: {
    detectedItem: DetectedItem;
    locationId: string;
    userEdits?: Partial<DetectedItem>;
  }[];
}

export interface AddScannedItemsResponse {
  success: boolean;
  data?: {
    addedItems: Array<{
      id: string;
      name: string;
      wasEdited: boolean;
    }>;
    skippedDuplicates: number;
  };
  error?: {
    message: string;
    code: string;
  };
}

export interface GetProvidersResponse {
  providers: Array<{
    name: string;
    displayName: string;
    capabilities: ProviderCapabilities;
    estimatedCost: {
      perImage: number;
      per1000Images: number;
    };
    isAvailable: boolean;
  }>;
}

export interface GetProviderPerformanceRequest {
  provider?: string;
  userId?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  startDate?: Date;
  endDate?: Date;
}

export interface GetProviderPerformanceResponse {
  performance: ProviderPerformance[];
  comparison?: ProviderComparison;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number; // in bytes
  hash: string;
}

export interface ScanProgress {
  sessionId: string;
  status: 'capturing' | 'processing' | 'reviewing' | 'complete';
  currentStep: number;
  totalSteps: number;
  message: string;
}

export interface ProviderError {
  provider: string;
  errorType: 'rate_limit' | 'invalid_api_key' | 'network' | 'timeout' | 'unknown';
  message: string;
  retryable: boolean;
  retryAfter?: number; // seconds
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface CameraScanningComponentProps {
  onItemsScanned?: (items: DetectedItem[], scanResult: ScanResult) => void;
  onError?: (error: Error) => void;
  onSessionComplete?: (session: ScanSession) => void;
  mode?: ScanMode;
  defaultProvider?: string;
  showProviderSelector?: boolean;
  autoStart?: boolean;
}

export interface ScanResultsReviewProps {
  scanResult: ScanResult;
  existingPantryItems: Array<{
    id: string;
    name: string;
    amount: string;
    unit: string;
    category?: string;
    locationId: string;
  }>;
  onConfirm: (confirmedItems: DetectedItem[]) => void;
  onRescan: () => void;
  onCancel: () => void;
  onFeedback?: (feedback: Omit<ScanFeedback, 'id' | 'createdAt'>) => void;
}

export interface DetectedItemCardProps {
  item: DetectedItem;
  index: number;
  duplicateWarning?: DuplicateMatch;
  onEdit: (edited: DetectedItem) => void;
  onRemove: () => void;
  onToggleSelect?: (selected: boolean) => void;
  selected?: boolean;
}

export interface CameraControlsProps {
  isActive: boolean;
  mode: ScanMode;
  onCapture: () => void;
  onToggleMode: (mode: ScanMode) => void;
  onStart: () => void;
  onStop: () => void;
  isProcessing: boolean;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface CameraScanningConfig {
  providers: {
    enabled: string[];
    default: string;
    configs: Record<string, ProviderConfig>;
  };
  abTesting: ABTestConfig;
  duplicateDetection: DuplicateDetectionOptions;
  defaults: {
    confidenceThreshold: number;
    extractNutrition: boolean;
    extractExpiry: boolean;
    maxImageSize: number;
    imageQuality: number;
  };
  evaluation: {
    datasetPath: string;
    minAccuracy: number;
    runOnDeploy: boolean;
  };
}

// ============================================================================
// Export everything
// ============================================================================

export type {
  // Re-export all types for convenience
};
