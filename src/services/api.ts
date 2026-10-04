import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:2823/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('iyonicorp_token');
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || '';
    if (error.response?.status === 403 && /suspend/i.test(message)) {
      localStorage.removeItem('iyonicorp_token');
      window.dispatchEvent(new CustomEvent('iyonicorp:account-suspended', { detail: { message } }));
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  username?: string;
  role: 'seller' | 'seller_manager' | 'manager_admin' | 'customer';
  avatar?: string;
  createdAt: string;
  sellerId?: string;
  storeName?: string;
  storeCurrency?: string;
  ownerName?: string;
  ownerEmail?: string;
  managerId?: string;
  managerSlug?: string;
  iyonicpayOptIn: boolean;
  isSuspended: boolean;
  stores?: Store[];
  lastSelectedStoreId?: string;
}

export interface Store {
  id: string;
  storeName: string;
  subdomain: string;
  logo?: string;
  storeCurrency?: string;
}

export interface NLMSong {
  id: string;
  title: string;
  artist: string;
  description: string;
  genre: string;
  tags: string[];
  lyrics: string;
  audioUrl: string;
  thumbnailUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sellerId: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Discount {
  id: string;
  sellerId: string;
  code?: string; // If null, it's an automatic discount
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping' | 'cross_discount';
  value: number; // For percentage or fixed_amount
  minRequirement?: {
    type: 'amount' | 'quantity';
    value: number;
  };
  buyXGetY?: {
    buyQuantity: number;
    buyProductIds: string[];
    getQuantity: number;
    getProductIds: string[];
    discountType: 'percentage' | 'free';
    discountValue?: number;
  };
  crossDiscount?: {
    requiredProductIds: string[]; // Buy A + B
    rewardProductIds: string[]; // Get C
    discountType: 'percentage' | 'fixed_amount' | 'free';
    discountValue?: number;
  };
  appliesTo: 'all_products' | 'specific_products' | 'specific_categories';
  productIds?: string[];
  categoryIds?: string[];
  usageLimit?: number;
  usageCount: number;
  minSpend?: number;
  minQuantity?: number;
  status: 'active' | 'scheduled' | 'expired';
  startDate: string;
  endDate?: string;
  createdAt: string;
}

export interface DeliveryLocation {
  id: string;
  type: 'country' | 'state' | 'subcounty' | 'custom';
  name: string;
  parentId?: string;
  fee: number;
  deliveryPeriod?: string;
  enabled: boolean;
}

export interface PaymentTerms {
  methods: ('pod' | 'site' | 'deposit')[];
  depositPercentage: number;
  rules: 'all' | 'returning';
}

export interface Seller {
  id: string;
  userId: string;
  storeName: string;
  ownerName?: string;
  ownerEmail?: string;
  subdomain: string;
  shopType: 'product' | 'service' | 'payment';
  description?: string;
  logo?: string;
  shippingPolicy?: string;
  returnPolicy?: string;
  privacyPolicy?: string;
  termsOfService?: string;
  additionalPages?: { title: string; content: string }[];
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
    whatsapp?: string;
  };
  currency?: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    selectedTheme?: string;
    customizations?: any;
  };
  subscription: {
    plan: 'starter' | 'basic' | 'professional' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    startDate: string | null;
    endDate: string | null;
  };
  stats: {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
  };
  requestedSubdomain?: string;
  isLive: boolean;
  themeId?: string;
  acquiredThemes?: string[];
  managerId?: string;
  createdAt: string;
  paymentGateways?: {
    active: string;
    iyonicpay: { enabled: boolean };
    custom: { enabled: boolean; provider: string; apiKey: string; publicKey: string; link: string };
  };
  pricingConfig?: PricingConfig;
  discounts?: Discount[];
  deliveryLocations?: DeliveryLocation[];
  paymentTerms?: PaymentTerms;
}

export interface PricingPlan {
  price: number;
  status: string;
  features: string[];
  productLimit?: number;
  sellerLimit?: number;
}

export interface PricingConfig {
  plans: {
    starter: PricingPlan;
    basic: PricingPlan;
    professional: PricingPlan;
    enterprise: PricingPlan;
  };
  currency: string;
  billingCycle: string;
  customBranding: boolean;
}

export interface SellerManager {
  id: string;
  userId: string;
  slug: string;
  displayName: string;
  description?: string;
  logo?: string;
  commissionRate: number;
  isActive: boolean;
  pricingConfig?: PricingConfig;
  createdAt: string;
  stats: {
    totalSellers: number;
    activeSellers: number;
    totalRevenue: number;
    totalCommission: number;
  };
  commission: number;
  sellerCount?: number;
  subscription?: {
    plan: 'starter' | 'basic' | 'professional' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    startDate: string | null;
    endDate: string | null;
  };
}

export interface Product {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  type: 'product' | 'service' | 'payment';
  images: string[];
  videos?: string[];
  urls?: string[];
  stock: number;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  sellerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  sellerId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: OrderItem[];
  total: number;
  subtotal?: number;
  originalTotal?: number;
  discountAmount?: number;
  discount?: {
    code?: string;
    name: string;
    type: string;
    value: number;
    amount: number;
  };
  couponCode?: string;
  couponId?: string;
  currency?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refund_requested' | 'refunded';
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  deliveryLocation?: string;
createdAt: string;
  updatedAt: string;
  sellerStoreName?: string;
  paymentLink?: string;
  reference?: string;
   paymentMethod?: 'iyonicpay' | 'paystack' | 'custom' | 'pod';
   paymentType?: 'site' | 'pod' | 'deposit';
   amountPaid?: number;
   remainingBalance?: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Customer {
  id: string;
  sellerId: string;
  name: string;
  email: string;
  phone?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  stores?: string[];
  sellerCount?: number;
}

export interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  revenueGrowth: number;
  ordersGrowth: number;
  recentOrders: Order[];
  salesByMonth: { month: string; revenue: number }[];
  topProducts: { name: string; sales: number }[];
}

export interface ManagerAnalytics {
  totalSellers: number;
  activeSellers: number;
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalCommission: number;
  commissionRate: number;
}

export const authAPI = {
  async login(email: string, password: string): Promise<User> {
    const response = await api.post('/auth/login', { email, password });
    const { user, token } = response.data;
    if (token) localStorage.setItem('iyonicorp_token', token);
    return user;
  },

  async register(data: {
    email: string;
    password: string;
    name: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    role: 'seller' | 'seller_manager' | 'customer';
    storeName?: string;
    subdomain?: string;
    shopType?: 'product' | 'service' | 'payment';
    managerId?: string;
    sellerId?: string;
    themeId?: string;
  }): Promise<User> {
    const response = await api.post('/auth/register', data);
    const { user, token } = response.data;
    if (token) localStorage.setItem('iyonicorp_token', token);
    return user;
  },

  async linkStore(data: { email: string; password: string; sellerId: string }): Promise<User> {
    const response = await api.post('/auth/link-store', data);
    const { user, token } = response.data;
    if (token) localStorage.setItem('iyonicorp_token', token);
    return user;
  },

  async selectStore(sellerId: string): Promise<{ token: string; sellerId: string }> {
    const response = await api.post('/auth/select-store', { sellerId });
    const { token } = response.data;
    if (token) localStorage.setItem('iyonicorp_token', token);
    return response.data;
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      return null;
    }
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async verifyOTP(email: string, otp: string): Promise<{ message: string; resetToken: string }> {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
  },

  async resetPassword(resetToken: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post('/auth/reset-password', { resetToken, newPassword });
    return response.data;
  },
};

export const sellersAPI = {
  async getMe(): Promise<Seller> {
    const response = await api.get('/sellers/me');
    return response.data;
  },
  
  async updateMe(updates: Partial<Seller>): Promise<Seller> {
    const response = await api.patch('/sellers/me', updates);
    return response.data;
  },

  async initializeThemePurchase(themeId: string): Promise<any> {
    const response = await api.post('/sellers/me/themes/purchase/initialize', { themeId });
    return response.data;
  },

  async verifyThemePurchase(themeId: string, reference: string): Promise<{ acquiredThemes: string[] }> {
    const response = await api.post('/sellers/me/themes/purchase/verify', { themeId, reference });
    return response.data;
  },

  async makeThemeOffer(themeId: string, amount: number, message: string): Promise<void> {
    await api.post('/sellers/me/themes/offers', { themeId, amount, message });
  },

  async getAll(): Promise<Seller[]> {
    const response = await api.get('/sellers');
    return response.data;
  },

  async approveSubdomain(id: string, subdomain: string): Promise<Seller> {
    const response = await api.post(`/sellers/${id}/approve-subdomain`, { subdomain });
    return response.data;
  },

  async getPublicById(id: string): Promise<Seller> {
    const response = await api.get(`/sellers/${id}/public`);
    return response.data;
  },

  async paySubscriptionWithWallet(planId: string): Promise<any> {
    const response = await api.post('/sellers/me/pay-subscription', { planId });
    return response.data;
  },

  async getBilling(): Promise<any> {
    const response = await api.get('/sellers/me/billing');
    return response.data;
  },

  async getAutoRenew(): Promise<any> {
    const response = await api.get('/billing/auto-renew');
    return response.data;
  },

  async updateAutoRenew(platform: string, enabled: boolean, planId?: string): Promise<any> {
    const response = await api.patch('/billing/auto-renew', { platform, enabled, planId });
    return response.data;
  },

  async getUnifiedBilling(): Promise<any> {
    const response = await api.get('/billing/unified');
    return response.data;
  },

  async subscribeUnified(bundles: any): Promise<any> {
    const response = await api.post('/billing/unified/subscribe', bundles);
    return response.data;
  },

  async cancelUnifiedSubscription(platform?: string): Promise<any> {
    const response = await api.delete('/billing/unified/cancel', { data: platform ? { platform } : {} });
    return response.data;
  },
};

export interface IXStreamEpisode {
  id: string;
  seasonId: string;
  episodeNumber: number;
  title: string;
  description: string;
  duration: number | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IXStreamSeason {
  id: string;
  contentId: string;
  seasonNumber: number;
  title: string | null;
  description: string;
  episodes?: IXStreamEpisode[];
  createdAt: string;
  updatedAt: string;
}

export interface IXStreamContent {
  id: string;
  sellerId: string | null;
  title: string;
  description: string;
  type: 'movie' | 'tvshow';
  genre: string;
  tags: string[];
  releaseYear: number | null;
  duration: number | null;
  rating: number | null;
  thumbnailUrl: string | null;
  videoUrl: string;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  seasons?: IXStreamSeason[];
}

export interface IXStreamSubscriptionPlan {
  id: string;
  sellerId: string | null;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  intervalType: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface IXStreamSubscription {
  id: string;
  userId: string;
  sellerId: string | null;
  planId: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'expired';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  paymentReference: string | null;
  plan?: IXStreamSubscriptionPlan;
  createdAt: string;
  updatedAt: string;
}

export const ixstreamAPI = {
  async listContent(params?: { type?: 'movie' | 'tvshow'; genre?: string; search?: string }): Promise<IXStreamContent[]> {
    const response = await api.get('/ixstream/content', { params });
    return response.data;
  },

  async listAdminContent(params?: { type?: 'movie' | 'tvshow' }): Promise<IXStreamContent[]> {
    const response = await api.get('/ixstream/content/admin', { params });
    return response.data;
  },

  async getContent(id: string): Promise<IXStreamContent> {
    const response = await api.get(`/ixstream/content/${id}`);
    return response.data;
  },

  async createContent(data: FormData): Promise<IXStreamContent> {
    const response = await api.post('/ixstream/content', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },

  async updateContent(id: string, data: FormData): Promise<IXStreamContent> {
    const response = await api.patch(`/ixstream/content/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },

  async deleteContent(id: string): Promise<void> {
    await api.delete(`/ixstream/content/${id}`);
  },

  async listSeasons(contentId: string): Promise<IXStreamSeason[]> {
    const response = await api.get(`/ixstream/content/${contentId}/seasons`);
    return response.data;
  },

  async createSeason(data: { contentId: string; seasonNumber: number; title?: string; description?: string }): Promise<IXStreamSeason> {
    const response = await api.post(`/ixstream/content/${data.contentId}/seasons`, data);
    return response.data;
  },

  async createEpisode(data: FormData): Promise<IXStreamEpisode> {
    const response = await api.post('/ixstream/episodes', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },

  async updateEpisode(id: string, data: FormData): Promise<IXStreamEpisode> {
    const response = await api.patch(`/ixstream/episodes/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },

  async deleteEpisode(id: string): Promise<void> {
    await api.delete(`/ixstream/episodes/${id}`);
  },

  async listEpisodes(seasonId: string): Promise<IXStreamEpisode[]> {
    const response = await api.get(`/ixstream/seasons/${seasonId}/episodes`);
    return response.data;
  },

  async listPlans(): Promise<IXStreamSubscriptionPlan[]> {
    const response = await api.get('/ixstream/plans');
    return response.data;
  },

  async createPlan(data: Partial<IXStreamSubscriptionPlan>): Promise<IXStreamSubscriptionPlan> {
    const response = await api.post('/ixstream/plans', data);
    return response.data;
  },

  async updatePlan(id: string, updates: Partial<IXStreamSubscriptionPlan>): Promise<IXStreamSubscriptionPlan> {
    const response = await api.patch(`/ixstream/plans/${id}`, updates);
    return response.data;
  },

  async deletePlan(id: string): Promise<void> {
    await api.delete(`/ixstream/plans/${id}`);
  },

  async getUserSubscriptions(): Promise<IXStreamSubscription[]> {
    const response = await api.get('/ixstream/subscriptions');
    return response.data;
  },

  async subscribe(planId: string): Promise<IXStreamSubscription> {
    const response = await api.post('/ixstream/subscriptions', { planId });
    return response.data;
  },

  async unsubscribe(id: string): Promise<IXStreamSubscription> {
    const response = await api.patch(`/ixstream/subscriptions/${id}/cancel`, {});
    return response.data;
  },

  async initializeSubscriptionPayment(planId: string): Promise<{ authorizationUrl: string; reference: string }> {
    const response = await api.post('/ixstream/subscriptions/paystack/initialize', { planId });
    return response.data;
  },

  async verifySubscriptionPayment(reference: string): Promise<{ success: boolean; subscription: IXStreamSubscription }> {
    const response = await api.post('/ixstream/subscriptions/paystack/verify', { reference });
    return response.data;
  },
};

export const nlmsongsAPI = {
  async list(): Promise<NLMSong[]> {
    const response = await api.get('/nlmsongs');
    return response.data;
  },

  async listAdmin(): Promise<NLMSong[]> {
    const response = await api.get('/nlmsongs/admin');
    return response.data;
  },

  async create(data: FormData): Promise<NLMSong> {
    const response = await api.post('/nlmsongs', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },

  async update(id: string, data: FormData): Promise<NLMSong> {
    const response = await api.patch(`/nlmsongs/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/nlmsongs/${id}`);
  }
};

export const messagesAPI = {
  async getAll(): Promise<Message[]> {
    const response = await api.get('/messages');
    return response.data;
  },
  
  async sendPublic(subdomain: string, data: { name: string; email: string; subject?: string; message: string }): Promise<Message> {
    const response = await api.post(`/messages/public/${subdomain}`, data);
    return response.data;
  },
  
  async markRead(id: string): Promise<void> {
    await api.patch(`/messages/${id}/read`);
  },
  
  async delete(id: string): Promise<void> {
    await api.delete(`/messages/${id}`);
  },
};

export const sellerManagersAPI = {
  async getMe(): Promise<SellerManager> {
    const response = await api.get('/seller-managers/me');
    return response.data;
  },
  
  async getAll(): Promise<SellerManager[]> {
    const response = await api.get('/seller-managers');
    return response.data;
  },

  async getBySlug(slug: string): Promise<SellerManager> {
    const response = await api.get(`/seller-managers/slug/${slug}`);
    return response.data;
  },

  async getById(id: string): Promise<SellerManager> {
    const response = await api.get(`/seller-managers/${id}`);
    return response.data;
  },

  async updateProfile(updates: { displayName?: string; description?: string; logo?: string; commissionRate?: number }): Promise<SellerManager> {
    const response = await api.patch('/seller-managers/me', updates);
    return response.data;
  },

  async updateSlug(slug: string): Promise<SellerManager> {
    const response = await api.patch('/seller-managers/me/slug', { slug });
    return response.data;
  },

  async updatePricing(pricingConfig: PricingConfig): Promise<SellerManager> {
    const response = await api.patch('/seller-managers/me/pricing', { pricingConfig });
    return response.data;
  },

  async assignSeller(sellerId: string): Promise<Seller> {
    const response = await api.post('/seller-managers/me/assign-seller', { sellerId });
    return response.data;
  },

  async unassignSeller(sellerId: string): Promise<Seller> {
    const response = await api.post('/seller-managers/me/unassign-seller', { sellerId });
    return response.data;
  },

  async getAvailableSellers(): Promise<Seller[]> {
    const response = await api.get('/seller-managers/me/available-sellers');
    return response.data;
  },

  async getCustomers(): Promise<Customer[]> {
    const response = await api.get('/seller-managers/me/customers');
    return response.data;
  },

  async getOrders(): Promise<Order[]> {
    const response = await api.get('/seller-managers/me/orders');
    return response.data;
  },

  async update(id: string, updates: Partial<SellerManager>): Promise<SellerManager> {
    const response = await api.patch(`/seller-managers/${id}`, updates);
    return response.data;
  },

  async getAnalytics(): Promise<ManagerAnalytics> {
    const response = await api.get('/seller-managers/me/analytics');
    return response.data;
  },
};

export const discountsAPI = {
  async getAll(): Promise<Discount[]> {
    const response = await api.get('/discounts');
    return response.data;
  },

  async create(data: Partial<Discount>): Promise<Discount> {
    const response = await api.post('/discounts', data);
    return response.data;
  },

  async update(id: string, updates: Partial<Discount>): Promise<Discount> {
    const response = await api.patch(`/discounts/${id}`, updates);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/discounts/${id}`);
  },

  async getPublicBySeller(sellerId: string): Promise<Discount[]> {
    const response = await api.get(`/discounts/public/${sellerId}`);
    return response.data;
  },

  async validateCoupon(sellerId: string, code: string): Promise<Discount> {
    const response = await api.post(`/discounts/validate`, { sellerId, code });
    return response.data;
  }
};

export const categoriesAPI = {
  async getAll(): Promise<Category[]> {
    const response = await api.get('/categories');
    return response.data;
  },
  async create(name: string): Promise<Category> {
    const response = await api.post('/categories', { name });
    return response.data;
  },
};

export const uploadAPI = {
  async upload(files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.urls;
  },
};

export const productsAPI = {
  async getBySellerId(sellerId: string): Promise<Product[]> {
    const response = await api.get('/products', { params: { seller_id: sellerId } });
    return response.data;
  },

  async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const response = await api.post('/products', product);
    return response.data;
  },

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    const response = await api.put(`/products/${id}`, updates);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },

  async getById(id: string): Promise<Product> {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },
};

export const ordersAPI = {
  async getAll(): Promise<Order[]> {
    const response = await api.get('/orders');
    return response.data;
  },

  async getMine(): Promise<Order[]> {
    const response = await api.get('/orders/my');
    return response.data;
  },

  async getBySellerId(sellerId: string): Promise<Order[]> {
    const response = await api.get('/orders', { params: { seller_id: sellerId } });
    return response.data;
  },

  async create(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const response = await api.post('/orders', order);
    return response.data;
  },

  async updateStatus(id: string, status: string): Promise<Order> {
    const response = await api.patch(`/orders/${id}`, { status });
    return response.data;
  },
  async update(id: string, updates: Partial<Order>): Promise<Order> {
    const response = await api.patch(`/orders/${id}`, updates);
    return response.data;
  },
  async getById(id: string): Promise<Order> {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
  async verifyPayment(reference: string, orderId?: string): Promise<{ success: boolean; orderId: string }> {
    const response = await api.post('/orders/verify-payment', { reference, orderId });
    return response.data;
  },
  async search(orderId: string, email: string): Promise<Order> {
    const response = await api.get('/orders/search', { params: { orderId, email } });
    return response.data;
  },
  async requestRefund(id: string, reason: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/orders/${id}/refund`, { reason });
    return response.data;
  },
};

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  customerName: string;
  customerEmail?: string;
  rating: number;
  comment: string;
  isVerified: boolean;
  createdAt: string;
}

export type SocialMediaPlatform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok';

export interface SocialMediaAccount {
  id: string;
  sellerId: string;
  platform: SocialMediaPlatform;
  username: string;
  profileUrl: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  followers: number;
  isConnected: boolean;
  lastSynced?: string;
  connectedAt: string;
}

export interface SocialMediaPost {
  id: string;
  sellerId: string;
  accountId: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  scheduledAt?: string;
  postedAt?: string;
  status: 'draft' | 'scheduled' | 'posting' | 'posted' | 'failed';
  postUrl?: string;
  errorMessage?: string;
}

export interface EmailSettings {
  id: string;
  sellerId: string;
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'aws-ses' | 'sendinblue' | 'postmark';
  fromEmail: string;
  fromName: string;
  replyTo: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  apiKey?: string;
  isActive: boolean;
  isVerified: boolean;
  sentCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  sellerId: string;
  name: string;
  slug: string;
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  category: 'transactional' | 'promotional' | 'notification' | 'welcome' | 'abandoned_cart' | 'custom';
  isDefault: boolean;
  isActive: boolean;
  variables: string[];
  previewImage?: string;
  createdAt: string;
  updatedAt: string;
}

export type EmailCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed';

export interface EmailCampaign {
  id: string;
  sellerId: string;
  name: string;
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  templateId?: string;
  recipientType: 'all' | 'segment' | 'custom';
  segmentFilter?: {
    field: 'totalSpent' | 'totalOrders' | 'lastOrderDate' | 'joinedDate' | 'country';
    operator: 'gt' | 'lt' | 'eq' | 'ne' | 'between' | 'contains';
    value: any;
  };
  customRecipients?: string[]; // Email addresses
  scheduledAt?: string;
  sentAt?: string;
  status: EmailCampaignStatus;
  totalRecipients: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  complaintCount: number;
  unsubscribeCount: number;
  template?: EmailTemplate;
  createdAt: string;
  updatedAt: string;
}

export const reviewsAPI = {
  async getByProductId(productId: string): Promise<Review[]> {
    const response = await api.get(`/products/${productId}/reviews`);
    return response.data;
  },

  async getSellerReviews(): Promise<Review[]> {
    const response = await api.get('/reviews/seller');
    return response.data;
  },

  async verifyPurchase(productId: string, customerEmail: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/reviews/verify-purchase', { productId, customerEmail });
    return response.data;
  },

  async create(data: {
    productId: string;
    customerName: string;
    customerEmail: string;
    rating: number;
    comment: string;
  }): Promise<Review> {
    const response = await api.post('/reviews', data);
    return response.data;
  },
};

export const customersAPI = {
  async getBySellerId(sellerId: string): Promise<Customer[]> {
    const response = await api.get('/customers', { params: { seller_id: sellerId } });
    return response.data;
  },
};

export const analyticsAPI = {
  async getSellerAnalytics(sellerId: string): Promise<Analytics> {
    const response = await api.get(`/analytics/seller/${sellerId}`);
    return response.data;
  },

  async getAdminStats() {
    const response = await api.get('/admin/stats');
    return response.data;
  },
};

export const adminAPI = {
  async inviteManager(data: { firstName: string; lastName: string; email: string; commissionRate?: number }): Promise<{ message: string }> {
    const response = await api.post('/admin/seller-managers/invite', data);
    return response.data;
  },
  async getManagerInvitations() {
    const response = await api.get('/admin/seller-manager-invitations');
    return response.data;
  },
  async getAllUsers(): Promise<User[]> {
    const response = await api.get('/users');
    return response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  async toggleUserSuspension(id: string): Promise<{ message: string; isSuspended: boolean; emailSent: boolean }> {
    const response = await api.patch(`/users/${id}/suspend`);
    return response.data;
  },

  async getIyonicPayStats() {
    const response = await api.get('/admin/iyonicpay/stats');
    return response.data;
  },

  async getAllTransactions() {
    const response = await api.get('/admin/iyonicpay/transactions');
    return response.data;
  },

  async getAllWithdrawals() {
    const response = await api.get('/admin/iyonicpay/withdrawals');
    return response.data;
  },

  async getAllWallets() {
    const response = await api.get('/admin/iyonicpay/wallets');
    return response.data;
  },

  async updateWithdrawalStatus(id: string, status: 'completed' | 'failed') {
    const response = await api.patch(`/admin/iyonicpay/withdrawals/${id}`, { status });
    return response.data;
  },

  async getActivities() {
    const response = await api.get('/admin/activities');
    return response.data;
  },

  async getSystemStats() {
    const response = await api.get('/admin/system/stats');
    return response.data;
  },

  async getSecurityEvents() {
    const response = await api.get('/admin/security/events');
    return response.data;
  },

  async updateSeller(id: string, updates: { storeName?: string; isLive?: boolean; subscription?: any }) {
    const response = await api.patch(`/admin/sellers/${id}`, updates);
    return response.data;
  },

  async deleteSeller(id: string) {
    await api.delete(`/admin/sellers/${id}`);
  },
};

export const managerInvitationAPI = {
  async get(token: string) {
    const response = await api.get(`/auth/manager-invitation/${token}`);
    return response.data;
  },
  async accept(data: { token: string; firstName: string; lastName: string; phoneNumber: string; password: string }) {
    const response = await api.post('/auth/accept-manager-invitation', data);
    return response.data;
  },
};

export const userAPI = {
  async updateProfile(data: { name?: string; firstName?: string; lastName?: string; phoneNumber?: string; avatar?: string }): Promise<User> {
    const response = await api.put('/user/profile', data);
    return response.data;
  },

  async getAddresses(): Promise<any[]> {
    const response = await api.get('/user/addresses');
    return response.data;
  },

  async addAddress(data: any): Promise<any> {
    const response = await api.post('/user/addresses', data);
    return response.data;
  },

  async updateAddress(id: string, data: any): Promise<any> {
    const response = await api.put(`/user/addresses/${id}`, data);
    return response.data;
  },

  async deleteAddress(id: string): Promise<void> {
    await api.delete(`/user/addresses/${id}`);
  },
};

export const socialMediaAPI = {
  async getBySellerId(sellerId: string): Promise<SocialMediaAccount[]> {
    const response = await api.get(`/social-media/seller/${sellerId}`);
    return response.data;
  },

  async connect(data: { sellerId: string; platform: SocialMediaPlatform; accessToken: string; username: string; profileUrl: string; expiresIn?: number }): Promise<SocialMediaAccount> {
    const response = await api.post('/social-media/connect', data);
    return response.data;
  },

  async disconnect(accountId: string): Promise<void> {
    await api.delete(`/social-media/${accountId}`);
  },

  async refresh(accountId: string): Promise<SocialMediaAccount> {
    const response = await api.post(`/social-media/${accountId}/refresh`);
    return response.data;
  },

  async shareToSocial(accountId: string, data: { content: string; imageUrl?: string; linkUrl: string }): Promise<{ success: boolean; postUrl?: string }> {
    const response = await api.post(`/social-media/${accountId}/share`, data);
    return response.data;
  },

  async getPosts(sellerId: string): Promise<SocialMediaPost[]> {
    const response = await api.get(`/social-media/posts/seller/${sellerId}`);
    return response.data;
  },

  async createPost(data: Partial<SocialMediaPost>): Promise<SocialMediaPost> {
    const response = await api.post('/social-media/posts', data);
    return response.data;
  },

  async updatePost(id: string, updates: Partial<SocialMediaPost>): Promise<SocialMediaPost> {
    const response = await api.patch(`/social-media/posts/${id}`, updates);
    return response.data;
  },

  async deletePost(id: string): Promise<void> {
    await api.delete(`/social-media/posts/${id}`);
  },
};

export const emailMarketingAPI = {
  async getSettings(sellerId: string): Promise<EmailSettings | null> {
    try {
      const response = await api.get(`/email-marketing/settings/seller/${sellerId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  async saveSettings(data: Partial<EmailSettings>): Promise<EmailSettings> {
    const response = await api.post('/email-marketing/settings', data);
    return response.data;
  },

  async updateSettings(id: string, updates: Partial<EmailSettings>): Promise<EmailSettings> {
    const response = await api.patch(`/email-marketing/settings/${id}`, updates);
    return response.data;
  },

  async sendTestEmail(data: { to: string; subject: string; html: string; settingsId?: string }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post('/email-marketing/test', data);
      return response.data;
    } catch (error: any) {
      const message = error?.response?.data?.message || error.message || 'Failed to send test email';
      return { success: false, message };
    }
  },

  async verifySettings(id: string): Promise<{ verified: boolean; message: string }> {
    const response = await api.post(`/email-marketing/settings/${id}/verify`);
    return response.data;
  },

  async getCampaigns(sellerId: string): Promise<EmailCampaign[]> {
    const response = await api.get(`/email-marketing/campaigns/seller/${sellerId}`);
    return response.data;
  },

  async createCampaign(data: Partial<EmailCampaign>): Promise<EmailCampaign> {
    const response = await api.post('/email-marketing/campaigns', data);
    return response.data;
  },

  async updateCampaign(id: string, updates: Partial<EmailCampaign>): Promise<EmailCampaign> {
    const response = await api.patch(`/email-marketing/campaigns/${id}`, updates);
    return response.data;
  },

  async deleteCampaign(id: string): Promise<void> {
    await api.delete(`/email-marketing/campaigns/${id}`);
  },

  async sendCampaign(id: string): Promise<{ queued: boolean; message: string }> {
    const response = await api.post(`/email-marketing/campaigns/${id}/send`);
    return response.data;
  },

  async scheduleCampaign(id: string, scheduledAt: string): Promise<{ scheduled: boolean }> {
    const response = await api.post(`/email-marketing/campaigns/${id}/schedule`, { scheduledAt });
    return response.data;
  },

  async getCampaignStats(id: string): Promise<{ delivered: number; opened: number; clicked: number; bounced: number; unsubscribe: number }> {
    const response = await api.get(`/email-marketing/campaigns/${id}/stats`);
    return response.data;
  },

  async getTemplates(sellerId: string): Promise<EmailTemplate[]> {
    const response = await api.get(`/email-marketing/templates/seller/${sellerId}`);
    return response.data;
  },

  async createTemplate(data: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const response = await api.post('/email-marketing/templates', data);
    return response.data;
  },

  async updateTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const response = await api.patch(`/email-marketing/templates/${id}`, updates);
    return response.data;
  },

  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`/email-marketing/templates/${id}`);
  },

  async getDefaultTemplates(): Promise<EmailTemplate[]> {
    const response = await api.get('/email-marketing/templates/defaults');
    return response.data;
  },
};

export const marketingAPI = {
  async getStats(sellerId: string): Promise<any> {
    const response = await api.get(`/marketing/stats/seller/${sellerId}`);
    return response.data;
  },
};

export const refundsAPI = {
  async getAll(): Promise<any[]> {
    const response = await api.get('/iyonicpay/refunds');
    return response.data;
  },
  async updateStatus(id: string, action: 'approve' | 'reject'): Promise<any> {
    const response = await api.patch(`/iyonicpay/refunds/${id}`, { action });
    return response.data;
  },
};

export interface Bot {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'training';
  sellerId?: string;
  widgetConfig?: {
    primaryColor: string;
    greeting: string;
    bubbleIcon: string;
  };
  customResponses?: {
    greeting?: string;
    greetingResponse?: string;
    identity?: string;
    shipping?: string;
    returns?: string;
    payments?: string;
    [key: string]: string | undefined;
  };
  personality?: {
    tone?: 'professional' | 'friendly' | 'casual' | 'formal';
    style?: 'helpful' | 'assertive' | 'consultative' | 'enthusiastic';
  };
  trainingData?: string;
  interactions?: number;
  lastTrained?: string;
}

export const botsAPI = {
  async getBySubdomain(subdomain: string): Promise<Bot[]> {
    const response = await api.get('/bots/public/' + subdomain);
    return response.data;
  },

  async getById(id: string): Promise<Bot> {
    const response = await api.get('/bots/public/' + id);
    return response.data;
  },

  async getAll(): Promise<Bot[]> {
    const response = await api.get('/bots');
    return response.data;
  },

  async create(data: { name: string; type: string }): Promise<Bot> {
    const response = await api.post('/bots', data);
    return response.data;
  },

  async activate(id: string): Promise<Bot> {
    const response = await api.post(`/bots/${id}/activate`);
    return response.data;
  },

  async deactivate(id: string): Promise<Bot> {
    const response = await api.post(`/bots/${id}/deactivate`);
    return response.data;
  },

  async getBilling(): Promise<any> {
    const response = await api.get('/bots/billing');
    return response.data;
  },

  async subscribe(planId: string): Promise<any> {
    const response = await api.post('/bots/billing/subscribe', { planId });
    return response.data;
  },

  async initializePaystack(planId: string): Promise<any> {
    const response = await api.post('/bots/billing/paystack/initialize', { planId });
    return response.data;
  },

  async verifyPaystack(reference: string, planId: string): Promise<any> {
    const response = await api.post('/bots/billing/paystack/verify', { reference, planId });
    return response.data;
  },

  async train(id: string, trainingData: string): Promise<Bot> {
    const response = await api.post(`/bots/${id}/train`, { trainingData });
    return response.data;
  },

  async autoTrain(id: string): Promise<Bot> {
    const response = await api.post(`/bots/${id}/auto-train`);
    return response.data;
  },

  async updateWidgetConfig(id: string, widgetConfig: Partial<Bot['widgetConfig']>): Promise<Bot> {
    const response = await api.patch(`/bots/${id}/widget-config`, { widgetConfig });
    return response.data;
  },

  async updateCustomResponses(id: string, customResponses: Bot['customResponses']): Promise<Bot> {
    const response = await api.patch(`/bots/${id}/custom-responses`, { customResponses });
    return response.data;
  },

  async updatePersonality(id: string, personality: Bot['personality']): Promise<Bot> {
    const response = await api.patch(`/bots/${id}/personality`, { personality });
    return response.data;
  },

  async getConfiguration(id: string): Promise<any> {
    const response = await api.get(`/bots/${id}/configuration`);
    return response.data;
  },

  async updateConfiguration(id: string, configuration: Record<string, any>): Promise<any> {
    const response = await api.patch(`/bots/${id}/configuration`, { configuration });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/bots/${id}`);
  },

  async chat(id: string, message: string): Promise<{ response: string; conversationId?: string; sources?: { title: string; source: string }[] }> {
    const response = await api.post(`/public/bots/${id}/chat`, { message });
    return response.data;
  },

  async getKnowledge(): Promise<any> {
    const response = await api.get('/bots/knowledge');
    return response.data;
  },

  async addKnowledgeDocument(data: { title: string; content: string; documentType?: string; source?: string; sourceUrl?: string }): Promise<any> {
    const response = await api.post('/bots/knowledge/documents', data);
    return response.data;
  },

  async archiveKnowledgeDocument(id: string): Promise<any> {
    const response = await api.delete(`/bots/knowledge/documents/${id}`);
    return response.data;
  },

  async addFaq(data: { question: string; answer: string; category?: string }): Promise<any> {
    const response = await api.post('/bots/knowledge/faqs', data);
    return response.data;
  },

  async getConversations(): Promise<any[]> {
    const response = await api.get('/bots/conversations');
    return response.data;
  },

  async getAnalytics(): Promise<any> {
    const response = await api.get('/bots/analytics');
    return response.data;
  }
};

export const employeesAPI = {
  async getBySellerId(sellerId: string): Promise<any[]> {
    const response = await api.get('/pos/employees', { params: { seller_id: sellerId } });
    return response.data;
  },
  async getById(id: string): Promise<any> {
    const response = await api.get(`/pos/employees/${id}`);
    return response.data;
  },
  async create(data: any): Promise<any> {
    const response = await api.post('/pos/employees', data);
    return response.data;
  },
  async update(id: string, data: any): Promise<any> {
    const response = await api.put(`/pos/employees/${id}`, data);
    return response.data;
  },
  async updatePin(id: string, pin: string): Promise<any> {
    const response = await api.patch(`/pos/employees/${id}/pin`, { pin });
    return response.data;
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/pos/employees/${id}`);
  },
};

export const tablesAPI = {
  async getBySellerId(sellerId: string): Promise<any[]> {
    const response = await api.get('/pos/tables', { params: { seller_id: sellerId } });
    return response.data;
  },
  async updateStatus(tableId: string, status: string): Promise<any> {
    const response = await api.patch(`/pos/tables/${tableId}/status`, { status });
    return response.data;
  },
  async assignEmployee(tableId: string, employeeId?: string): Promise<any> {
    const response = await api.patch(`/pos/tables/${tableId}/assign`, { employeeId });
    return response.data;
  },
  async create(data: any): Promise<any> {
    const response = await api.post('/pos/tables', data);
    return response.data;
  },
};

export const shiftsAPI = {
  async getOpen(sellerId: string): Promise<any> {
    const response = await api.get('/pos/shifts/open', { params: { seller_id: sellerId } });
    return response.data;
  },
  async open(data: { employeeId: string; openingFloat: number; sellerId: string }): Promise<any> {
    const response = await api.post('/pos/shifts/open', data);
    return response.data;
  },
  async close(shiftId: string, closingAmount: number): Promise<any> {
    const response = await api.post(`/pos/shifts/${shiftId}/close`, { closingAmount });
    return response.data;
  },
  async getByEmployeeId(employeeId: string): Promise<any[]> {
    const response = await api.get(`/pos/shifts/employee/${employeeId}`);
    return response.data;
  },
};

export const inventoryAPI = {
  async getBySellerId(sellerId: string): Promise<any[]> {
    const response = await api.get('/pos/inventory', { params: { seller_id: sellerId } });
    return response.data;
  },
  async create(data: any): Promise<any> {
    const response = await api.post('/pos/inventory', data);
    return response.data;
  },
  async update(id: string, data: any): Promise<any> {
    const response = await api.put(`/pos/inventory/${id}`, data);
    return response.data;
  },
  async adjustStock(id: string, quantity: number, reason: string, type: string): Promise<any> {
    const response = await api.post(`/pos/inventory/${id}/adjust`, { quantity, reason, type });
    return response.data;
  },
  async getLowStock(sellerId: string): Promise<any[]> {
    const response = await api.get('/pos/inventory/low-stock', { params: { seller_id: sellerId } });
    return response.data;
  },
};

export const kitchenAPI = {
  async getOrders(sellerId: string): Promise<any[]> {
    const response = await api.get('/pos/kitchen/orders', { params: { seller_id: sellerId } });
    return response.data;
  },
  async updateItemStatus(orderId: string, itemId: string, status: string): Promise<any> {
    const response = await api.patch(`/pos/kitchen/orders/${orderId}/items/${itemId}`, { status });
    return response.data;
  },
};

export const loyaltyAPI = {
  async getCustomerLoyalty(customerId: string, sellerId: string): Promise<any> {
    const response = await api.get(`/pos/loyalty/customer/${customerId}`, { params: { seller_id: sellerId } });
    return response.data;
  },
  async earnPoints(data: { customerId: string; orderId: string; points: number; sellerId: string }): Promise<any> {
    const response = await api.post('/pos/loyalty/earn', data);
    return response.data;
  },
  async redeemPoints(data: { customerId: string; orderId: string; points: number; sellerId: string }): Promise<any> {
    const response = await api.post('/pos/loyalty/redeem', data);
    return response.data;
  },
};

export { default as ApexTypes } from '../platforms/services/pos/apex-pos/apexTypes';

export default {
  auth: authAPI,
  sellers: sellersAPI,
  sellerManagers: sellerManagersAPI,
  products: productsAPI,
  orders: ordersAPI,
  customers: customersAPI,
  analytics: analyticsAPI,
  admin: adminAPI,
  reviews: reviewsAPI,
  user: userAPI,
  categories: categoriesAPI,
  upload: uploadAPI,
  socialMedia: socialMediaAPI,
  emailMarketing: emailMarketingAPI,
  marketing: marketingAPI,
  refunds: refundsAPI,
  bots: botsAPI,
  ixstream: ixstreamAPI,
  employees: employeesAPI,
  tables: tablesAPI,
  shifts: shiftsAPI,
  inventory: inventoryAPI,
  kitchen: kitchenAPI,
  loyalty: loyaltyAPI,
};
