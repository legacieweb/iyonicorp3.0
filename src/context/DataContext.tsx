import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  productsAPI,
  ordersAPI,
  customersAPI,
  sellersAPI,
  sellerManagersAPI,
  analyticsAPI,
  messagesAPI,
  reviewsAPI,
  discountsAPI,
  socialMediaAPI,
  emailMarketingAPI,
  marketingAPI,
  Product,
  Order,
  Customer,
  Seller,
  SellerManager,
  Message,
  Discount,
  Analytics,
  ManagerAnalytics,
  PricingConfig,
  Review,
  SocialMediaAccount,
  SocialMediaPost,
  EmailSettings,
  EmailCampaign,
  EmailTemplate
} from '../services/api';

export type { Product, Order, Customer, Seller, SellerManager, Message, Discount, Analytics, ManagerAnalytics, PricingConfig, Review, SocialMediaAccount, SocialMediaPost, EmailSettings, EmailCampaign, EmailTemplate };

interface DataContextType {
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  orders: Order[];
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;

  customers: Customer[];

  sellers: Seller[];
  updateSeller: (id: string, updates: Partial<Seller>) => Promise<void>;

  discounts: Discount[];
  addDiscount: (discount: Partial<Discount>) => Promise<void>;
  updateDiscount: (id: string, updates: Partial<Discount>) => Promise<void>;
  deleteDiscount: (id: string) => Promise<void>;

  messages: Message[];
  markMessageRead: (id: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  refreshMessages: () => Promise<void>;

  reviews: Review[];
  getSellerReviews: () => Promise<void>;

  sellerManagers: SellerManager[];

  managerOrders: Order[];
  managerCustomers: Customer[];
  managerAnalytics: ManagerAnalytics | null;
  availableSellers: Seller[];

  assignSeller: (sellerId: string) => Promise<void>;
  unassignSeller: (sellerId: string) => Promise<void>;
  updateManagerPricing: (config: PricingConfig) => Promise<void>;

  getAnalytics: (sellerId?: string) => Promise<Analytics>;
  getMarketingStats: (sellerId: string) => Promise<any>;

  refreshData: () => Promise<void>;

  // Marketing - Social Media
  socialMediaAccounts: SocialMediaAccount[];
  setSocialMediaAccounts: (accounts: SocialMediaAccount[]) => void;
  connectSocialMedia: (platform: SocialMediaAccount['platform'], accessToken: string, username: string, profileUrl: string) => Promise<SocialMediaAccount>;
  disconnectSocialMedia: (accountId: string) => Promise<void>;
  refreshSocialMedia: (accountId: string) => Promise<void>;
  shareToSocialMedia: (accountId: string, content: string, linkUrl: string, imageUrl?: string) => Promise<{ success: boolean; postUrl?: string }>;
  socialMediaPosts: SocialMediaPost[];
  setSocialMediaPosts: (posts: SocialMediaPost[]) => void;
  createSocialPost: (post: Partial<SocialMediaPost>) => Promise<SocialMediaPost>;
  updateSocialPost: (id: string, updates: Partial<SocialMediaPost>) => Promise<SocialMediaPost>;
  deleteSocialPost: (id: string) => Promise<void>;

  // Marketing - Email
  emailSettings: EmailSettings | null;
  setEmailSettings: (settings: EmailSettings | null) => void;
  saveEmailSettings: (settings: Partial<EmailSettings>) => Promise<EmailSettings>;
  updateEmailSettings: (id: string, updates: Partial<EmailSettings>) => Promise<EmailSettings>;
  verifyEmailSettings: (id: string) => Promise<{ verified: boolean; message: string }>;
  sendTestEmail: (to: string, subject?: string, html?: string) => Promise<{ success: boolean; message: string }>;

  // Marketing - Email Campaigns
  emailCampaigns: EmailCampaign[];
  setEmailCampaigns: (campaigns: EmailCampaign[]) => void;
  createCampaign: (campaign: Partial<EmailCampaign>) => Promise<EmailCampaign>;
  updateCampaign: (id: string, updates: Partial<EmailCampaign>) => Promise<EmailCampaign>;
  deleteCampaign: (id: string) => Promise<void>;
  sendCampaign: (id: string) => Promise<{ queued: boolean; message: string }>;
  scheduleCampaign: (id: string, scheduledAt: string) => Promise<{ scheduled: boolean }>;
  getCampaignStats: (id: string) => Promise<any>;

  // Marketing - Email Templates
  emailTemplates: EmailTemplate[];
  setEmailTemplates: (templates: EmailTemplate[]) => void;
  createTemplate: (template: Partial<EmailTemplate>) => Promise<EmailTemplate>;
  updateTemplate: (id: string, updates: Partial<EmailTemplate>) => Promise<EmailTemplate>;
  deleteTemplate: (id: string) => Promise<void>;
  loadDefaultTemplates: () => Promise<void>;

  marketingStats: any | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sellerManagers, setSellerManagers] = useState<SellerManager[]>([]);
  const [managerOrders, setManagerOrders] = useState<Order[]>([]);
  const [managerCustomers, setManagerCustomers] = useState<Customer[]>([]);
  const [managerAnalytics, setManagerAnalytics] = useState<ManagerAnalytics | null>(null);
  const [availableSellers, setAvailableSellers] = useState<Seller[]>([]);

  // Marketing state
  const [socialMediaAccounts, setSocialMediaAccounts] = useState<SocialMediaAccount[]>([]);
  const [socialMediaPosts, setSocialMediaPosts] = useState<SocialMediaPost[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [marketingStats, setMarketingStats] = useState<any | null>(null);

  const refreshData = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      if (user.role === 'seller' && user.sellerId) {
        const [p, o, c, s, m, r, d] = await Promise.all([
          productsAPI.getBySellerId(user.sellerId),
          ordersAPI.getBySellerId(user.sellerId).then(orders => orders.filter(order => order.status !== 'pending')),
          customersAPI.getBySellerId(user.sellerId),
          sellersAPI.getMe(),
          messagesAPI.getAll(),
          reviewsAPI.getSellerReviews(),
          discountsAPI.getAll()
        ]);
        setProducts(p);
        setOrders(o);
        setCustomers(c);
        setSellers([s]);
        setMessages(m);
        setReviews(r);
        setDiscounts(d);

        // Also fetch marketing data in parallel
        try {
          const [socialAccounts, socialPosts, emailSettingsData, campaigns, templates, mStats] = await Promise.all([
            socialMediaAPI.getBySellerId(user.sellerId),
            socialMediaAPI.getPosts(user.sellerId),
            emailMarketingAPI.getSettings(user.sellerId),
            emailMarketingAPI.getCampaigns(user.sellerId),
            emailMarketingAPI.getTemplates(user.sellerId),
            marketingAPI.getStats(user.sellerId)
          ]);
          setSocialMediaAccounts(socialAccounts);
          setSocialMediaPosts(socialPosts);
          setEmailSettings(emailSettingsData);
          setEmailCampaigns(campaigns);
          setEmailTemplates(templates);
          setMarketingStats(mStats);
        } catch (marketingError) {
          console.error('Error fetching marketing data:', marketingError);
          // Set defaults if marketing endpoints not ready
          setSocialMediaAccounts([]);
          setSocialMediaPosts([]);
          setEmailSettings(null);
          setEmailCampaigns([]);
          setEmailTemplates([]);
          setMarketingStats(null);
        }

        // Also fetch manager info if exists
        if (s.managerId) {
          try {
            const manager = await sellerManagersAPI.getById(s.managerId);
            setSellerManagers([manager]);
          } catch (error) {
            console.error('Error fetching seller manager:', error);
          }
        }
      } else if (user.role === 'seller_manager') {
        const allSellers = await sellersAPI.getAll();
        setSellers(allSellers);

        try {
          const [me, mgrOrders, mgrCustomers, mgrAnalytics, availSellers] = await Promise.all([
            sellerManagersAPI.getMe(),
            sellerManagersAPI.getOrders().then(orders => orders.filter(order => order.status !== 'pending')),
            sellerManagersAPI.getCustomers(),
            sellerManagersAPI.getAnalytics(),
            sellerManagersAPI.getAvailableSellers(),
          ]);
          setSellerManagers([me]);
          setManagerOrders(mgrOrders);
          setManagerCustomers(mgrCustomers);
          setManagerAnalytics(mgrAnalytics);
          setAvailableSellers(availSellers);
        } catch (managerError) {
          console.error('Error fetching manager data:', managerError);
          setSellerManagers([{
            id: user.managerId || '',
            userId: user.id,
            slug: '',
            displayName: user.name,
            commissionRate: 0.05,
            isActive: true,
            createdAt: new Date().toISOString(),
            stats: {
              totalSellers: allSellers.length,
              activeSellers: allSellers.filter(s => s.subscription?.status === 'active').length,
              totalRevenue: 0,
              totalCommission: 0,
            },
            commission: 0.05,
          }]);
        }
      } else if (user.role === 'manager_admin') {
        const [allSellers, allManagers] = await Promise.all([
          sellersAPI.getAll(),
          sellerManagersAPI.getAll()
        ]);
        setSellers(allSellers);
        setSellerManagers(allManagers);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newProduct = await productsAPI.create(product);
      setProducts(prev => [...prev, newProduct]);
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const updatedProduct = await productsAPI.update(id, updates);
      setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await productsAPI.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      const updatedOrder = await ordersAPI.updateStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? updatedOrder : o));
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  };

  const updateSeller = async (id: string, updates: Partial<Seller>) => {
    try {
      const updatedSeller = await sellersAPI.updateMe(updates);
      setSellers(prev => prev.map(s => s.id === id ? updatedSeller : s));
    } catch (error) {
      console.error('Error updating seller:', error);
      throw error;
    }
  };

  const markMessageRead = async (id: string) => {
    try {
      await messagesAPI.markRead(id);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await messagesAPI.delete(id);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  };

  const addDiscount = async (discount: Partial<Discount>) => {
    try {
      const newDiscount = await discountsAPI.create(discount);
      setDiscounts(prev => [...prev, newDiscount]);
    } catch (error) {
      console.error('Error adding discount:', error);
      throw error;
    }
  };

  const updateDiscount = async (id: string, updates: Partial<Discount>) => {
    try {
      const updatedDiscount = await discountsAPI.update(id, updates);
      setDiscounts(prev => prev.map(d => d.id === id ? updatedDiscount : d));
    } catch (error) {
      console.error('Error updating discount:', error);
      throw error;
    }
  };

  const deleteDiscount = async (id: string) => {
    try {
      await discountsAPI.delete(id);
      setDiscounts(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error deleting discount:', error);
      throw error;
    }
  };

  const refreshMessages = async () => {
    try {
      const m = await messagesAPI.getAll();
      setMessages(m);
    } catch (error) {
      console.error('Error refreshing messages:', error);
    }
  };

  const getSellerReviews = async () => {
    try {
      const r = await reviewsAPI.getSellerReviews();
      setReviews(r);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const assignSeller = async (sellerId: string) => {
    try {
      await sellerManagersAPI.assignSeller(sellerId);
      await refreshData();
    } catch (error) {
      console.error('Error assigning seller:', error);
      throw error;
    }
  };

  const unassignSeller = async (sellerId: string) => {
    try {
      await sellerManagersAPI.unassignSeller(sellerId);
      await refreshData();
    } catch (error) {
      console.error('Error unassigning seller:', error);
      throw error;
    }
  };

  const updateManagerPricing = async (config: PricingConfig) => {
    try {
      await sellerManagersAPI.updatePricing(config);
      await refreshData();
    } catch (error) {
      console.error('Error updating pricing:', error);
      throw error;
    }
  };

   const getAnalytics = async (sellerId?: string): Promise<Analytics> => {
     if (sellerId) {
       return await analyticsAPI.getSellerAnalytics(sellerId);
     }
     return {
       totalRevenue: 0,
       totalOrders: 0,
       totalProducts: 0,
       totalCustomers: 0,
       revenueGrowth: 0,
       ordersGrowth: 0,
       recentOrders: [],
       salesByMonth: [],
       topProducts: []
     };
   };

   const getMarketingStats = async (sellerId: string): Promise<any> => {
     return await marketingAPI.getStats(sellerId);
   };

   // Marketing Methods - Social Media
   const connectSocialMedia = async (platform: SocialMediaAccount['platform'], accessToken: string, username: string, profileUrl: string): Promise<SocialMediaAccount> => {
     if (!user?.sellerId) throw new Error('No seller ID available');
     const account = await socialMediaAPI.connect({
       sellerId: user.sellerId,
       platform,
       accessToken,
       username,
       profileUrl
     });
     setSocialMediaAccounts(prev => [...prev, account]);
     return account;
   };

   const disconnectSocialMedia = async (accountId: string): Promise<void> => {
     await socialMediaAPI.disconnect(accountId);
     setSocialMediaAccounts(prev => prev.filter(acc => acc.id !== accountId));
   };

   const refreshSocialMedia = async (accountId: string): Promise<void> => {
     const updated = await socialMediaAPI.refresh(accountId);
     setSocialMediaAccounts(prev => prev.map(acc => acc.id === accountId ? updated : acc));
   };

   const shareToSocialMedia = async (accountId: string, content: string, linkUrl: string, imageUrl?: string): Promise<{ success: boolean; postUrl?: string }> => {
     return await socialMediaAPI.shareToSocial(accountId, { content, imageUrl, linkUrl });
   };

   const createSocialPost = async (post: Partial<SocialMediaPost>): Promise<SocialMediaPost> => {
     const newPost = await socialMediaAPI.createPost(post);
     setSocialMediaPosts(prev => [newPost, ...prev]);
     return newPost;
   };

   const updateSocialPost = async (id: string, updates: Partial<SocialMediaPost>): Promise<SocialMediaPost> => {
     const updated = await socialMediaAPI.updatePost(id, updates);
     setSocialMediaPosts(prev => prev.map(p => p.id === id ? updated : p));
     return updated;
   };

   const deleteSocialPost = async (id: string): Promise<void> => {
     await socialMediaAPI.deletePost(id);
     setSocialMediaPosts(prev => prev.filter(p => p.id !== id));
   };

   // Marketing Methods - Email Settings
   const saveEmailSettings = async (settings: Partial<EmailSettings>): Promise<EmailSettings> => {
     const saved = await emailMarketingAPI.saveSettings(settings);
     setEmailSettings(saved);
     return saved;
   };

   const updateEmailSettings = async (id: string, updates: Partial<EmailSettings>): Promise<EmailSettings> => {
     const updated = await emailMarketingAPI.updateSettings(id, updates);
     setEmailSettings(updated);
     return updated;
   };

   const verifyEmailSettings = async (id: string): Promise<{ verified: boolean; message: string }> => {
     return await emailMarketingAPI.verifySettings(id);
   };

   const sendTestEmail = async (to: string, subject?: string, html?: string): Promise<{ success: boolean; message: string }> => {
     const subj = subject || 'Test Email from ShopRight';
     const content = html || '<p>This is a test email from your ShopRight store.</p><p>If you received this, your email configuration is working correctly!</p>';
     return await emailMarketingAPI.sendTestEmail({ to, subject: subj, html: content });
   };

   // Marketing Methods - Campaigns
   const createCampaign = async (campaign: Partial<EmailCampaign>): Promise<EmailCampaign> => {
     const newCampaign = await emailMarketingAPI.createCampaign(campaign);
     setEmailCampaigns(prev => [newCampaign, ...prev]);
     return newCampaign;
   };

   const updateCampaign = async (id: string, updates: Partial<EmailCampaign>): Promise<EmailCampaign> => {
     const updated = await emailMarketingAPI.updateCampaign(id, updates);
     setEmailCampaigns(prev => prev.map(c => c.id === id ? updated : c));
     return updated;
   };

   const deleteCampaign = async (id: string): Promise<void> => {
     await emailMarketingAPI.deleteCampaign(id);
     setEmailCampaigns(prev => prev.filter(c => c.id !== id));
   };

   const sendCampaign = async (id: string): Promise<{ queued: boolean; message: string }> => {
     const result = await emailMarketingAPI.sendCampaign(id);
     if (result.queued) {
       setEmailCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'sent', sentAt: new Date().toISOString() } : c));
     }
     return result;
   };

   const scheduleCampaign = async (id: string, scheduledAt: string): Promise<{ scheduled: boolean }> => {
     const result = await emailMarketingAPI.scheduleCampaign(id, scheduledAt);
     if (result.scheduled) {
       setEmailCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'scheduled', scheduledAt } : c));
     }
     return result;
   };

   const getCampaignStats = async (id: string): Promise<any> => {
     return await emailMarketingAPI.getCampaignStats(id);
   };

   // Marketing Methods - Templates
   const createTemplate = async (template: Partial<EmailTemplate>): Promise<EmailTemplate> => {
     const newTemplate = await emailMarketingAPI.createTemplate(template);
     setEmailTemplates(prev => [newTemplate, ...prev]);
     return newTemplate;
   };

   const updateTemplate = async (id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> => {
     const updated = await emailMarketingAPI.updateTemplate(id, updates);
     setEmailTemplates(prev => prev.map(t => t.id === id ? updated : t));
     return updated;
   };

   const deleteTemplate = async (id: string): Promise<void> => {
     await emailMarketingAPI.deleteTemplate(id);
     setEmailTemplates(prev => prev.filter(t => t.id !== id));
   };

   const loadDefaultTemplates = async (): Promise<void> => {
     const defaults = await emailMarketingAPI.getDefaultTemplates();
     setEmailTemplates(prev => {
       const existingSlugs = new Set(prev.map(t => t.slug));
       const newDefaults = defaults.filter(t => !existingSlugs.has(t.slug));
       return [...prev, ...newDefaults];
     });
   };

  return (
    <DataContext.Provider value={{
      products, addProduct, updateProduct, deleteProduct,
      orders, updateOrderStatus,
      customers,
      sellers, updateSeller,
      discounts, addDiscount, updateDiscount, deleteDiscount,
      messages, markMessageRead, deleteMessage, refreshMessages,
      reviews, getSellerReviews,
      sellerManagers,
      managerOrders,
      managerCustomers,
      managerAnalytics,
      availableSellers,
      assignSeller,
      unassignSeller,
      updateManagerPricing,
      getAnalytics,
      getMarketingStats,
      refreshData,
      // Marketing
      socialMediaAccounts,
      setSocialMediaAccounts,
      connectSocialMedia,
      disconnectSocialMedia,
      refreshSocialMedia,
      shareToSocialMedia,
      socialMediaPosts,
      setSocialMediaPosts,
      createSocialPost,
      updateSocialPost,
      deleteSocialPost,
      emailSettings,
      setEmailSettings,
      saveEmailSettings,
      updateEmailSettings,
      verifyEmailSettings,
      sendTestEmail,
      emailCampaigns,
      setEmailCampaigns,
      createCampaign,
      updateCampaign,
      deleteCampaign,
      sendCampaign,
      scheduleCampaign,
      getCampaignStats,
      emailTemplates,
      setEmailTemplates,
      createTemplate,
      updateTemplate,
      deleteTemplate,
      loadDefaultTemplates,
      marketingStats
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
