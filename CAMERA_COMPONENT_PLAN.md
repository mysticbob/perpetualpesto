# Camera/Video Component Planning Guide

## What's Already In Place

The perpetualpesto application has excellent foundation for your camera/video scanning component:

### Existing Components & Infrastructure

1. **CameraCapture Component** (`src/components/ai/CameraCapture.tsx`)
   - React Webcam integration with rear camera support
   - Image compression (1024x1024, quality 0.8)
   - Captured image preview
   - File upload fallback
   - Detected items display with confidence scores
   - Item selection UI for accepting/rejecting detected items

2. **Vision API Endpoint** (`POST /api/ai/vision`)
   - Analyzes images using GPT-4 Vision
   - Returns detected items with name, quantity, category, confidence
   - Rate limiting (50 req/hr default, 100k tokens/hr)
   - Caching for repeated analyses
   - Error handling with retry logic

3. **Database Tables for Tracking**
   - `AIImageAnalysis` - Store detected items and analysis
   - `PantryItem` - Store final inventory
   - `DepletedItem` - Track what was used
   - `PantryActivityLog` - Audit trail

4. **AI Context & Hooks**
   - `AIContext.tsx` - Manage AI feature state
   - `usePantry()` - Access pantry operations
   - Rate limiting and caching already configured

5. **Testing Infrastructure**
   - Vitest for unit tests
   - Playwright for E2E tests
   - MSW for API mocking
   - Complete test framework ready to use

---

## Enhancement Opportunities for Your Video Component

### 1. Video Mode (Beyond Single Frame)
**Current**: Captures single images via `Webcam.getScreenshot()`
**Enhancement**: Add video streaming for:
- Real-time item detection feedback
- Progress indicator showing detection quality
- Confidence threshold warnings before capture

**Implementation**:
```typescript
// Extend CameraCapture.tsx with:
- useRef for canvas stream
- requestAnimationFrame for continuous analysis
- Debounced vision API calls (every 500ms)
- Real-time confidence visualization
```

### 2. Batch Processing
**Current**: One image at a time
**Enhancement**: 
- Capture multiple angles of the same pantry location
- Combine results intelligently (deduplicate, average confidence)
- Reduce false positives with multi-angle analysis

**Database**: AIImageAnalysis already supports batch references

### 3. Enhanced Detection Confidence
**Current**: Binary accept/reject
**Enhancement**:
- Show detection reasoning (why item was identified)
- Allow corrections with spell-check suggestions
- Learn from user corrections to improve future detections

### 4. Video Format Support
**Current**: Only webcam real-time
**Enhancement**:
- Support video file upload (.mp4, .webm)
- Extract frames at intervals for analysis
- Show progress through video
- Timeline view of detected items

### 5. Pantry-Specific Features
**Current**: Generic detection
**Enhancement**:
- Context-aware detection (know user's pantry layout)
- SKU/barcode recognition
- Expiration date extraction from images
- Brand/product matching for better categorization

---

## Data Flow for Your Enhancement

```
User Opens Camera
  ↓
Select Capture Mode (pantry/grocery/leftovers)
  ↓
Capture Video/Image(s)
  ↓
Send to /api/ai/vision
  ↓
OpenAI Vision API analyzes
  ↓
Returns: {
  items: [
    {
      name: string,
      quantity?: string,
      category?: string,
      confidence: 0-1
    }
  ],
  rawDescription: string
}
  ↓
Display Results (with confidence scores)
  ↓
User Selects Items
  ↓
Submit to /api/pantry/items
  ↓
Save to Database (PantryItem)
  ↓
Log Activity (PantryActivityLog)
  ↓
Update UI via PantryContext
```

---

## Integration Points

### Frontend Integration
1. Extend `src/components/ai/CameraCapture.tsx`
   - Add video mode
   - Add streaming analysis
   - Keep existing modal structure

2. Update `src/contexts/AIContext.tsx`
   - Add video processing hook
   - Track video processing state
   - Manage streaming requests

3. Extend `src/components/PantryPage.tsx`
   - Add "Scan with Video" button
   - Pass mode prop to CameraCapture

### Backend Integration
1. Extend `src/server/routes/ai.ts`
   - Add new `/video` endpoint (optional)
   - Reuse `/vision` for individual frames
   - Batch frame processing endpoint

2. Enhance `src/server/services/ai/openai.service.ts`
   - Add video frame extraction
   - Batch processing with deduplication
   - Confidence aggregation

3. Update `server/routes/pantry.ts`
   - Already handles bulk item insertion
   - Activity logging already in place

### Database
- Existing AIImageAnalysis table supports your needs
- No schema changes required
- Can add metadata JSON field for video processing info

---

## Configuration for Video Component

### Recommended Settings
```env
# Vision API
AI_VISION_RATE_LIMIT=50          # Keep current
AI_VISION_TOKEN_LIMIT=100000      # Plenty for video frames

# Video Processing
VIDEO_PROCESSING_INTERVAL=500ms   # Analyze every 500ms
VIDEO_FRAME_EXTRACTION_RATE=2fps  # Extract 2 frames per second
BATCH_ANALYSIS_SIZE=5             # Process 5 frames at once
CONFIDENCE_THRESHOLD=0.6          # Minimum confidence to show
```

### Browser Requirements
- Camera permissions (already handled by react-webcam)
- Canvas API (for frame extraction)
- WebGL (optional, for real-time filters)
- 50MB+ memory for video buffer

---

## Testing Strategy

### Unit Tests (Vitest)
```typescript
// Add to src/components/ai/__tests__/
- CameraCapture.video.test.tsx
  - Video stream initialization
  - Frame extraction
  - Batch processing

// Add to src/server/services/ai/__tests__/
- video.service.test.ts
  - Frame processing
  - Batch deduplication
  - Confidence aggregation
```

### Integration Tests
```typescript
// Add to tests/integration/
- video-vision-integration.test.ts
  - End-to-end video capture → storage
  - Permission handling
  - Rate limit compliance
```

### E2E Tests (Playwright)
```typescript
// Add to tests/e2e/
- camera-video-scanning.spec.ts
  - UI flow from start to finish
  - Mobile device testing (important for camera!)
  - Error recovery
```

---

## Performance Considerations

### Optimization Tips
1. **Image Compression**
   - Already implemented: 1024x1024, quality 0.8
   - For video: Use same settings per frame

2. **Request Batching**
   - Send multiple frames in single request
   - Reduces API overhead
   - Better rate limit efficiency

3. **Caching Strategy**
   - Cache same items detected in consecutive frames
   - Skip analysis for unchanged areas
   - Use AIContextCache table

4. **Memory Management**
   - Limit video buffer to 10 frames
   - Auto-garbage collection
   - Use Web Workers for frame processing (optional)

### Expected Performance
- Single image analysis: 2-5 seconds
- Video streaming (2fps): 1 detection per 500ms
- Token usage per image: ~100-500 tokens
- Rate limit at current config: ~1-2 min of video processing

---

## Security Considerations

### Image Data Handling
1. **Privacy**
   - Images sent to OpenAI (check TOS)
   - Use Infisical for API keys
   - Only authenticated users can access

2. **Storage**
   - AIImageAnalysis table stores URLs/metadata
   - Raw images not stored (privacy-first)
   - User can request deletion

3. **Rate Limiting**
   - Already implemented per user
   - Prevents abuse
   - Token-based limiting

### API Security
- CORS configured for dev/production
- Firebase auth on all endpoints
- Input validation with Zod
- Error messages don't leak sensitive data

---

## Next Steps for Implementation

### Phase 1: Foundation (1-2 weeks)
1. Extend CameraCapture with streaming mode
2. Add test cases for video handling
3. Create streaming visualization UI

### Phase 2: Backend Enhancement (1 week)
1. Add video frame batch processing endpoint
2. Implement deduplication logic
3. Add performance metrics

### Phase 3: Polish & Testing (1 week)
1. Full E2E testing across devices
2. Performance optimization
3. UX refinement based on testing

### Phase 4: Monitoring & Analytics (1 week)
1. Track video vs. static image performance
2. Monitor token usage and costs
3. User behavior analytics

---

## Key Files for Your Reference

**Frontend**:
- `/home/user/perpetualpesto/src/components/ai/CameraCapture.tsx` (MAIN)
- `/home/user/perpetualpesto/src/contexts/AIContext.tsx`
- `/home/user/perpetualpesto/src/contexts/PantryContext.tsx`

**Backend**:
- `/home/user/perpetualpesto/src/server/routes/ai.ts`
- `/home/user/perpetualpesto/src/server/services/ai/openai.service.ts`
- `/home/user/perpetualpesto/src/server/services/ai/aiService.ts`
- `/home/user/perpetualpesto/server/routes/pantry.ts`

**Database**:
- `/home/user/perpetualpesto/prisma/schema.prisma` (AIImageAnalysis)

**Testing**:
- `/home/user/perpetualpesto/vitest.config.ts`
- `/home/user/perpetualpesto/playwright.config.ts`

---

## Architecture Documentation Saved

I've created two comprehensive documents in your project:

1. **ARCHITECTURE_OVERVIEW.md** (19KB)
   - Complete tech stack breakdown
   - All data models explained
   - API structure and endpoints
   - AI/ML integrations
   - Testing framework details
   - Component patterns
   - Authentication & secrets

2. **KEY_FILES_REFERENCE.md** (9.7KB)
   - Quick reference to all important files
   - Organized by function
   - File paths and descriptions
   - Cheat sheet for quick lookups

Both files are ready to use and reference!
