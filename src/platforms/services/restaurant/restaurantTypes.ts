import type { Order, Seller, Product } from '../../../services/api';

export type MenuItemCategory = 'appetizer' | 'main' | 'dessert' | 'drink' | 'special';

export interface RestaurantOrderData {
  platform: 'restaurant';
  orderType: 'table-service' | 'delivery' | 'pickup';
  tableNumber?: string;
  items: RestaurantOrderItem[];
  reservationId?: string;
  specialInstructions?: string;
}

export interface RestaurantOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface RestaurantSettings {
  cuisineType: string;
  serviceStyle: 'sit-down' | 'casual' | 'fine-dining';
  tableCount: number;
  openingHours: { day: number; open: string; close: string; closed: boolean }[];
  leadTimeMinutes: number;
  depositPercent: number;
  currency: string;
  deliveryRadius: number;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  reservationLeadTimeHours: number;
  maxPartySize: number;
  locations: string[];
}

export const defaultRestaurantSettings: RestaurantSettings = {
  cuisineType: 'International',
  serviceStyle: 'casual',
  tableCount: 12,
  openingHours: [
    { day: 1, open: '11:00', close: '23:00', closed: false },
    { day: 2, open: '11:00', close: '23:00', closed: false },
    { day: 3, open: '11:00', close: '23:00', closed: false },
    { day: 4, open: '11:00', close: '23:00', closed: false },
    { day: 5, open: '11:00', close: '23:00', closed: false },
    { day: 6, open: '12:00', close: '23:00', closed: false },
    { day: 0, open: '12:00', close: '22:00', closed: false },
  ],
  leadTimeMinutes: 15,
  depositPercent: 30,
  currency: 'USD',
  deliveryRadius: 5,
  pickupEnabled: true,
  deliveryEnabled: true,
  reservationLeadTimeHours: 1,
  maxPartySize: 8,
  locations: ['Downtown'],
};

export const DAY_NAMES: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export const getRestaurantSettings = (seller?: Seller | null): RestaurantSettings => {
  const saved = seller?.theme?.customizations?.restaurant || {};
  const merged = { ...defaultRestaurantSettings, ...saved };
  if (!merged.openingHours || merged.openingHours.length === 0) {
    merged.openingHours = defaultRestaurantSettings.openingHours;
  }
  if (merged.currency === 'USD' && seller?.currency) {
    merged.currency = seller.currency;
  }
  return merged;
};

export const saveRestaurantSettings = (seller: Seller, settings: RestaurantSettings): Partial<Seller> => ({
  theme: {
    ...seller.theme,
    customizations: {
      ...seller.theme?.customizations,
      restaurant: settings,
    },
  },
});

export const isRestaurant = (seller?: Seller | null): boolean =>
  seller?.shopType === 'service' && (seller.themeId || seller.theme?.selectedTheme) === 'restaurant';

export const isInstagramVip = (seller?: Seller | null): boolean =>
  seller?.shopType === 'service' && (seller.themeId || seller.theme?.selectedTheme) === 'instagram-vip';

export const readRestaurantOrder = (order: Order): RestaurantOrderData | null => {
  try {
    const payload = JSON.parse(order.deliveryLocation || 'null');
    return payload?.platform === 'restaurant' ? (payload as RestaurantOrderData) : null;
  } catch {
    return null;
  }
};

export const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  try {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return timeString;
  }
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
};

export const getCategoryLabel = (category: MenuItemCategory): string => {
  const labels: Record<MenuItemCategory, string> = {
    appetizer: 'Starters',
    main: 'Mains',
    dessert: 'Desserts',
    drink: 'Drinks',
    special: 'Chef\'s Specials',
  };
  return labels[category];
};

export const getCategoryIcon = (category: MenuItemCategory): string => {
  const icons: Record<MenuItemCategory, string> = {
    appetizer: '🥂',
    main: '🍽️',
    dessert: '🍰',
    drink: '☕',
    special: '⭐',
  };
  return icons[category];
};

export const createDemoRestaurantMenu = (sellerId: string): Product[] => [
  {
    id: 'resto-demo-wedge',
    sellerId,
    name: 'Burrata & Heirloom Tomato Salad',
    description: 'Creamy burrata with roasted heirloom tomatoes, basil oil, and toasted focaccia croutons.',
    price: 18,
    category: 'appetizer',
    type: 'service',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1546069901-560988693209?auto=format&fit=crop&q=80&w=800'],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'resto-demo-tartare',
    sellerId,
    name: 'Tuna Tartare with Avocado',
    description: 'Hand-cut sushi-grade tuna with avocado, cucumber, and a citrus yuzu dressing.',
    price: 22,
    category: 'appetizer',
    type: 'service',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1579684387926-b95e4e4e54d6?auto=format&fit=crop&q=80&w=800'],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'resto-demo-pasta',
    sellerId,
    name: 'Handmade Tagliatelle Bolognese',
    description: 'Slow-cooked beef and pork ragù over fresh tagliatelle, finished with aged Parmigiano-Reggiano.',
    price: 28,
    category: 'main',
    type: 'service',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1551183053-bf9dd320da67?auto=format&fit=crop&q=80&w=800'],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'resto-demo-seafood',
    sellerId,
    name: 'Pan-Seared Sea Bass',
    description: 'Mediterranean sea bass with charred lemon, fennel confit, and herb gremolata.',
    price: 36,
    category: 'main',
    type: 'service',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1514272246352-aae084e9f63d?auto=format&fit=crop&q=80&w=800'],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'resto-demo-ribeye',
    sellerId,
    name: 'Dry-Aged Ribeye',
    description: '22oz dry-aged ribeye, grilled to order with bone marrow jus and seasonal vegetables.',
    price: 48,
    category: 'main',
    type: 'service',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1544949527-0406f2d53f78?auto=format&fit=crop&q=80&w=800'],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'resto-demo-tiramisu',
    sellerId,
    name: 'Espresso Tiramisu',
    description: 'Classic tiramisu made with house mascarpone and single-origin espresso.',
    price: 12,
    category: 'dessert',
    type: 'service',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&q=80&w=800'],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'resto-demo-affogato',
    sellerId,
    name: 'Vanilla Bean Affogato',
    description: 'House-made vanilla bean gelato "drowned" in hot espresso with a hint of amaro.',
    price: 10,
    category: 'dessert',
    type: 'service',
    status: 'active',
    images: ['https://images.unsplash.com/photo-15633789975016912724535196454357?auto=format&fit=crop&q=80&w=800'],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'resto-demo-wine',
    sellerId,
    name: 'House Wine Selection',
    description: 'A curated list of Old and New World wines available by the glass or bottle.',
    price: 14,
    category: 'drink',
    type: 'service',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1506572405772-faeb9a2a4d0b?auto=format&fit=crop&q=80&w=800'],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
];

export const createDemoRestaurantSeller = (): Seller => ({
  id: 'demo-seller',
  userId: '',
  storeName: 'Le Jardin',
  subdomain: 'demo',
  shopType: 'service',
  currency: 'USD',
  theme: {
    primaryColor: '#7a0c0c',
    secondaryColor: '#c4a484',
    fontFamily: 'Playfair Display',
    selectedTheme: 'restaurant',
    customizations: {
      restaurant: {
        ...defaultRestaurantSettings,
        cuisineType: 'French',
        serviceStyle: 'fine-dining',
        tableCount: 16,
      },
    },
  },
  subscription: { plan: 'starter', status: 'active', startDate: null, endDate: null },
  stats: { totalProducts: 0, totalOrders: 0, totalRevenue: 0, totalCustomers: 0 },
  isLive: false,
  createdAt: '',
});
