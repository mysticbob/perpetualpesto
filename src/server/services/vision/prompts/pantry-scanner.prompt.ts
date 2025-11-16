/**
 * Default pantry scanner prompt template
 */

export const PANTRY_SCANNER_PROMPT = `You are a food and grocery recognition expert. Analyze the provided image and identify all food items, groceries, spices, or pantry items visible.

For each item detected, provide:
1. **name**: The specific product name (e.g., "Heinz Tomato Ketchup" not just "ketchup")
2. **category**: One of [produce, canned_goods, condiments, spices, dairy, frozen, beverages, snacks, baking, grains, pasta, sauces, oils, meat, seafood, bread, cereal, other]
3. **quantity**:
   - amount: number of items
   - unit: bottle/jar/can/box/bag/etc
   - size: if visible on packaging (e.g., "24 oz", "1 L")
   - estimatedFillLevel: 0.0 to 1.0 (0.5 = half full). If unopened/new, use 1.0
4. **expiryDate**: If visible on packaging, format as YYYY-MM-DD. If not visible, omit this field.
5. **nutrition** (if label is clearly readable):
   - servingSize
   - calories
   - protein
   - carbohydrates
   - fat
6. **confidence**: Your confidence in this identification (0.0 to 1.0)

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
      },
      "expiryDate": "YYYY-MM-DD" or null,
      "nutrition": { ... } or null,
      "confidence": 0.95
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

export const SINGLE_ITEM_PROMPT = `Analyze this single food/grocery item in detail.

Provide:
- Exact product name and brand
- All visible text on packaging
- Nutritional information if label is readable
- Expiry/best-by date if visible
- Estimated quantity remaining (fill level: 0.0-1.0)
- Package size
- Category

Return JSON matching this schema:
{
  "items": [{
    "name": "exact product name with brand",
    "category": "category",
    "quantity": {
      "amount": 1,
      "unit": "unit",
      "size": "size from label",
      "estimatedFillLevel": 0.0-1.0
    },
    "expiryDate": "YYYY-MM-DD" or null,
    "nutrition": {...} or null,
    "confidence": 0.0-1.0,
    "metadata": {
      "brand": "brand name",
      "packageSize": "from label",
      "visibleText": ["all", "visible", "text"]
    }
  }]
}`;

export const MULTI_ITEM_FAST_PROMPT = `This image contains multiple items. For each distinct item:
- Provide name and category
- Count identical items together
- Focus on accuracy over detail
- Flag any items you're uncertain about (confidence < 0.75)

Return JSON:
{
  "items": [
    {
      "name": "item name",
      "category": "category",
      "quantity": {"amount": count, "unit": "unit", "estimatedFillLevel": 1.0},
      "confidence": 0.0-1.0
    }
  ]
}`;

export const CONTINUOUS_SCAN_PROMPT = `This is one frame from a video scan. Only report items you're highly confident about (>0.85).
Focus on new items not seen in previous frames.

Return JSON with detected items:
{
  "items": [
    {
      "name": "item name",
      "category": "category",
      "quantity": {"amount": 1, "unit": "unit", "estimatedFillLevel": 1.0},
      "confidence": 0.85-1.0
    }
  ]
}`;
