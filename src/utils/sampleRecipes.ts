// Sample recipe data inspired by popular cooking websites
// Original content created for demonstration purposes

export interface SampleRecipe {
  id: string
  name: string
  description?: string
  prepTime?: number
  cookTime?: number
  totalTime?: number
  servings?: number
  imageUrl?: string
  sourceUrl?: string
  ingredients: Array<{
    id: string
    name: string
    amount?: string
    unit?: string
  }>
  instructions: Array<{
    id: string
    step: string
  }>
}

export const generateSampleRecipes = (): SampleRecipe[] => {
  return [
    {
      id: 'sample-recipe-1',
      name: 'One-Pot Chicken and Rice with Lemon',
      description: 'A comforting one-pot meal with tender chicken, fluffy rice, and bright lemon flavors.',
      prepTime: 15,
      cookTime: 45,
      totalTime: 60,
      servings: 4,
      imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop',
      sourceUrl: 'https://cooking.nytimes.com/recipes/1025436-one-pot-chicken-and-rice-with-caramelized-lemon',
      ingredients: [
        { id: 'ing-1-1', name: 'chicken thighs', amount: '8', unit: 'pieces' },
        { id: 'ing-1-2', name: 'long-grain white rice', amount: '1.5', unit: 'cups' },
        { id: 'ing-1-3', name: 'chicken broth', amount: '3', unit: 'cups' },
        { id: 'ing-1-4', name: 'lemon', amount: '2', unit: 'pieces' },
        { id: 'ing-1-5', name: 'yellow onion', amount: '1', unit: 'medium' },
        { id: 'ing-1-6', name: 'garlic', amount: '4', unit: 'cloves' },
        { id: 'ing-1-7', name: 'olive oil', amount: '3', unit: 'tablespoons' },
        { id: 'ing-1-8', name: 'salt', amount: '1', unit: 'teaspoon' },
        { id: 'ing-1-9', name: 'black pepper', amount: '0.5', unit: 'teaspoon' },
        { id: 'ing-1-10', name: 'fresh thyme', amount: '2', unit: 'tablespoons' }
      ],
      instructions: [
        { id: 'inst-1-1', step: 'Season chicken thighs generously with salt and pepper on both sides.' },
        { id: 'inst-1-2', step: 'Heat olive oil in a large, heavy-bottomed pot over medium-high heat.' },
        { id: 'inst-1-3', step: 'Brown chicken thighs skin-side down for 5-6 minutes until golden. Flip and cook 3 more minutes. Remove and set aside.' },
        { id: 'inst-1-4', step: 'Add diced onion to the same pot and cook until softened, about 5 minutes.' },
        { id: 'inst-1-5', step: 'Add minced garlic and cook for 1 minute until fragrant.' },
        { id: 'inst-1-6', step: 'Add rice and stir to coat with the aromatics for 2 minutes.' },
        { id: 'inst-1-7', step: 'Pour in chicken broth and add lemon slices. Bring to a boil.' },
        { id: 'inst-1-8', step: 'Nestle chicken thighs back into the pot, reduce heat to low, cover and simmer for 25 minutes.' },
        { id: 'inst-1-9', step: 'Remove from heat and let stand covered for 5 minutes.' },
        { id: 'inst-1-10', step: 'Garnish with fresh thyme and serve immediately.' }
      ]
    },
    {
      id: 'sample-recipe-2',
      name: 'Ranch Roasted Chickpeas',
      description: 'Crispy, flavorful chickpeas seasoned with ranch-inspired herbs and spices.',
      prepTime: 10,
      cookTime: 25,
      totalTime: 35,
      servings: 4,
      imageUrl: 'https://images.unsplash.com/photo-1599909533131-11bef75b3f5d?w=400&h=300&fit=crop',
      sourceUrl: 'https://www.eatingwell.com/ranch-roasted-chickpeas-11759228',
      ingredients: [
        { id: 'ing-2-1', name: 'chickpeas', amount: '2', unit: 'cans' },
        { id: 'ing-2-2', name: 'olive oil', amount: '2', unit: 'tablespoons' },
        { id: 'ing-2-3', name: 'garlic powder', amount: '1', unit: 'teaspoon' },
        { id: 'ing-2-4', name: 'onion powder', amount: '1', unit: 'teaspoon' },
        { id: 'ing-2-5', name: 'dried dill', amount: '1', unit: 'teaspoon' },
        { id: 'ing-2-6', name: 'dried parsley', amount: '1', unit: 'teaspoon' },
        { id: 'ing-2-7', name: 'salt', amount: '0.5', unit: 'teaspoon' },
        { id: 'ing-2-8', name: 'black pepper', amount: '0.25', unit: 'teaspoon' },
        { id: 'ing-2-9', name: 'paprika', amount: '0.5', unit: 'teaspoon' }
      ],
      instructions: [
        { id: 'inst-2-1', step: 'Preheat oven to 425°F (220°C).' },
        { id: 'inst-2-2', step: 'Drain and rinse chickpeas, then pat completely dry with paper towels.' },
        { id: 'inst-2-3', step: 'In a large bowl, combine chickpeas with olive oil and toss to coat evenly.' },
        { id: 'inst-2-4', step: 'In a small bowl, mix together garlic powder, onion powder, dill, parsley, salt, pepper, and paprika.' },
        { id: 'inst-2-5', step: 'Sprinkle spice mixture over chickpeas and toss until evenly coated.' },
        { id: 'inst-2-6', step: 'Spread chickpeas in a single layer on a large baking sheet.' },
        { id: 'inst-2-7', step: 'Roast for 20-25 minutes, shaking the pan halfway through, until golden and crispy.' },
        { id: 'inst-2-8', step: 'Let cool for 5 minutes before serving. Store leftovers in an airtight container.' }
      ]
    },
    {
      id: 'sample-recipe-3',
      name: 'Ultra-Crispy Slow-Roasted Pork Shoulder',
      description: 'Tender, juicy pork with incredibly crispy skin using a low-and-slow roasting method.',
      prepTime: 20,
      cookTime: 420,
      totalTime: 440,
      servings: 8,
      imageUrl: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400&h=300&fit=crop',
      sourceUrl: 'https://www.seriouseats.com/ultra-crispy-slow-roasted-pork-shoulder-recipe',
      ingredients: [
        { id: 'ing-3-1', name: 'pork shoulder', amount: '4', unit: 'lbs' },
        { id: 'ing-3-2', name: 'kosher salt', amount: '2', unit: 'tablespoons' },
        { id: 'ing-3-3', name: 'black pepper', amount: '1', unit: 'tablespoon' },
        { id: 'ing-3-4', name: 'garlic powder', amount: '1', unit: 'tablespoon' },
        { id: 'ing-3-5', name: 'paprika', amount: '1', unit: 'tablespoon' },
        { id: 'ing-3-6', name: 'brown sugar', amount: '2', unit: 'tablespoons' },
        { id: 'ing-3-7', name: 'cumin', amount: '1', unit: 'teaspoon' },
        { id: 'ing-3-8', name: 'oregano', amount: '1', unit: 'teaspoon' },
        { id: 'ing-3-9', name: 'cayenne pepper', amount: '0.5', unit: 'teaspoon' }
      ],
      instructions: [
        { id: 'inst-3-1', step: 'Pat pork shoulder completely dry with paper towels.' },
        { id: 'inst-3-2', step: 'Score the skin in a crosshatch pattern, cutting about 1/4 inch deep.' },
        { id: 'inst-3-3', step: 'Combine salt, pepper, garlic powder, paprika, brown sugar, cumin, oregano, and cayenne in a bowl.' },
        { id: 'inst-3-4', step: 'Rub spice mixture all over pork, working it into the scored skin. Let rest at room temperature for 1 hour.' },
        { id: 'inst-3-5', step: 'Preheat oven to 250°F (120°C).' },
        { id: 'inst-3-6', step: 'Place pork skin-side up on a wire rack set in a rimmed baking sheet.' },
        { id: 'inst-3-7', step: 'Roast for 6-7 hours until internal temperature reaches 200°F (93°C).' },
        { id: 'inst-3-8', step: 'Increase oven temperature to 500°F (260°C) and roast 10-15 minutes more until skin is crackling.' },
        { id: 'inst-3-9', step: 'Let rest for 15 minutes before carving.' }
      ]
    },
    {
      id: 'sample-recipe-4',
      name: 'Authentic Ma Po Tofu',
      description: 'Classic Sichuan dish with silky tofu in a spicy, numbing sauce with ground pork.',
      prepTime: 15,
      cookTime: 20,
      totalTime: 35,
      servings: 4,
      imageUrl: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=300&fit=crop',
      sourceUrl: 'https://thewoksoflife.com/ma-po-tofu-real-deal/',
      ingredients: [
        { id: 'ing-4-1', name: 'silken tofu', amount: '14', unit: 'oz' },
        { id: 'ing-4-2', name: 'ground pork', amount: '3', unit: 'oz' },
        { id: 'ing-4-3', name: 'doubanjiang', amount: '1', unit: 'tablespoon' },
        { id: 'ing-4-4', name: 'fermented black beans', amount: '1', unit: 'teaspoon' },
        { id: 'ing-4-5', name: 'sichuan peppercorns', amount: '1', unit: 'teaspoon' },
        { id: 'ing-4-6', name: 'garlic', amount: '2', unit: 'cloves' },
        { id: 'ing-4-7', name: 'ginger', amount: '1', unit: 'tablespoon' },
        { id: 'ing-4-8', name: 'chicken stock', amount: '1', unit: 'cup' },
        { id: 'ing-4-9', name: 'soy sauce', amount: '1', unit: 'tablespoon' },
        { id: 'ing-4-10', name: 'cornstarch', amount: '1', unit: 'tablespoon' },
        { id: 'ing-4-11', name: 'scallions', amount: '2', unit: 'stalks' },
        { id: 'ing-4-12', name: 'vegetable oil', amount: '2', unit: 'tablespoons' }
      ],
      instructions: [
        { id: 'inst-4-1', step: 'Cut tofu into 3/4-inch cubes. Gently rinse in salted water and drain.' },
        { id: 'inst-4-2', step: 'Toast Sichuan peppercorns in a dry pan until fragrant, then grind to powder.' },
        { id: 'inst-4-3', step: 'Mince garlic and ginger. Chop scallions, separating whites and greens.' },
        { id: 'inst-4-4', step: 'Mix cornstarch with 2 tablespoons cold water to make slurry.' },
        { id: 'inst-4-5', step: 'Heat oil in wok over medium-high heat. Add ground pork and cook until browned.' },
        { id: 'inst-4-6', step: 'Add doubanjiang and fermented black beans, stir-fry for 30 seconds until fragrant.' },
        { id: 'inst-4-7', step: 'Add garlic, ginger, and scallion whites. Stir-fry for 30 seconds.' },
        { id: 'inst-4-8', step: 'Add chicken stock and soy sauce, bring to a simmer.' },
        { id: 'inst-4-9', step: 'Gently add tofu cubes and simmer for 3-4 minutes.' },
        { id: 'inst-4-10', step: 'Stir in cornstarch slurry to thicken sauce.' },
        { id: 'inst-4-11', step: 'Garnish with scallion greens and ground Sichuan peppercorns. Serve immediately over rice.' }
      ]
    },
    {
      id: 'sample-recipe-5',
      name: 'Peaches & Cream Overnight Oats',
      description: 'Creamy, no-cook breakfast with sweet peaches and vanilla flavors.',
      prepTime: 10,
      cookTime: 0,
      totalTime: 480, // 8 hours for chilling
      servings: 2,
      imageUrl: 'https://images.unsplash.com/photo-1571197119282-1cab7c0e6834?w=400&h=300&fit=crop',
      sourceUrl: 'https://www.eatingwell.com/peaches-cream-overnight-oats-11761891',
      ingredients: [
        { id: 'ing-5-1', name: 'old-fashioned oats', amount: '1', unit: 'cup' },
        { id: 'ing-5-2', name: 'milk', amount: '1', unit: 'cup' },
        { id: 'ing-5-3', name: 'greek yogurt', amount: '0.5', unit: 'cup' },
        { id: 'ing-5-4', name: 'honey', amount: '2', unit: 'tablespoons' },
        { id: 'ing-5-5', name: 'vanilla extract', amount: '1', unit: 'teaspoon' },
        { id: 'ing-5-6', name: 'fresh peaches', amount: '1', unit: 'large' },
        { id: 'ing-5-7', name: 'chia seeds', amount: '1', unit: 'tablespoon' },
        { id: 'ing-5-8', name: 'cinnamon', amount: '0.25', unit: 'teaspoon' },
        { id: 'ing-5-9', name: 'almonds', amount: '2', unit: 'tablespoons' }
      ],
      instructions: [
        { id: 'inst-5-1', step: 'In a large bowl, combine oats, milk, yogurt, honey, and vanilla. Stir well.' },
        { id: 'inst-5-2', step: 'Add chia seeds and cinnamon, mix thoroughly.' },
        { id: 'inst-5-3', step: 'Dice fresh peaches and fold half into the oat mixture.' },
        { id: 'inst-5-4', step: 'Divide mixture between 2 jars or containers.' },
        { id: 'inst-5-5', step: 'Top with remaining diced peaches and sliced almonds.' },
        { id: 'inst-5-6', step: 'Cover and refrigerate for at least 4 hours or overnight.' },
        { id: 'inst-5-7', step: 'Stir before serving. Add more milk if desired consistency is thinner.' },
        { id: 'inst-5-8', step: 'Serve chilled, optionally garnished with additional peaches and nuts.' }
      ]
    }
  ]
}

// Helper function to check if sample recipes should be loaded
export const shouldLoadSampleRecipes = (): boolean => {
  // Only load samples if user has no recipes yet
  // This will be determined by the calling component
  return true
}