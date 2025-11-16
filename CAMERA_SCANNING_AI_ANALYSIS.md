# Camera Scanning AI Provider Analysis & Implementation Plan

> **Project:** PerpetualPesto Camera/Video Scanning for Pantry Items
> **Date:** 2025-11-16
> **Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [AI Provider Comparison](#ai-provider-comparison)
3. [Cost Analysis](#cost-analysis)
4. [Accuracy & Performance Benchmarks](#accuracy--performance-benchmarks)
5. [Implementation Architecture](#implementation-architecture)
6. [Evaluation Framework Analysis](#evaluation-framework-analysis)
7. [Component Design Specifications](#component-design-specifications)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Dataset Creation Strategy](#dataset-creation-strategy)
10. [Risk Mitigation](#risk-mitigation)

---

## Executive Summary

### Objective
Build a camera/video scanning component that allows users to scan pantry items (spices, groceries, etc.) and automatically categorize and input them into the PerpetualPesto system. The solution will support A/B testing across multiple AI providers to determine optimal cost/accuracy tradeoffs.

### Key Requirements
- **Scanning Modes:** Snapshot-based (Phase 1), real-time continuous (Phase 2)
- **Item Detection:** Single and multiple items per frame
- **Data Extraction:** Item names, quantities/amounts, expiration dates, nutritional info
- **Target Accuracy:** 90%+ item recognition
- **Privacy:** No long-term image storage
- **Integration:** Confirmation phase before adding to pantry/fridge
- **Duplicate Detection:** Required

### Recommended Provider Portfolio (6 providers across spectrum)

| Tier | Provider | Primary Use Case | Est. Cost/1k Images |
|------|----------|------------------|---------------------|
| **Premium** | OpenAI GPT-4 Vision | Baseline (already integrated) | $5.00 - $10.00 |
| **Premium** | Anthropic Claude 3.5 Sonnet | Structured output, high accuracy | $3.00 - $6.00 |
| **Mid-Range** | Google Gemini 1.5 Pro | Balanced quality/cost | $1.50 - $3.75 |
| **Mid-Range** | Azure Computer Vision | Enterprise, object detection | $1.00 - $2.00 |
| **Budget** | Google Gemini 1.5 Flash | High-speed, low-cost | $0.075 - $0.30 |
| **Specialized** | Clarifai Food Model | Purpose-built food recognition | $1.20 - $2.40 |

**Total Testing Budget Estimate:** $300-500/month for initial A/B testing phase (assuming 30-50k test images)

---

## AI Provider Comparison

### 1. OpenAI GPT-4 Vision (Already Integrated)

**Pros:**
- Already integrated in codebase (`/src/server/services/ai/openai.service.ts`)
- Excellent at understanding context and complex scenes
- Strong structured output with function calling
- Good at inferring quantities and estimations

**Cons:**
- Higher cost ($0.01275/image for standard quality, detail=auto)
- Rate limits can be restrictive (500 RPM on tier 1)
- Slower response times (2-5 seconds)

**Cost Breakdown:**
```
Standard Quality (1024x1024 or smaller):
- Input: 1105 tokens @ $0.0025/1k = $0.00276
- Output: ~500 tokens @ $0.01/1k = $0.005
- Total: ~$0.00776 per image
- Detail mode adds ~$0.005 more = ~$0.01275/image

Per 1,000 scans: $12.75
Per 10,000 scans: $127.50
Per 100,000 scans: $1,275
```

**Best For:** Complex multi-item scenes, detailed descriptions, baseline comparison

---

### 2. Anthropic Claude 3.5 Sonnet

**Pros:**
- Excellent structured output capabilities
- Strong at following complex instructions
- Competitive pricing
- Good context understanding
- Higher rate limits (50 req/min, 40k tokens/min)

**Cons:**
- No native vision in older versions (Sonnet 3.5 supports vision)
- Slightly slower than Gemini Flash
- May require more prompt engineering

**Cost Breakdown:**
```
Vision (Images up to 1600x1600):
- Input: ~1600 tokens @ $0.003/1k = $0.0048
- Output: ~500 tokens @ $0.015/1k = $0.0075
- Total: ~$0.01230 per image

Per 1,000 scans: $12.30
Per 10,000 scans: $123.00
Per 100,000 scans: $1,230
```

**Best For:** Structured extraction, detailed analysis, high accuracy requirements

---

### 3. Google Gemini 1.5 Pro

**Pros:**
- Excellent vision capabilities
- Good balance of cost and performance
- Large context window (1M tokens)
- Can process video directly (for future continuous scanning)
- Fast response times (1-3 seconds)

**Cons:**
- Structured output less mature than OpenAI
- May require more post-processing
- Rate limits vary by region

**Cost Breakdown:**
```
Gemini 1.5 Pro (Images):
- Input: $0.00125/image (< 128k tokens)
- Output: $0.00375/1k tokens
- Avg total: ~$0.003 per image (with 500 token output)

Per 1,000 scans: $3.00
Per 10,000 scans: $30.00
Per 100,000 scans: $300
```

**Best For:** High-volume scanning, video processing (future), cost efficiency

---

### 4. Google Gemini 1.5 Flash

**Pros:**
- Extremely fast (< 1 second response)
- Very low cost
- Good for high-volume scenarios
- Same API as Pro (easy to switch)

**Cons:**
- Lower accuracy than Pro
- May struggle with complex scenes
- Less detailed descriptions

**Cost Breakdown:**
```
Gemini 1.5 Flash (Images):
- Input: $0.00001875/image (< 128k tokens)
- Output: $0.000075/1k tokens
- Avg total: ~$0.00006 per image

Per 1,000 scans: $0.06
Per 10,000 scans: $0.60
Per 100,000 scans: $6.00
```

**Best For:** High-volume basic scanning, real-time continuous scanning, cost-sensitive scenarios

---

### 5. Azure Computer Vision 4.0

**Pros:**
- Purpose-built for object detection
- Includes nutrition facts OCR
- Good enterprise support
- Pre-trained on grocery/retail items
- Can detect expiration dates via OCR

**Cons:**
- Less flexible than LLM-based vision
- Requires combining multiple APIs (Vision + OCR)
- May need custom training for specific items
- More complex integration

**Cost Breakdown:**
```
Azure Computer Vision (S1 tier):
- Image Analysis: $1.00/1k transactions
- OCR (Read API): $1.50/1k transactions
- Combined: ~$2.00/1k images (if using both)

Per 1,000 scans: $2.00
Per 10,000 scans: $20.00
Per 100,000 scans: $200
```

**Best For:** OCR of labels/dates, structured product detection, enterprise deployments

---

### 6. Clarifai Food Model (Specialized)

**Pros:**
- Purpose-built for food recognition
- Pre-trained on extensive food dataset
- Good at identifying specific food items
- Fast inference
- Can detect ingredients and nutrition

**Cons:**
- Less flexible for non-food items (packaging, brands)
- Requires separate API integration
- May not handle quantities well
- Limited to food domain

**Cost Breakdown:**
```
Clarifai Food Recognition:
- Operations: $1.20/1k predictions (base)
- Custom training: additional costs
- Avg: ~$2.40/1k images (with enhancements)

Per 1,000 scans: $2.40
Per 10,000 scans: $24.00
Per 100,000 scans: $240
```

**Best For:** Pure food/ingredient recognition, specialized accuracy for food items

---

### 7. AWS Rekognition + Bedrock (Optional 7th)

**Pros:**
- Integrated with AWS ecosystem
- Custom Labels for training on your data
- Bedrock provides access to multiple models (Claude, etc.)
- Good for object detection and text extraction

**Cons:**
- More complex setup
- Higher learning curve
- Bedrock pricing can be complex

**Cost Breakdown:**
```
AWS Rekognition:
- Image analysis: $1.00/1k images (first 1M/month)
- Custom Labels: $4.00/training hour + $4.00/inference hour

Bedrock (Claude 3.5 Sonnet):
- Similar to direct Anthropic pricing
- Additional AWS overhead

Avg: ~$2.00/1k images (Rekognition only)
```

**Best For:** AWS-native deployments, custom model training, hybrid approaches

---

## Cost Analysis

### Scenario Planning

#### Scenario 1: Small User Base (100 users, 10 scans/user/month)
**Total Monthly Scans:** 1,000

| Provider | Monthly Cost | Annual Cost |
|----------|-------------|-------------|
| Gemini Flash | $0.06 | $0.72 |
| Gemini Pro | $3.00 | $36.00 |
| Azure CV | $2.00 | $24.00 |
| Clarifai | $2.40 | $28.80 |
| Claude 3.5 | $12.30 | $147.60 |
| GPT-4 Vision | $12.75 | $153.00 |

**Recommendation:** Any provider viable, use premium for best UX

---

#### Scenario 2: Medium User Base (1,000 users, 20 scans/user/month)
**Total Monthly Scans:** 20,000

| Provider | Monthly Cost | Annual Cost |
|----------|-------------|-------------|
| Gemini Flash | $1.20 | $14.40 |
| Gemini Pro | $60.00 | $720.00 |
| Azure CV | $40.00 | $480.00 |
| Clarifai | $48.00 | $576.00 |
| Claude 3.5 | $246.00 | $2,952.00 |
| GPT-4 Vision | $255.00 | $3,060.00 |

**Recommendation:** Gemini Pro or Azure CV for balance, Flash for budget-conscious

---

#### Scenario 3: Large User Base (10,000 users, 30 scans/user/month)
**Total Monthly Scans:** 300,000

| Provider | Monthly Cost | Annual Cost |
|----------|-------------|-------------|
| Gemini Flash | $18.00 | $216.00 |
| Gemini Pro | $900.00 | $10,800.00 |
| Azure CV | $600.00 | $7,200.00 |
| Clarifai | $720.00 | $8,640.00 |
| Claude 3.5 | $3,690.00 | $44,280.00 |
| GPT-4 Vision | $3,825.00 | $45,900.00 |

**Recommendation:** Strong case for Gemini Flash or hybrid approach (Flash for initial scan, Pro/Claude for complex cases)

---

### Hybrid Strategy (Cost Optimization)

**Intelligent Routing:**
1. **First Pass:** Gemini Flash ($0.06/1k) - fast, cheap detection
2. **Confidence Check:** If confidence < 85%, route to:
   - **Second Pass:** Gemini Pro ($3/1k) or Claude 3.5 ($12.30/1k)
3. **User Confirmation:** Always show results for user validation

**Example Cost Calculation:**
- 70% of scans resolved by Flash: 70,000 × $0.00006 = $4.20
- 30% require Pro: 30,000 × $0.003 = $90.00
- **Total for 100k scans:** $94.20 vs $300 (all Pro) or $1,275 (all GPT-4)
- **Savings:** 69% vs Pro, 93% vs GPT-4

---

## Accuracy & Performance Benchmarks

### Expected Accuracy by Provider (Based on Industry Benchmarks)

| Provider | Single Item Accuracy | Multi-Item Detection | Quantity Estimation | Expiry Date OCR | Speed |
|----------|---------------------|----------------------|---------------------|-----------------|-------|
| GPT-4 Vision | 95-98% | 90-95% | 85-90% | 80-85% | 2-5s |
| Claude 3.5 Sonnet | 94-97% | 88-93% | 83-88% | 78-83% | 2-4s |
| Gemini 1.5 Pro | 92-96% | 85-92% | 80-87% | 75-82% | 1-3s |
| Gemini 1.5 Flash | 88-93% | 78-85% | 70-80% | 65-75% | 0.5-1s |
| Azure CV | 90-94% | 82-88% | N/A (separate) | 85-92% (OCR) | 1-2s |
| Clarifai Food | 93-96% (food only) | 80-87% | 65-75% | N/A | 1-2s |

### Key Accuracy Factors

1. **Image Quality:**
   - Well-lit, clear images: +10-15% accuracy
   - Poor lighting/blur: -20-30% accuracy
   - Optimal resolution: 1024x1024 to 1600x1600

2. **Scene Complexity:**
   - Single item, clear background: 95%+ accuracy
   - Multiple items (3-5): 85-90% accuracy
   - Crowded shelf (10+): 70-80% accuracy

3. **Item Type:**
   - Branded packages: 95%+ (OCR + image recognition)
   - Loose produce: 75-85% (visual only)
   - Spices in generic jars: 60-70% (harder to identify)

4. **Quantity/Amount Estimation:**
   - Whole packages: 90%+ (count + read label)
   - Partial containers: 60-75% (visual estimation)
   - Requires good prompt engineering and examples

---

## Implementation Architecture

### System Architecture for Multi-Provider A/B Testing

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Chakra)               │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐    │
│  │  CameraScanningComponent (New)                      │    │
│  │  - Snapshot Mode                                    │    │
│  │  - Continuous Mode (Phase 2)                        │    │
│  │  - Provider Selection (A/B Test UI)                 │    │
│  │  - Preview & Confirmation                           │    │
│  └────────────────────────────────────────────────────┘    │
│                         ↓                                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  ScanResultsReviewComponent                         │    │
│  │  - Show detected items                              │    │
│  │  - Edit quantities/names                            │    │
│  │  - Duplicate detection warnings                     │    │
│  │  - Confidence scores                                │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  API Layer (Hono Backend)                   │
├─────────────────────────────────────────────────────────────┤
│  POST /api/ai/scan                                          │
│  - Accepts: image, provider, mode                           │
│  - Returns: detected items, confidence, metadata            │
│                                                              │
│  POST /api/ai/scan/batch                                    │
│  - Multiple images or video frames                          │
│                                                              │
│  GET /api/ai/providers                                      │
│  - List available providers & costs                         │
│                                                              │
│  POST /api/pantry/add-scanned-items                        │
│  - Add confirmed items to pantry                            │
│  - Duplicate detection                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Vision Service Abstraction Layer               │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐      │
│  │  VisionServiceFactory                             │      │
│  │  - getProvider(name: string): VisionProvider     │      │
│  │  - getAllProviders(): VisionProvider[]           │      │
│  └──────────────────────────────────────────────────┘      │
│                         ↓                                    │
│  ┌──────────────────────────────────────────────────┐      │
│  │  interface VisionProvider {                       │      │
│  │    name: string                                   │      │
│  │    scanImage(image, options): ScanResult         │      │
│  │    getCostEstimate(): number                      │      │
│  │    getCapabilities(): Capabilities                │      │
│  │  }                                                │      │
│  └──────────────────────────────────────────────────┘      │
│                         ↓                                    │
│  ├─────────────┬──────────────┬──────────────┬─────────┤  │
│  │   OpenAI    │   Anthropic  │    Google    │  Azure  │  │
│  │   Provider  │   Provider   │   Provider   │Provider │  │
│  └─────────────┴──────────────┴──────────────┴─────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                Database (PostgreSQL + Prisma)               │
├─────────────────────────────────────────────────────────────┤
│  New Tables:                                                │
│  - ScanSession (track scanning sessions)                    │
│  - ScanResult (individual scan results)                     │
│  - ProviderPerformance (accuracy, cost, speed metrics)     │
│  - ScanEvaluation (ground truth for testing)               │
│                                                              │
│  Enhanced Tables:                                           │
│  - PantryItem (add scanSessionId, confidence)              │
│  - AIImageAnalysis (add provider, performance metrics)     │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

#### 1. Provider Abstraction Layer
**Purpose:** Enable easy A/B testing and provider switching

```typescript
interface VisionProvider {
  name: string;
  version: string;

  scanImage(
    image: Buffer | string,
    options: ScanOptions
  ): Promise<ScanResult>;

  getCostEstimate(imageSize: number): number;

  getCapabilities(): {
    maxImageSize: number;
    supportsVideo: boolean;
    supportsBatch: boolean;
    avgResponseTime: number;
  };
}

interface ScanOptions {
  mode: 'single' | 'multi' | 'continuous';
  extractNutrition: boolean;
  extractExpiry: boolean;
  confidenceThreshold: number;
}

interface ScanResult {
  items: DetectedItem[];
  provider: string;
  confidence: number;
  processingTime: number;
  cost: number;
  metadata: {
    imageSize: number;
    timestamp: Date;
    sessionId: string;
  };
}

interface DetectedItem {
  name: string;
  category: string;
  quantity: {
    amount: number;
    unit: string;
    estimatedFillLevel?: number; // 0-1 (0.5 = half full)
  };
  expiryDate?: Date;
  nutrition?: NutritionInfo;
  confidence: number;
  boundingBox?: { x: number; y: number; w: number; h: number };
}
```

#### 2. A/B Testing Strategy

**Option A: User-Level Assignment**
- Each user assigned to primary provider
- Can manually test others
- Tracked in user preferences

**Option B: Request-Level Random Assignment**
- Each scan randomly assigned (with weighting)
- Better statistical distribution
- More data faster

**Option C: Hybrid (Recommended)**
- New users: random assignment for first 10 scans
- Then: assign to best-performing provider for their use case
- Allow manual override in settings

**Implementation:**
```typescript
async function selectProvider(
  userId: string,
  scanContext: ScanContext
): Promise<VisionProvider> {
  // Check if user has manual preference
  const userPref = await getUserProviderPreference(userId);
  if (userPref) return getProvider(userPref);

  // Get user's scan history
  const scanCount = await getUserScanCount(userId);

  // First 10 scans: A/B test
  if (scanCount < 10) {
    return getRandomProvider(AB_TEST_WEIGHTS);
  }

  // After 10: use best performer for this user
  const bestProvider = await getBestProviderForUser(userId);
  return getProvider(bestProvider);
}

const AB_TEST_WEIGHTS = {
  'gpt-4-vision': 0.20,      // 20%
  'claude-3.5-sonnet': 0.20, // 20%
  'gemini-1.5-pro': 0.25,    // 25%
  'gemini-1.5-flash': 0.20,  // 20%
  'azure-cv': 0.10,          // 10%
  'clarifai-food': 0.05      // 5%
};
```

#### 3. Duplicate Detection Strategy

```typescript
async function detectDuplicates(
  scannedItems: DetectedItem[],
  userId: string
): Promise<DuplicateMatch[]> {
  const existingItems = await getPantryItems(userId);
  const duplicates: DuplicateMatch[] = [];

  for (const scanned of scannedItems) {
    for (const existing of existingItems) {
      const similarity = calculateSimilarity(scanned, existing);

      if (similarity > 0.85) {
        duplicates.push({
          scannedItem: scanned,
          existingItem: existing,
          similarity,
          action: 'merge' | 'update' | 'add_new'
        });
      }
    }
  }

  return duplicates;
}

function calculateSimilarity(
  item1: DetectedItem,
  item2: PantryItem
): number {
  // Fuzzy name matching
  const nameSim = fuzzyMatch(item1.name, item2.name);

  // Category matching
  const categorySim = item1.category === item2.category ? 1 : 0;

  // Weighted score
  return nameSim * 0.7 + categorySim * 0.3;
}
```

---

## Evaluation Framework Analysis

### Option 1: promptfoo (Already Integrated)

**Pros:**
- Already in your codebase (`promptfoo.config.yaml`)
- Purpose-built for LLM evaluation
- Supports multiple providers
- Good for prompt engineering
- Version control friendly (YAML configs)
- CI/CD integration

**Cons:**
- Primarily text-focused (vision is newer)
- Limited built-in vision metrics
- Requires custom assertion functions for images
- May need extensions for complex image scenarios

**Recommended Usage:**
✅ Use for: Prompt optimization, provider comparison, regression testing
❌ Not ideal for: Complex object detection metrics, spatial accuracy

**Example promptfoo Config:**
```yaml
# promptfoo.config.yaml extension for camera scanning

providers:
  - id: openai:gpt-4-vision-preview
    config:
      temperature: 0
      max_tokens: 1000
  - id: anthropic:claude-3-5-sonnet-20241022
    config:
      temperature: 0
      max_tokens: 1000
  - id: vertex:gemini-1.5-pro
    config:
      temperature: 0

prompts:
  - file://prompts/scan_single_item.txt
  - file://prompts/scan_multi_item.txt
  - file://prompts/scan_with_quantities.txt

tests:
  - description: "Single item - branded package"
    vars:
      image: file://test-images/single-heinz-ketchup.jpg
    assert:
      - type: javascript
        value: |
          output.items.length === 1 &&
          output.items[0].name.toLowerCase().includes('ketchup') &&
          output.items[0].confidence > 0.9
      - type: cost
        threshold: 0.02  # Max $0.02 per scan

  - description: "Multiple items - pantry shelf"
    vars:
      image: file://test-images/pantry-shelf-5-items.jpg
    assert:
      - type: javascript
        value: |
          output.items.length >= 4 && output.items.length <= 6 // Allow ±1 item
      - type: is-json
      - type: javascript
        value: output.items.every(item => item.confidence > 0.75)

  - description: "Quantity estimation - half-full jar"
    vars:
      image: file://test-images/half-full-peanut-butter.jpg
    assert:
      - type: javascript
        value: |
          const item = output.items[0];
          item.quantity.estimatedFillLevel >= 0.4 &&
          item.quantity.estimatedFillLevel <= 0.6

outputPath: ./test-results/vision-evals.json
```

---

### Option 2: Custom Evaluation Framework

**Pros:**
- Full control over metrics
- Domain-specific (food/pantry focus)
- Can integrate computer vision metrics (IoU, mAP)
- Better for spatial accuracy
- Direct database integration

**Cons:**
- More development effort
- Maintenance burden
- Reinventing the wheel

**Recommended Implementation:**
```typescript
// src/server/services/evaluation/vision-evaluator.ts

interface EvaluationDataset {
  id: string;
  images: Array<{
    path: string;
    groundTruth: GroundTruth;
  }>;
}

interface GroundTruth {
  items: Array<{
    name: string;
    category: string;
    quantity: { amount: number; unit: string };
    boundingBox?: BoundingBox;
  }>;
}

interface EvaluationMetrics {
  accuracy: number;           // % items correctly identified
  precision: number;          // TP / (TP + FP)
  recall: number;             // TP / (TP + FN)
  f1Score: number;           // Harmonic mean of precision/recall
  quantityMAE: number;       // Mean absolute error for quantities
  avgConfidence: number;     // Average confidence score
  avgCost: number;           // Average cost per image
  avgLatency: number;        // Average response time
  confusionMatrix: Map<string, Map<string, number>>;
}

class VisionEvaluator {
  async evaluate(
    provider: VisionProvider,
    dataset: EvaluationDataset
  ): Promise<EvaluationMetrics> {
    const results = [];

    for (const sample of dataset.images) {
      const startTime = Date.now();
      const scanResult = await provider.scanImage(sample.path);
      const endTime = Date.now();

      const comparison = this.compareResults(
        scanResult.items,
        sample.groundTruth.items
      );

      results.push({
        ...comparison,
        cost: scanResult.cost,
        latency: endTime - startTime
      });
    }

    return this.aggregateMetrics(results);
  }

  private compareResults(
    predicted: DetectedItem[],
    groundTruth: GroundTruthItem[]
  ): ComparisonResult {
    // Match predicted items to ground truth
    const matches = this.matchItems(predicted, groundTruth);

    const truePositives = matches.filter(m => m.isCorrect).length;
    const falsePositives = predicted.length - truePositives;
    const falseNegatives = groundTruth.length - truePositives;

    return {
      truePositives,
      falsePositives,
      falseNegatives,
      quantityErrors: this.calculateQuantityErrors(matches)
    };
  }

  private matchItems(
    predicted: DetectedItem[],
    groundTruth: GroundTruthItem[]
  ): ItemMatch[] {
    // Hungarian algorithm or greedy matching
    // Based on name similarity + bounding box IoU (if available)
    // ...
  }
}
```

---

### Option 3: Hybrid Approach (Recommended)

**Strategy:**
1. **promptfoo** for prompt engineering and quick iterations
2. **Custom metrics** for detailed analysis and reporting
3. **Database tracking** for production monitoring

**Workflow:**
```
Development → promptfoo (fast iteration)
       ↓
Testing → Custom evaluator (detailed metrics)
       ↓
Production → Database analytics (real-world performance)
```

**Benefits:**
- Fast development cycle with promptfoo
- Comprehensive evaluation with custom metrics
- Real-world monitoring in production

---

### Option 4: Other Tools to Consider

#### LangSmith (LangChain)
**Pros:** Great observability, tracing, datasets
**Cons:** Requires LangChain adoption, additional cost
**Verdict:** Overkill for this use case

#### Weights & Biases (W&B)
**Pros:** Excellent for ML experiments, visualization
**Cons:** Heavy for simple A/B testing, learning curve
**Verdict:** Consider for advanced ML model training

#### Evidently AI
**Pros:** Good for production monitoring, drift detection
**Cons:** More for ML model monitoring than vision API testing
**Verdict:** Useful for production phase

#### Roboflow (For computer vision datasets)
**Pros:** Great for creating annotated datasets, labeling tools
**Cons:** More for training custom models
**Verdict:** ✅ Recommended for dataset creation phase

---

### Recommended Evaluation Stack

```
┌────────────────────────────────────────┐
│  Development & Prompt Engineering      │
│  → promptfoo                            │
└────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│  Dataset Creation & Annotation         │
│  → Roboflow (for labeling)             │
│  → Custom scripts (for export)         │
└────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│  Detailed Testing & Metrics            │
│  → Custom VisionEvaluator              │
│  → Store results in PostgreSQL         │
└────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│  Production Monitoring                 │
│  → Database analytics                  │
│  → Real user feedback                  │
│  → A/B test results                    │
└────────────────────────────────────────┘
```

---

## Component Design Specifications

### Component Hierarchy

```
<CameraScanningPage>
  └─ <CameraScanningComponent>
      ├─ <CameraSelector> (select device camera)
      ├─ <CameraFeed> (live preview)
      ├─ <CaptureControls>
      │   ├─ <SnapshotButton>
      │   ├─ <ContinuousScanToggle> (Phase 2)
      │   └─ <ProviderSelector> (for testing)
      └─ <ScanResults>
          ├─ <LoadingIndicator>
          └─ <ScanResultsReview>
              ├─ <DetectedItemsList>
              │   └─ <DetectedItemCard>
              │       ├─ <ItemImage>
              │       ├─ <ItemDetails>
              │       ├─ <QuantityEditor>
              │       ├─ <ConfidenceScore>
              │       └─ <DuplicateWarning>
              ├─ <BatchActions>
              └─ <ConfirmButton>
```

### Component Specifications

#### 1. `CameraScanningComponent`

**File:** `/src/components/scanning/CameraScanningComponent.tsx`

**Props:**
```typescript
interface CameraScanningComponentProps {
  onItemsScanned: (items: DetectedItem[]) => void;
  onError: (error: Error) => void;
  mode?: 'snapshot' | 'continuous';
  defaultProvider?: string;
  showProviderSelector?: boolean; // For A/B testing UI
}
```

**State:**
```typescript
interface CameraScanningState {
  cameraActive: boolean;
  selectedCamera: MediaDeviceInfo | null;
  capturedImage: string | null;
  isScanning: boolean;
  scanResults: ScanResult | null;
  selectedProvider: string;
  error: string | null;
}
```

**Key Methods:**
- `startCamera()` - Initialize camera feed
- `stopCamera()` - Clean up camera resources
- `captureSnapshot()` - Capture single frame
- `sendToProvider()` - Send image to selected provider
- `handleResults()` - Process and display results

---

#### 2. `ScanResultsReview`

**File:** `/src/components/scanning/ScanResultsReview.tsx`

**Props:**
```typescript
interface ScanResultsReviewProps {
  scanResult: ScanResult;
  existingPantryItems: PantryItem[];
  onConfirm: (confirmedItems: DetectedItem[]) => void;
  onRescan: () => void;
  onCancel: () => void;
}
```

**Features:**
- Edit item names and quantities
- Adjust confidence thresholds
- View/resolve duplicate warnings
- Add missing items manually
- Remove false positives

**UI Layout:**
```
┌─────────────────────────────────────────┐
│  Scan Results (5 items detected)        │
│  Provider: Gemini Pro | Time: 1.2s      │
│  Cost: $0.003 | Avg Confidence: 89%     │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐ │
│  │ ✓ Heinz Ketchup                   │ │
│  │   1 bottle (24 oz) - 50% full     │ │
│  │   Confidence: 95% 🟢               │ │
│  │   ⚠️  Similar item in pantry       │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │ ✓ Morton Salt                     │ │
│  │   1 container (26 oz) - Full      │ │
│  │   Confidence: 92% 🟢               │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │ ? Spice Jar                       │ │
│  │   1 jar - Full                    │ │
│  │   Confidence: 68% 🟡               │ │
│  │   [Edit Name] [Remove]            │ │
│  └───────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  [Rescan] [Add to Pantry] [Cancel]    │
└─────────────────────────────────────────┘
```

---

#### 3. `DetectedItemCard`

**File:** `/src/components/scanning/DetectedItemCard.tsx`

**Props:**
```typescript
interface DetectedItemCardProps {
  item: DetectedItem;
  duplicateWarning?: DuplicateMatch;
  onEdit: (edited: DetectedItem) => void;
  onRemove: () => void;
}
```

**Features:**
- Inline editing for all fields
- Confidence score visualization
- Duplicate merge UI
- Category selector
- Quantity adjustment

---

## Implementation Roadmap

### Phase 0: Preparation (Week 1)
**Goal:** Set up infrastructure and tooling

- [ ] Database schema updates
  - [ ] Create `ScanSession` table
  - [ ] Create `ScanResult` table
  - [ ] Create `ProviderPerformance` table
  - [ ] Update `PantryItem` with scan metadata
- [ ] Set up provider abstraction layer
  - [ ] Define interfaces
  - [ ] Implement factory pattern
- [ ] Configure API keys for all providers
  - [ ] OpenAI (already done)
  - [ ] Anthropic
  - [ ] Google (Gemini)
  - [ ] Azure
  - [ ] Clarifai
- [ ] Set up promptfoo extensions for vision
- [ ] Create initial test image dataset (20-30 images)

**Deliverables:**
- Database migrations
- Provider abstraction code
- API configuration
- Initial test dataset

---

### Phase 1: Single Provider Implementation (Week 2-3)
**Goal:** Build core scanning functionality with one provider

- [ ] Implement Gemini 1.5 Pro provider (good balance)
  - [ ] `GeminiVisionProvider` class
  - [ ] Prompt engineering for pantry scanning
  - [ ] Response parsing and normalization
- [ ] Build `CameraScanningComponent`
  - [ ] Camera access and preview
  - [ ] Snapshot capture
  - [ ] Image optimization (resize, compress)
- [ ] Build `ScanResultsReview` component
  - [ ] Display detected items
  - [ ] Edit functionality
  - [ ] Basic duplicate detection
- [ ] API endpoints
  - [ ] POST `/api/ai/scan`
  - [ ] POST `/api/pantry/add-scanned-items`
- [ ] Testing
  - [ ] Unit tests for provider
  - [ ] Integration tests for API
  - [ ] E2E test for full flow

**Success Criteria:**
- Users can scan single/multi-item images
- Accuracy > 85% on test dataset
- Results editable before adding to pantry

---

### Phase 2: Multi-Provider Implementation (Week 4-5)
**Goal:** Add all 6 providers and A/B testing infrastructure

- [ ] Implement remaining providers
  - [ ] `OpenAIVisionProvider` (enhance existing)
  - [ ] `ClaudeVisionProvider`
  - [ ] `GeminiFlashProvider`
  - [ ] `AzureVisionProvider`
  - [ ] `ClarifaiProvider`
- [ ] A/B testing logic
  - [ ] Provider selection algorithm
  - [ ] Random assignment for new users
  - [ ] Performance tracking
- [ ] Provider selector UI (for manual testing)
- [ ] Cost tracking and analytics
  - [ ] Log costs per scan
  - [ ] Provider cost comparison dashboard
- [ ] Testing
  - [ ] Test all providers with same images
  - [ ] Validate response normalization
  - [ ] Cost calculation verification

**Success Criteria:**
- All 6 providers functional
- A/B test assignments working
- Cost tracking accurate

---

### Phase 3: Evaluation & Optimization (Week 6-7)
**Goal:** Build comprehensive evaluation framework

- [ ] Create labeled dataset (100+ images)
  - [ ] Use Roboflow for annotation
  - [ ] Cover diverse scenarios (single, multi, produce, packages)
  - [ ] Include edge cases (poor lighting, blur, unusual items)
- [ ] Implement custom evaluation framework
  - [ ] `VisionEvaluator` class
  - [ ] Accuracy, precision, recall metrics
  - [ ] Quantity estimation error metrics
  - [ ] Cost and latency tracking
- [ ] Extend promptfoo configuration
  - [ ] Test cases for all scenarios
  - [ ] Provider comparison reports
  - [ ] Regression test suite
- [ ] Run comprehensive evaluation
  - [ ] Test all providers on full dataset
  - [ ] Generate comparison reports
  - [ ] Identify best providers per scenario
- [ ] Optimize prompts and parameters
  - [ ] Tune confidence thresholds
  - [ ] Improve quantity estimation prompts
  - [ ] Category mapping refinement

**Success Criteria:**
- Evaluation framework producing reliable metrics
- Clear data on provider performance
- Recommendations for production defaults

---

### Phase 4: Advanced Features (Week 8-9)
**Goal:** Continuous scanning, smart routing, duplicate detection

- [ ] Continuous scanning mode
  - [ ] Video frame sampling
  - [ ] Debouncing logic (avoid duplicate detections)
  - [ ] Progress indicator
- [ ] Smart provider routing
  - [ ] Confidence-based fallback
  - [ ] Hybrid approach (Flash → Pro)
  - [ ] Cost optimization logic
- [ ] Enhanced duplicate detection
  - [ ] Fuzzy matching improvements
  - [ ] Merge suggestions
  - [ ] Update existing item quantities
- [ ] Nutrition lookup integration
  - [ ] Fallback to nutrition API if not detected
  - [ ] Cache common items
- [ ] Expiry date inference
  - [ ] Backend logic for typical shelf life
  - [ ] Confidence scoring

**Success Criteria:**
- Continuous scanning smooth and responsive
- Smart routing reduces costs by 50%+
- Duplicate detection > 90% accuracy

---

### Phase 5: Production & Monitoring (Week 10+)
**Goal:** Deploy to production and monitor performance

- [ ] Production deployment
  - [ ] Feature flag for gradual rollout
  - [ ] Performance monitoring
  - [ ] Error tracking (Sentry/similar)
- [ ] User feedback collection
  - [ ] Thumbs up/down on scan results
  - [ ] Report incorrect items
  - [ ] Ground truth collection
- [ ] Analytics dashboard
  - [ ] Provider performance over time
  - [ ] Cost trends
  - [ ] User satisfaction scores
  - [ ] Accuracy metrics by provider
- [ ] Continuous improvement
  - [ ] Weekly provider performance reviews
  - [ ] Dataset expansion with real user images (with consent)
  - [ ] Prompt refinement based on failures
- [ ] Documentation
  - [ ] User guide
  - [ ] API documentation
  - [ ] Provider selection guide

**Success Criteria:**
- Production accuracy > 90%
- User satisfaction > 4/5
- Cost per scan < $0.01 (avg)

---

## Dataset Creation Strategy

### Phase 1: Manual Dataset (Week 1)
**Size:** 50 images
**Method:** Team members take photos

**Categories:**
- Single items (20 images)
  - Branded packages (10)
  - Produce (5)
  - Spices/generics (5)
- Multiple items (20 images)
  - 2-3 items (10)
  - 5+ items (shelf view) (10)
- Edge cases (10 images)
  - Poor lighting
  - Blurry
  - Partial containers
  - Unusual angles

**Annotation:**
- Use Roboflow for bounding boxes
- JSON ground truth files
```json
{
  "image": "pantry_shelf_01.jpg",
  "items": [
    {
      "name": "Heinz Ketchup",
      "category": "condiments",
      "quantity": {
        "amount": 1,
        "unit": "bottle",
        "size": "24 oz",
        "fillLevel": 0.5
      },
      "boundingBox": { "x": 100, "y": 150, "w": 80, "h": 200 }
    }
  ]
}
```

---

### Phase 2: Augmented Dataset (Week 3)
**Size:** 200 images
**Method:** Augmentation + more manual photos

**Augmentation Techniques:**
- Brightness adjustments (±30%)
- Rotation (±15°)
- Blur simulation
- Crop variations

**Tools:**
- Roboflow (built-in augmentation)
- Custom scripts for specific augmentations

---

### Phase 3: User-Generated Dataset (Week 6+)
**Size:** 1000+ images
**Method:** Collect from beta users (with consent)

**Process:**
1. User scans item
2. User confirms/corrects results
3. Image + correction = ground truth
4. Add to dataset (anonymized)

**Privacy:**
- Explicit user consent
- No faces or personal info
- Option to opt-out

---

### Phase 4: Specialized Datasets
**Goal:** Improve specific categories

**Produce Dataset:**
- Fruits (50 images)
- Vegetables (50 images)
- Herbs (20 images)

**Spices Dataset:**
- Generic jars (30 images)
- Branded containers (20 images)

**International Foods:**
- Asian groceries (30 images)
- Latin American (30 images)
- European (20 images)

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Provider API outage | High | Medium | Multi-provider fallback, graceful degradation |
| Cost overruns | High | Medium | Rate limiting, cost alerts, usage caps per user |
| Poor accuracy | High | Medium | Ensemble approach, user feedback loop, hybrid routing |
| Camera access issues | Medium | Low | Clear error messages, fallback to file upload |
| Privacy concerns | High | Low | No image storage, clear privacy policy, opt-in |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| User adoption low | High | Medium | Good UX, clear value prop, tutorials |
| High support burden | Medium | Medium | Good error handling, helpful tooltips, FAQ |
| Provider pricing changes | Medium | Medium | Monitor multiple providers, easy switching |

### Data Quality Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Biased dataset | Medium | High | Diverse image collection, user-generated data |
| Ground truth errors | Medium | Medium | Multiple annotators, validation process |
| Overfitting to test set | Medium | Medium | Hold-out validation set, real user testing |

---

## Next Steps & Decisions Needed

### Immediate Actions (This Week)
1. **Review this document** with team
2. **Decide on initial provider set** (recommend starting with 3-4)
3. **Set up API keys** for selected providers
4. **Create initial test dataset** (20-30 images)
5. **Begin Phase 0** implementation

### Key Decisions Required

#### Decision 1: Initial Provider Selection
**Recommendation:** Start with 3 providers for MVP
- **Gemini 1.5 Pro** - Good balance, video support for Phase 2
- **Gemini 1.5 Flash** - Cost baseline, speed comparison
- **OpenAI GPT-4 Vision** - Already integrated, quality baseline

**Add later:** Claude 3.5 Sonnet, Azure CV, Clarifai

#### Decision 2: A/B Testing Strategy
**Options:**
A. Random assignment (simple, faster data)
B. User-level assignment (better UX, slower data)
C. Hybrid (recommended)

**Recommendation:** Hybrid - random for first 10 scans, then best performer

#### Decision 3: Evaluation Framework
**Recommendation:** Start with promptfoo, add custom metrics in Phase 3

#### Decision 4: MVP Scope
**What's in:**
- Snapshot mode
- 3 providers
- Basic editing
- Simple duplicate detection

**What's out (future phases):**
- Continuous scanning
- Advanced nutrition lookup
- Video support
- Offline mode

---

## Appendix: Sample Prompts

### Prompt Template for Pantry Scanning

```
You are a food and grocery recognition expert. Analyze the provided image and identify all food items, groceries, spices, or pantry items visible.

For each item detected, provide:
1. **Name**: The specific product name (e.g., "Heinz Tomato Ketchup" not just "ketchup")
2. **Category**: One of [produce, canned_goods, condiments, spices, dairy, frozen, beverages, snacks, baking, other]
3. **Quantity**:
   - amount: number of items
   - unit: bottle/jar/can/box/bag/etc
   - size: if visible on packaging (e.g., "24 oz", "1 L")
   - estimatedFillLevel: 0.0 to 1.0 (0.5 = half full). If unopened/new, use 1.0
4. **Expiry Date**: If visible on packaging, format as YYYY-MM-DD. If not visible, omit this field.
5. **Nutrition** (if label is readable):
   - servingSize
   - calories
   - protein
   - carbs
   - fat
6. **Confidence**: Your confidence in this identification (0.0 to 1.0)

Return ONLY valid JSON in this exact format:
{
  "items": [
    {
      "name": "string",
      "category": "string",
      "quantity": {
        "amount": number,
        "unit": "string",
        "size": "string",
        "estimatedFillLevel": number
      },
      "expiryDate": "YYYY-MM-DD" | null,
      "nutrition": { ... } | null,
      "confidence": number
    }
  ]
}

Important:
- Be specific with names (brands, varieties)
- For produce, include type and estimated count
- For spices in generic jars, try to identify from label or appearance
- If multiple similar items, count them separately
- Estimate fill levels carefully based on visual cues
- Only include nutrition if you can clearly read the label
```

### Prompt Variations

**For Single Item (Higher Detail):**
```
Focus on this single item. Provide detailed information including:
- Exact product name and brand
- All visible text on packaging
- Nutritional information if label is readable
- Expiry/best-by date if visible
- Estimated quantity remaining (fill level)
```

**For Multiple Items (Efficiency):**
```
This image contains multiple items. For each distinct item:
- Provide name and category
- Count identical items together
- Focus on accuracy over detail
- Flag any items you're uncertain about
```

**For Continuous Scanning:**
```
This is one frame from a video scan. Only report items you're highly confident about (>0.85).
Avoid duplicating items you've seen in previous frames.
```

---

## Summary & Recommendations

### Recommended Path Forward

**Phase 1 (Weeks 1-3): MVP**
- 3 providers (Gemini Pro/Flash, GPT-4 Vision)
- Snapshot mode only
- Basic evaluation with promptfoo
- 50 image test dataset

**Phase 2 (Weeks 4-5): Scale**
- Add 2-3 more providers
- A/B testing infrastructure
- Cost analytics dashboard
- Expand to 200 image dataset

**Phase 3 (Weeks 6-7): Optimize**
- Custom evaluation framework
- Smart provider routing
- Hybrid cost optimization
- User feedback integration

**Expected Outcomes:**
- **Accuracy:** 90%+ on common items
- **Cost:** $0.003-0.01 per scan (depending on provider mix)
- **Speed:** 1-3 seconds per scan
- **User Satisfaction:** 4+/5 stars

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Item Recognition Accuracy | >90% | Evaluation dataset |
| Quantity Estimation MAE | <15% | Evaluation dataset |
| User Acceptance Rate | >85% | % of scans confirmed & added |
| Cost per Scan | <$0.01 | Weighted average across providers |
| Scan Completion Time | <5s | End-to-end from capture to results |
| Duplicate Detection Rate | >90% | Manual verification |

---

**This document will be updated as the project progresses.**
