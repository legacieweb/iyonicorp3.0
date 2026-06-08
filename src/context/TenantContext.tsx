import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

interface TenantConfig {
  id: string;
  userId?: string;
  name: string;
  subdomain: string;
  shopType: 'product' | 'service' | 'payment';
  description?: string;
  themeId?: string;
  theme: {
    primaryColor: string;
    secondaryColor?: string;
    fontFamily?: string;
    logo?: string;
    selectedTheme?: string;
    customizations?: any;
  };
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
  deliveryLocations?: any[];
  paymentTerms?: any;
  pricingConfig?: {
    plans: {
      starter: { price: number; status: string; features: string[]; productLimit?: number };
      professional: { price: number; status: string; features: string[]; productLimit?: number };
      enterprise: { price: number; status: string; features: string[]; productLimit?: number };
    };
    currency: string;
    billingCycle: string;
  };
  subscription?: {
    plan: 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    startDate: string | null;
    endDate: string | null;
  };
  paymentGateways?: {
    active: string;
    iyonicpay: { enabled: boolean };
    custom: { enabled: boolean; provider: string; apiKey: string; link: string };
  };
}

interface TenantContextType {
  tenant: TenantConfig | null;
  isLoading: boolean;
  isMainPlatform: boolean;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMainPlatform, setIsMainPlatform] = useState(false);

  const location = useLocation();

  const isValidSubdomain = (subdomain: string | null): boolean => {
    if (!subdomain) return false;
    const reserved = ['www', 'localhost', 'web', 'api', 'admin', 'shop', 'store', 'app', ''];
    if (reserved.includes(subdomain.toLowerCase())) return false;
    if (subdomain.length < 2) return false;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(subdomain)) return false;
    return true;
  };

  const detectTenant = async () => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // With HashRouter, the actual route path is in the hash
    const hash = window.location.hash;
    const path = window.location.pathname;
    
    // Check if we're on /shop route (either in pathname or hash)
    // But exclude /shop/demo which should show demo storefront
    // AND allow /shop/:subdomain to be treated as a tenant storefront
    if ((path.startsWith('/shop/') || hash.startsWith('#/shop/')) && 
        !path.includes('/shop/demo') && !hash.includes('#/shop/demo')) {
      
const shopSubdomain = (path.startsWith('/shop/')
         ? path.split('/')[2]
         : hash.split('?')[0].split('/').pop()) || null;

       if (!isValidSubdomain(shopSubdomain)) {
        setIsMainPlatform(true);
        setTenant(null);
        setIsLoading(false);
        return;
      }
      
      // If we have a shop subdomain in URL, use it to fetch tenant
      try {
        const response = await axios.get(`${API_URL}/sellers/subdomain/${shopSubdomain}`, { timeout: 5000 });
        const seller = response.data;
        
        setTenant({
          id: seller.id,
          userId: seller.userId,
          name: seller.storeName,
          subdomain: seller.subdomain,
          shopType: seller.shopType || 'product',
          description: seller.description,
          themeId: seller.themeId || seller.theme?.selectedTheme,
          theme: seller.theme || {
            primaryColor: '#3b82f6',
            fontFamily: 'Inter'
          },
          shippingPolicy: seller.shippingPolicy,
          returnPolicy: seller.returnPolicy,
          privacyPolicy: seller.privacyPolicy,
          termsOfService: seller.termsOfService,
          additionalPages: seller.additionalPages,
          socialLinks: seller.socialLinks,
          contactInfo: seller.contactInfo,
          logo: seller.logo,
          currency: seller.currency || 'USD',
          deliveryLocations: seller.deliveryLocations || [],
          paymentTerms: seller.paymentTerms || { methods: ['site'], depositPercentage: 50, rules: 'all' }
        });
        setIsMainPlatform(false);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error('Error fetching tenant from path:', error);
        // Fallback to main platform if store not found
        setIsMainPlatform(true);
        setTenant(null);
        setIsLoading(false);
        return;
      }
    }
    
    // Handle demo mode - treat as a tenant storefront
    // Also check query params for theme parameter (both from URL and hash)
    let themeParam = 'modern-ecommerce';
    const isDemoPath = (path === '/shop/demo' || path.startsWith('/shop/demo')) || (hash === '#/shop/demo' || hash.startsWith('#/shop/demo'));
    if (isDemoPath) {
      // Get theme from either query params or hash query params
      let urlParams = new URLSearchParams(window.location.search);
      let queryTheme = urlParams.get('theme');
      
      // If no theme in current search, check hash query string
      if (!queryTheme && hash.includes('?')) {
        const hashQueryPart = hash.split('?')[1];
        urlParams = new URLSearchParams(hashQueryPart);
        queryTheme = urlParams.get('theme');
      }
      
      if (queryTheme) {
        themeParam = queryTheme;
      }
      setIsMainPlatform(false);
      setTenant({
        id: 'demo-seller',
        name: 'Demo Store',
        subdomain: 'demo',
        shopType: 'product',
        description: 'Welcome to our demo store. This is a preview of our theme.',
        themeId: themeParam,
        theme: { 
          selectedTheme: themeParam,
          primaryColor: '#000000'
        },
        deliveryLocations: [
          { id: 'dl1', name: 'Nairobi CBD', fee: 200, enabled: true },
          { id: 'dl2', name: 'Westlands', fee: 300, enabled: true },
          { id: 'dl3', name: 'Mombasa Road', fee: 400, enabled: true }
        ],
        currency: 'KES'
      });
      setIsLoading(false);
      return;
    }
    
    // In production, we'd check for custom domains or subdomains of iyonicorp.com
    // For development, we'll assume anything before .localhost is a subdomain
    // Or we can use a query param for testing: ?store=my-store
    const urlParams = new URLSearchParams(window.location.search);
    const storeParam = urlParams.get('store');
    
    let subdomain = storeParam;
    if (!subdomain) {
      const extractedSubdomain = parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'localhost' ? parts[0] : null;
      subdomain = isValidSubdomain(extractedSubdomain) ? extractedSubdomain : null;
    }

    if (!subdomain || hostname === '127.0.0.1') {
      setIsMainPlatform(true);
      setTenant(null);
      setIsLoading(false);
    } else {
      try {
        const response = await axios.get(`${API_URL}/sellers/subdomain/${subdomain}`, { timeout: 5000 });
        const seller = response.data;
        
        setTenant({
          id: seller.id,
          userId: seller.userId,
          name: seller.storeName,
          subdomain: seller.subdomain,
          shopType: seller.shopType || 'product',
          description: seller.description,
          themeId: seller.themeId || seller.theme?.selectedTheme,
          theme: seller.theme || {
            primaryColor: '#3b82f6',
            fontFamily: 'Inter'
          },
          shippingPolicy: seller.shippingPolicy,
          returnPolicy: seller.returnPolicy,
          privacyPolicy: seller.privacyPolicy,
          termsOfService: seller.termsOfService,
          additionalPages: seller.additionalPages,
          socialLinks: seller.socialLinks,
          contactInfo: seller.contactInfo,
          logo: seller.logo,
          currency: seller.currency || 'USD',
          deliveryLocations: seller.deliveryLocations || [],
          paymentTerms: seller.paymentTerms || { methods: ['site'], depositPercentage: 50, rules: 'all' }
        });
        setIsMainPlatform(false);
      } catch (error) {
        console.error('Error fetching tenant:', error);
        setTenant(null);
        setIsMainPlatform(true); // Fallback to main platform if store not found
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    detectTenant();
  }, [location.pathname, location.hash, location.search]);

  const refreshTenant = async () => {
    await detectTenant();
  };

  return (
    <TenantContext.Provider value={{ tenant, isLoading, isMainPlatform, refreshTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
