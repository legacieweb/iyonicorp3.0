import type { Order, Seller } from '../../../services/api';

export type VendorStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface MarketOrderData {
  platform: 'craft-collective';
  marketplaceId: string;
  vendorId: string;
  vendorName: string;
  shippingAddress?: string;
  deliveryNotes?: string;
}

export interface VendorApplication {
  id: string;
  sellerId: string;
  sellerName: string;
  subdomain: string;
  storeName: string;
  description: string;
  logo: string;
  categories: string[];
  status: VendorStatus;
  joinedAt: string;
  commissionRate: number;
  featured: boolean;
  totalSales: number;
}

export interface MarketSettings {
  currency: string;
  commissionRate: number;
  featuredCategories: string[];
  vendorStatuses: Record<string, VendorStatus>;
  announcements: { id: string; title: string; content: string; active: boolean }[];
  marketplaceName: string;
  marketplaceDescription: string;
  contactEmail: string;
  contactPhone: string;
  shippingPolicy: string;
  returnPolicy: string;
  vendorApprovalRequired: boolean;
  minimumOrderValue: number;
  featuredVendorIds: string[];
}

export const defaultMarketSettings: MarketSettings = {
  currency: 'USD',
  commissionRate: 10,
  featuredCategories: ['Home', 'Jewelry', 'Art', 'Fashion'],
  vendorStatuses: {},
  announcements: [],
  marketplaceName: 'Craft Collective',
  marketplaceDescription: 'A curated marketplace for independent artisans and craft makers.',
  contactEmail: '',
  contactPhone: '',
  shippingPolicy: 'Free shipping on orders over $75.',
  returnPolicy: '30-day returns on all items.',
  vendorApprovalRequired: true,
  minimumOrderValue: 0,
  featuredVendorIds: [],
};

export const getMarketSettings = (seller?: Seller | null): MarketSettings => {
  const saved = seller?.theme?.customizations?.craftCollective || {};
  return {
    ...defaultMarketSettings,
    ...saved,
    announcements: saved.announcements || [],
    featuredVendorIds: saved.featuredVendorIds || [],
    vendorStatuses: saved.vendorStatuses || {},
    featuredCategories: saved.featuredCategories || defaultMarketSettings.featuredCategories,
  };
};

export const readMarketOrder = (order: Order): MarketOrderData | null => {
  try {
    const payload = JSON.parse(order.deliveryLocation || 'null');
    return payload?.platform === 'craft-collective' ? payload as MarketOrderData : null;
  } catch {
    return null;
  }
};

export const isCraftCollective = (seller?: Seller | null): boolean =>
  seller?.shopType === 'product' && (seller.themeId || seller.theme?.selectedTheme) === 'craft-collective';

export const saveMarketSettings = (seller: Seller, settings: MarketSettings): Partial<Seller> => ({
  theme: { ...seller.theme, customizations: { ...seller.theme?.customizations, craftCollective: settings } },
});

export const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const timeAgo = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(dateString);
  } catch {
    return '';
  }
};
