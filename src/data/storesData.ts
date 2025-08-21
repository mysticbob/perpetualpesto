/**
 * Store data for grocery delivery services
 * Extracted from StoresPage component for better organization
 */

export interface Store {
  id: string
  name: string
  description: string
  type: 'delivery' | 'pickup' | 'subscription' | 'specialty'
  logo: string
  website: string
  features: string[]
  deliveryTime?: string
  minOrder?: string
  deliveryFee?: string
  enabled: boolean
}

export const storeData: Store[] = [
  {
    id: 'amazon-fresh',
    name: 'Amazon Fresh',
    description: 'Fast grocery delivery from Amazon with Prime benefits',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=100&h=100&fit=crop',
    website: 'https://www.amazon.com/fresh',
    features: ['Same-day delivery', 'Prime member discounts', 'Wide selection'],
    deliveryTime: '2-4 hours',
    minOrder: '$35',
    deliveryFee: 'Free with Prime',
    enabled: true
  },
  {
    id: 'whole-foods',
    name: 'Whole Foods Market',
    description: 'Organic and natural foods with Amazon Prime delivery',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
    website: 'https://www.wholefoodsmarket.com',
    features: ['Organic products', 'Prime delivery', 'In-store pickup'],
    deliveryTime: '1-2 hours',
    minOrder: '$35',
    deliveryFee: 'Free with Prime',
    enabled: true
  },
  {
    id: 'instacart',
    name: 'Instacart',
    description: 'Shop from multiple local stores with personal shoppers',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop',
    website: 'https://www.instacart.com',
    features: ['Multiple stores', 'Personal shoppers', 'Real-time updates'],
    deliveryTime: '1-3 hours',
    minOrder: '$10',
    deliveryFee: '$3.99+',
    enabled: false
  },
  {
    id: 'shipt',
    name: 'Shipt',
    description: 'Target-owned delivery service with personal shoppers',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop',
    website: 'https://www.shipt.com',
    features: ['Target partnership', 'Personal shoppers', 'Membership benefits'],
    deliveryTime: '1-2 hours',
    minOrder: '$35',
    deliveryFee: 'Free with membership',
    enabled: false
  },
  {
    id: 'freshdirect',
    name: 'FreshDirect',
    description: 'Fresh groceries delivered from local farms and producers',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
    website: 'https://www.freshdirect.com',
    features: ['Farm-fresh produce', 'Local sourcing', 'Prepared meals'],
    deliveryTime: 'Next day',
    minOrder: '$30',
    deliveryFee: '$5.99',
    enabled: false
  },
  {
    id: 'walmart-plus',
    name: 'Walmart+',
    description: 'Walmart grocery delivery and pickup with membership benefits',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop',
    website: 'https://www.walmart.com/plus',
    features: ['Low prices', 'Free delivery', 'Gas discounts'],
    deliveryTime: '2-4 hours',
    minOrder: '$35',
    deliveryFee: 'Free with membership',
    enabled: false
  },
  {
    id: 'peapod',
    name: 'Peapod',
    description: 'Stop & Shop and Giant grocery delivery service',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop',
    website: 'https://www.peapod.com',
    features: ['Scheduled delivery', 'Store brands', 'Recurring orders'],
    deliveryTime: 'Same/next day',
    minOrder: '$60',
    deliveryFee: '$9.95',
    enabled: false
  },
  {
    id: 'thrive-market',
    name: 'Thrive Market',
    description: 'Organic and healthy products with membership discounts',
    type: 'specialty',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
    website: 'https://thrivemarket.com',
    features: ['Organic focus', 'Member prices', 'Sustainable products'],
    deliveryTime: '2-5 days',
    minOrder: '$49',
    deliveryFee: 'Free shipping',
    enabled: false
  },
  {
    id: 'hellofresh',
    name: 'HelloFresh',
    description: 'Meal kit delivery with pre-portioned ingredients',
    type: 'subscription',
    logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop',
    website: 'https://www.hellofresh.com',
    features: ['Meal kits', 'Recipe cards', 'Flexible plans'],
    deliveryTime: 'Weekly',
    minOrder: '2 meals',
    deliveryFee: 'Included',
    enabled: false
  },
  {
    id: 'blue-apron',
    name: 'Blue Apron',
    description: 'Chef-designed meal kits with premium ingredients',
    type: 'subscription',
    logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop',
    website: 'https://www.blueapron.com',
    features: ['Chef recipes', 'Wine pairings', 'Flexible delivery'],
    deliveryTime: 'Weekly',
    minOrder: '2 meals',
    deliveryFee: 'Included',
    enabled: false
  },
  {
    id: 'home-chef',
    name: 'Home Chef',
    description: 'Kroger-owned meal kit service with grocery integration',
    type: 'subscription',
    logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop',
    website: 'https://www.homechef.com',
    features: ['Kroger integration', 'Oven-ready meals', 'Add-on items'],
    deliveryTime: 'Weekly',
    minOrder: '2 meals',
    deliveryFee: 'Included',
    enabled: false
  },
  {
    id: 'gopuff',
    name: 'Gopuff',
    description: 'On-demand delivery of everyday essentials and snacks',
    type: 'delivery',
    logo: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop',
    website: 'https://gopuff.com',
    features: ['Fast delivery', 'Convenience items', 'No minimums'],
    deliveryTime: '15-30 minutes',
    minOrder: 'None',
    deliveryFee: '$1.95',
    enabled: false
  },
  {
    id: 'imperfect-foods',
    name: 'Imperfect Foods',
    description: 'Sustainable grocery delivery with imperfect produce',
    type: 'specialty',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
    website: 'https://www.imperfectfoods.com',
    features: ['Sustainable', 'Reduced waste', 'Customizable boxes'],
    deliveryTime: 'Weekly',
    minOrder: '$60',
    deliveryFee: '$4.99',
    enabled: false
  },
  {
    id: 'misfits-market',
    name: 'Misfits Market',
    description: 'Organic produce and groceries at discounted prices',
    type: 'specialty',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
    website: 'https://www.misfitsmarket.com',
    features: ['Discounted organic', 'Rescued produce', 'Flexible orders'],
    deliveryTime: 'Weekly',
    minOrder: '$30',
    deliveryFee: 'Free',
    enabled: false
  }
]

export default storeData