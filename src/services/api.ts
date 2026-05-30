import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://retailer-configurations-companion-arc.trycloudflare.com/api';

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
  createdAt: string;
  updatedAt: string;
  sellerStoreName?: string;
  paymentLink?: string;
  reference?: string;
  paymentMethod?: 'iyonicpay' | 'paystack' | 'custom';
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
    sellerId?: string; // For customer signup in a specific store
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
};

export const ordersAPI = {
  async getAll(): Promise<Order[]> {
    const response = await api.get('/orders');
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
  async getAllUsers(): Promise<User[]> {
    const response = await api.get('/users');
    return response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  async toggleUserSuspension(id: string): Promise<{ message: string; isSuspended: boolean }> {
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

  async updateWithdrawalStatus(id: string, status: 'completed' | 'failed') {
    const response = await api.patch(`/admin/iyonicpay/withdrawals/${id}`, { status });
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

  async sendTestEmail(data: { to: string; subject: string; html: string }): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/email-marketing/test', data);
    return response.data;
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
};
