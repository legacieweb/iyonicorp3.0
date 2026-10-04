import type { Order, Product, Seller } from '../../../../services/api';

export type PosTerminalMode = 'table' | 'standalone';
export type PosDisplayType = 'classic' | 'kds' | 'customer';

export interface PosOrderData {
  platform: 'point-of-sale';
  terminalId?: string;
  tableNumber?: string;
  orderId?: string;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

export interface PosSettings {
  currency: string;
  taxRate: number;
  serviceCharge: number;
  rounding: 'none' | 'up' | 'down' | 'nearest';
  displayType: PosDisplayType;
  terminalMode: PosTerminalMode;
  tableNumbers: number;
  printerName?: string;
  receiptHeader: string;
  receiptFooter: string;
  autoPrintReceipts: boolean;
  requireCustomerInfo: boolean;
  showImages: boolean;
  compactLayout: boolean;
  kitchenCategories: string[];
  openDrawer: boolean;
  language: string;
}

export const defaultPosSettings: PosSettings = {
  currency: 'USD',
  taxRate: 8.75,
  serviceCharge: 0,
  rounding: 'none',
  displayType: 'classic',
  terminalMode: 'standalone',
  tableNumbers: 20,
  receiptHeader: 'Thank you for your order!',
  receiptFooter: 'We look forward to serving you again.',
  autoPrintReceipts: false,
  requireCustomerInfo: false,
  showImages: true,
  compactLayout: false,
  kitchenCategories: [],
  openDrawer: false,
  language: 'en',
};

export const getPosSettings = (seller?: Seller | null): PosSettings => {
  const saved = seller?.theme?.customizations?.pointOfSale || {};
  const merged = { ...defaultPosSettings, ...saved };
  if (merged.currency === 'USD' && seller?.currency) {
    merged.currency = seller.currency;
  }
  return merged;
};

export const savePosSettings = (seller: Seller, settings: PosSettings): Partial<Seller> => ({
  theme: {
    ...seller.theme,
    customizations: {
      ...seller.theme?.customizations,
      pointOfSale: settings,
    },
  },
});

export const isPointOfSale = (seller?: Seller | null): boolean =>
  seller?.shopType === 'service' && (seller.themeId || seller.theme?.selectedTheme) === 'point-of-sale';

export const readPosOrder = (order: Order): PosOrderData | null => {
  try {
    const payload = JSON.parse(order.deliveryLocation || 'null');
    return payload?.platform === 'point-of-sale' ? (payload as PosOrderData) : null;
  } catch {
    return null;
  }
};

export const formatCurrency = (amount: number, currency: string): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || 'USD'} ${amount.toFixed(2)}`;
  }
};

export const formatTime = (dateString: string): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export const calculateTax = (amount: number, taxRate: number): number => {
  return (amount * taxRate) / 100;
};

export const calculateTotalWithTax = (
  amount: number,
  taxRate: number,
  serviceCharge: number,
  rounding: PosSettings['rounding']
): number => {
  const tax = calculateTax(amount, taxRate);
  const serviceFee = serviceCharge > 0 ? (amount * serviceCharge) / 100 : 0;
  let total = amount + tax + serviceFee;
  switch (rounding) {
    case 'up':
      return Math.ceil(total);
    case 'down':
      return Math.floor(total);
    case 'nearest':
      return Math.round(total);
    default:
      return Math.round(total * 100) / 100;
  }
};

export const getCategoryName = (category: string): string => {
  const names: Record<string, string> = {
    appetizer: 'Starters',
    main: 'Mains',
    dessert: 'Desserts',
    drink: 'Drinks',
    special: "Chef's Specials",
    sides: 'Sides',
    default: 'Menu',
  };
  return names[category] || names.default;
};

export const createDemoPosMenu = (sellerId: string): Product[] => [
  {
    id: 'pos-demo-coffee',
    sellerId,
    name: 'Espresso',
    description: 'Rich Italian espresso shot.',
    price: 3,
    category: 'drink',
    type: 'service',
    status: 'active',
    images: [],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'pos-demo-cappuccino',
    sellerId,
    name: 'Cappuccino',
    description: 'Espresso with steamed milk foam.',
    price: 4.5,
    category: 'drink',
    type: 'service',
    status: 'active',
    images: [],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'pos-demo-sandwich',
    sellerId,
    name: 'Avocado Toast',
    description: 'Smashed avocado on sourdough with chili flakes.',
    price: 9,
    category: 'main',
    type: 'service',
    status: 'active',
    images: [],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'pos-demo-salad',
    sellerId,
    name: 'Caesar Salad',
    description: 'Fresh romaine with parmesan and house dressing.',
    price: 11,
    category: 'main',
    type: 'service',
    status: 'active',
    images: [],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'pos-demo-cookie',
    sellerId,
    name: 'Chocolate Chip Cookie',
    description: 'Warm-baked with sea salt.',
    price: 4,
    category: 'dessert',
    type: 'service',
    status: 'active',
    images: [],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
];

export const createDemoPosSeller = (): Seller => ({
  id: 'pos-demo-seller',
  userId: '',
  storeName: 'Corner Café',
  subdomain: 'pos-demo',
  shopType: 'service',
  currency: 'USD',
  theme: {
    primaryColor: '#7c3609',
    secondaryColor: '#d97706',
    fontFamily: 'Inter',
    selectedTheme: 'point-of-sale',
    customizations: {
      pointOfSale: {
        ...defaultPosSettings,
        receiptHeader: 'Corner Café',
      },
    },
  },
  subscription: { plan: 'starter', status: 'active', startDate: null, endDate: null },
  stats: { totalProducts: 0, totalOrders: 0, totalRevenue: 0, totalCustomers: 0 },
  isLive: false,
  createdAt: '',
});
