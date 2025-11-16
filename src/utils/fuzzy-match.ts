/**
 * Fuzzy string matching utilities for duplicate detection
 */

export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function fuzzyMatch(a: string, b: string): number {
  const normalizedA = normalizeItemName(a);
  const normalizedB = normalizeItemName(b);

  const distance = levenshteinDistance(normalizedA, normalizedB);
  const maxLength = Math.max(normalizedA.length, normalizedB.length);

  if (maxLength === 0) return 1;

  return 1 - distance / maxLength;
}

export function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')  // Remove special characters
    .replace(/\s+/g, ' ')          // Normalize whitespace
    .trim();
}

export function extractBrand(name: string): string | null {
  // Common brand patterns (first word before product name)
  const normalized = name.trim();
  const words = normalized.split(' ');

  if (words.length > 1) {
    // Check if first word looks like a brand (capitalized, < 15 chars)
    const firstWord = words[0];
    if (firstWord.length < 15 && /^[A-Z]/.test(firstWord)) {
      return firstWord;
    }
  }

  return null;
}

export function extractProductType(name: string): string | null {
  const normalized = normalizeItemName(name);

  // Common product types
  const types = [
    'ketchup', 'mustard', 'mayo', 'mayonnaise', 'sauce', 'salsa',
    'cheese', 'milk', 'butter', 'yogurt',
    'bread', 'pasta', 'rice', 'cereal',
    'oil', 'vinegar',
    'salt', 'pepper', 'paprika', 'cinnamon', 'cumin',
    'soup', 'broth', 'stock',
    'beans', 'tomatoes', 'corn',
    'juice', 'soda', 'water', 'coffee', 'tea'
  ];

  for (const type of types) {
    if (normalized.includes(type)) {
      return type;
    }
  }

  return null;
}

/**
 * Calculate similarity between two items considering name, category, and brand
 */
export function calculateItemSimilarity(
  item1: { name: string; category?: string },
  item2: { name: string; category?: string }
): number {
  // Name similarity (70% weight)
  const nameSimilarity = fuzzyMatch(item1.name, item2.name);

  // Category match (30% weight)
  let categorySimilarity = 0;
  if (item1.category && item2.category) {
    categorySimilarity = item1.category.toLowerCase() === item2.category.toLowerCase() ? 1 : 0;
  }

  // Weighted average
  return nameSimilarity * 0.7 + categorySimilarity * 0.3;
}

/**
 * Find best match for an item in a list of existing items
 */
export function findBestMatch<T extends { name: string; category?: string }>(
  newItem: { name: string; category?: string },
  existingItems: T[],
  threshold: number = 0.8
): { item: T; similarity: number } | null {
  let bestMatch: { item: T; similarity: number } | null = null;

  for (const existing of existingItems) {
    const similarity = calculateItemSimilarity(newItem, existing);

    if (similarity >= threshold) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { item: existing, similarity };
      }
    }
  }

  return bestMatch;
}
