/**
 * Ingredient Matcher
 * Matches parsed ingredients to USDA foods using exact, fuzzy, and synonym matching
 */

import { getUSDAClient } from './usdaClient.js'
import { getIngredientParser } from './ingredientParser.js'
import type { IngredientMatch, ParsedIngredient, USDAFood } from './types.js'

// Comprehensive synonym dictionary
const INGREDIENT_SYNONYMS: Record<string, string[]> = {
  // Onions
  onion: ['onions', 'yellow onion', 'white onion', 'brown onion'],
  'green onion': ['scallion', 'scallions', 'spring onion', 'spring onions'],
  'red onion': ['purple onion', 'red onions'],
  shallot: ['shallots', 'eschalot'],

  // Tomatoes
  tomato: ['tomatoes', 'roma tomato', 'plum tomato'],
  'cherry tomato': ['cherry tomatoes', 'grape tomato', 'grape tomatoes'],
  'sun-dried tomato': ['sun dried tomatoes', 'sundried tomatoes'],

  // Peppers
  'bell pepper': ['sweet pepper', 'capsicum', 'bell peppers'],
  'red pepper': ['red bell pepper', 'red capsicum'],
  'green pepper': ['green bell pepper', 'green capsicum'],
  jalapeno: ['jalapeño', 'jalapeno pepper', 'jalapeños'],
  chili: ['chile', 'chilli', 'chili pepper'],

  // Greens
  spinach: ['baby spinach', 'fresh spinach'],
  kale: ['curly kale', 'dinosaur kale', 'lacinato kale'],
  lettuce: ['iceberg lettuce', 'romaine', 'romaine lettuce'],
  arugula: ['rocket', 'rucola', 'roquette'],
  'swiss chard': ['chard', 'silverbeet'],

  // Herbs
  cilantro: ['coriander', 'fresh cilantro', 'coriander leaves', 'chinese parsley'],
  parsley: ['italian parsley', 'flat-leaf parsley', 'curly parsley'],
  basil: ['sweet basil', 'fresh basil', 'thai basil'],
  oregano: ['dried oregano', 'fresh oregano'],
  thyme: ['fresh thyme', 'dried thyme'],
  rosemary: ['fresh rosemary', 'dried rosemary'],
  sage: ['fresh sage', 'dried sage'],
  dill: ['dill weed', 'fresh dill'],
  mint: ['peppermint', 'spearmint', 'fresh mint'],

  // Chicken
  'chicken breast': ['chicken breast meat', 'boneless chicken breast', 'skinless chicken breast'],
  'chicken thigh': ['chicken thighs', 'bone-in chicken thigh'],
  'ground chicken': ['minced chicken', 'chicken mince'],

  // Beef
  'ground beef': ['minced beef', 'beef mince', 'hamburger meat'],
  'beef chuck': ['chuck roast', 'chuck steak'],
  'beef sirloin': ['sirloin steak', 'top sirloin'],

  // Pork
  'pork chop': ['pork chops', 'center cut pork chop'],
  'pork shoulder': ['pork butt', 'boston butt'],
  'ground pork': ['minced pork', 'pork mince'],
  bacon: ['bacon strips', 'pork bacon'],

  // Seafood
  salmon: ['salmon fillet', 'atlantic salmon', 'sockeye salmon'],
  tuna: ['tuna steak', 'yellowfin tuna', 'albacore tuna'],
  shrimp: ['prawns', 'tiger shrimp'],
  cod: ['codfish', 'atlantic cod'],

  // Dairy
  milk: ['whole milk', 'cow milk', "cow's milk"],
  'skim milk': ['non-fat milk', 'fat-free milk', 'skimmed milk'],
  'heavy cream': ['heavy whipping cream', 'double cream'],
  'sour cream': ['soured cream'],
  'cream cheese': ['philadelphia cheese'],
  cheddar: ['cheddar cheese', 'sharp cheddar'],
  mozzarella: ['mozzarella cheese', 'fresh mozzarella'],
  parmesan: ['parmigiano', 'parmigiano-reggiano', 'parmesan cheese'],
  'greek yogurt': ['greek-style yogurt', 'strained yogurt'],

  // Grains
  rice: ['white rice', 'long grain rice'],
  'brown rice': ['whole grain rice', 'brown long grain rice'],
  quinoa: ['white quinoa', 'red quinoa'],
  pasta: ['dry pasta', 'dried pasta'],
  'spaghetti': ['spaghetti pasta'],
  'penne': ['penne pasta', 'penne rigate'],
  oats: ['rolled oats', 'old-fashioned oats', 'oatmeal'],
  flour: ['all-purpose flour', 'wheat flour', 'plain flour'],
  'bread flour': ['strong flour', 'high-gluten flour'],
  'whole wheat flour': ['whole grain flour', 'wholemeal flour'],

  // Legumes
  'black beans': ['black turtle beans'],
  'kidney beans': ['red kidney beans'],
  'chickpeas': ['garbanzo beans', 'garbanzo', 'gram'],
  lentils: ['brown lentils', 'green lentils', 'red lentils'],
  'pinto beans': ['frijol pinto'],

  // Vegetables
  potato: ['potatoes', 'russet potato', 'white potato'],
  'sweet potato': ['sweet potatoes', 'yam'],
  carrot: ['carrots'],
  celery: ['celery stalk', 'celery stalks'],
  broccoli: ['broccoli florets'],
  cauliflower: ['cauliflower florets'],
  'green beans': ['string beans', 'snap beans'],
  corn: ['sweet corn', 'corn kernels'],
  peas: ['green peas', 'garden peas'],
  cucumber: ['cucumbers', 'english cucumber'],
  zucchini: ['courgette', 'zucchinis'],
  eggplant: ['aubergine', 'eggplants'],
  mushroom: ['mushrooms', 'button mushrooms', 'cremini mushrooms'],
  asparagus: ['asparagus spears'],

  // Fruits
  apple: ['apples', 'gala apple', 'fuji apple', 'granny smith'],
  banana: ['bananas'],
  orange: ['oranges', 'navel orange'],
  lemon: ['lemons'],
  lime: ['limes'],
  strawberry: ['strawberries', 'fresh strawberries'],
  blueberry: ['blueberries', 'fresh blueberries'],
  raspberry: ['raspberries'],
  blackberry: ['blackberries'],
  grape: ['grapes', 'red grapes', 'green grapes'],
  watermelon: ['watermelons'],
  mango: ['mangoes', 'mangos'],
  pineapple: ['pineapples'],
  avocado: ['avocados', 'hass avocado'],

  // Oils & Fats
  'olive oil': ['extra virgin olive oil', 'evoo', 'virgin olive oil'],
  'vegetable oil': ['cooking oil', 'canola oil'],
  'coconut oil': ['virgin coconut oil'],
  butter: ['salted butter', 'unsalted butter', 'sweet cream butter'],

  // Condiments & Sauces
  'soy sauce': ['shoyu', 'tamari'],
  'worcestershire sauce': ['worcestershire', 'lea & perrins'],
  'fish sauce': ['nam pla', 'nuoc mam'],
  'hot sauce': ['tabasco', 'sriracha'],
  ketchup: ['tomato ketchup', 'catsup'],
  mustard: ['yellow mustard', 'dijon mustard'],
  mayonnaise: ['mayo'],

  // Nuts & Seeds
  almond: ['almonds'],
  walnut: ['walnuts'],
  pecan: ['pecans'],
  cashew: ['cashews'],
  peanut: ['peanuts', 'groundnut'],
  'peanut butter': ['peanutbutter'],
  'almond butter': ['almondbutter'],
  'sunflower seeds': ['sunflower seed'],
  'sesame seeds': ['sesame seed'],
  'chia seeds': ['chia seed'],
  'flax seeds': ['flaxseed', 'linseed'],

  // Sweeteners
  sugar: ['granulated sugar', 'white sugar', 'table sugar'],
  'brown sugar': ['light brown sugar', 'dark brown sugar'],
  honey: ['raw honey'],
  'maple syrup': ['pure maple syrup'],
  'agave': ['agave nectar', 'agave syrup'],

  // Spices
  salt: ['table salt', 'sea salt', 'kosher salt'],
  'black pepper': ['ground black pepper', 'black peppercorns'],
  garlic: ['garlic cloves', 'fresh garlic'],
  'garlic powder': ['dried garlic', 'granulated garlic'],
  'onion powder': ['dried onion', 'granulated onion'],
  paprika: ['sweet paprika', 'hungarian paprika'],
  cumin: ['ground cumin', 'cumin seed'],
  'chili powder': ['chilli powder'],
  cinnamon: ['ground cinnamon', 'cinnamon stick'],
  ginger: ['fresh ginger', 'ginger root'],
  turmeric: ['ground turmeric'],
  'cayenne pepper': ['cayenne', 'ground cayenne'],
}

export class IngredientMatcher {
  private usdaClient = getUSDAClient()
  private parser = getIngredientParser()

  /**
   * Find the best match for a parsed ingredient
   */
  async findBestMatch(
    parsed: ParsedIngredient
  ): Promise<IngredientMatch | null> {
    const matches = await this.findMatches(parsed, 5)
    return matches.length > 0 ? matches[0] : null
  }

  /**
   * Find multiple possible matches for a parsed ingredient
   */
  async findMatches(
    parsed: ParsedIngredient,
    limit: number = 10
  ): Promise<IngredientMatch[]> {
    const searchTerms = this.generateSearchTerms(parsed.ingredient)
    const allMatches: IngredientMatch[] = []

    // Try each search term
    for (const term of searchTerms) {
      try {
        const foods = await this.usdaClient.searchIngredient(term, limit)

        // Score and convert to matches
        for (const food of foods) {
          const match = this.scoreMatch(parsed, food, term)
          if (match) {
            allMatches.push(match)
          }
        }

        // If we found high-confidence matches, we can stop
        if (allMatches.some((m) => m.confidence > 0.9)) {
          break
        }
      } catch (error) {
        console.error(`[Ingredient Matcher] Error searching for "${term}":`, error)
      }
    }

    // Sort by confidence and remove duplicates
    const uniqueMatches = this.deduplicateMatches(allMatches)
    return uniqueMatches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit)
  }

  /**
   * Generate search terms from ingredient name, including synonyms
   */
  private generateSearchTerms(ingredientName: string): string[] {
    const normalized = this.parser.normalizeIngredientName(ingredientName)
    const terms: string[] = [normalized, ingredientName]

    // Add synonyms
    for (const [key, synonyms] of Object.entries(INGREDIENT_SYNONYMS)) {
      if (normalized.includes(key) || synonyms.some((syn) => normalized.includes(syn))) {
        terms.push(key, ...synonyms)
      }
    }

    // Remove duplicates and return
    return [...new Set(terms)]
  }

  /**
   * Score how well a USDA food matches the parsed ingredient
   */
  private scoreMatch(
    parsed: ParsedIngredient,
    food: USDAFood,
    searchTerm: string
  ): IngredientMatch | null {
    const foodDesc = food.description.toLowerCase()
    const normalizedIngredient = this.parser
      .normalizeIngredientName(parsed.ingredient)
      .toLowerCase()

    let confidence = 0
    let matchType: 'exact' | 'fuzzy' | 'synonym' | 'partial' = 'partial'

    // Exact match
    if (foodDesc === normalizedIngredient || foodDesc === searchTerm) {
      confidence = 1.0
      matchType = 'exact'
    }
    // Very close match (contains exactly)
    else if (foodDesc.includes(normalizedIngredient)) {
      confidence = 0.9
      matchType = 'fuzzy'
    }
    // Synonym match
    else if (
      searchTerm !== normalizedIngredient &&
      foodDesc.includes(searchTerm)
    ) {
      confidence = 0.85
      matchType = 'synonym'
    }
    // Partial word match
    else if (this.hasWordOverlap(foodDesc, normalizedIngredient)) {
      confidence = 0.7
      matchType = 'partial'
    }
    // Very loose match (some character overlap)
    else {
      confidence = this.calculateLevenshteinSimilarity(
        foodDesc,
        normalizedIngredient
      )
      if (confidence < 0.5) {
        return null // Too low confidence
      }
    }

    // Boost confidence for raw/unprocessed foods
    if (foodDesc.includes('raw') || !foodDesc.includes('cooked')) {
      confidence += 0.05
    }

    // Prefer Foundation and SR Legacy over Branded
    if (food.dataType === 'Foundation') {
      confidence += 0.1
    } else if (food.dataType === 'SR Legacy') {
      confidence += 0.05
    }

    // Cap confidence at 1.0
    confidence = Math.min(confidence, 1.0)

    return {
      foodId: food.fdcId.toString(),
      fdcId: food.fdcId,
      description: food.description,
      confidence,
      matchType,
    }
  }

  /**
   * Check if two strings have overlapping words
   */
  private hasWordOverlap(str1: string, str2: string): boolean {
    const words1 = str1.split(/\s+/)
    const words2 = str2.split(/\s+/)

    return words1.some((word1) =>
      words2.some((word2) => word1.includes(word2) || word2.includes(word1))
    )
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2)
    const maxLength = Math.max(str1.length, str2.length)
    return 1 - distance / maxLength
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2[i - 1] === str1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Remove duplicate matches (same fdcId)
   */
  private deduplicateMatches(matches: IngredientMatch[]): IngredientMatch[] {
    const seen = new Set<number>()
    return matches.filter((match) => {
      if (seen.has(match.fdcId)) {
        return false
      }
      seen.add(match.fdcId)
      return true
    })
  }

  /**
   * Check if a match is confident enough for auto-mapping
   */
  isAutoMatchable(match: IngredientMatch): boolean {
    return match.confidence >= 0.85
  }

  /**
   * Batch match multiple ingredients
   */
  async matchMany(
    ingredients: ParsedIngredient[]
  ): Promise<Array<IngredientMatch | null>> {
    const promises = ingredients.map((ing) => this.findBestMatch(ing))
    return Promise.all(promises)
  }
}

// Singleton instance
let matcherInstance: IngredientMatcher | null = null

/**
 * Get the singleton ingredient matcher instance
 */
export function getIngredientMatcher(): IngredientMatcher {
  if (!matcherInstance) {
    matcherInstance = new IngredientMatcher()
  }
  return matcherInstance
}
