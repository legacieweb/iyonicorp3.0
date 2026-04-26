import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import axios from 'axios';
import BotWidget from '../components/BotWidget';
import { uploadAPI, productsAPI } from '../services/api';
import { 
  Edit3, 
  X, 
  Save, 
  Upload, 
  Image as ImageIcon
} from 'lucide-react';

// Lazy load themes - Product Shop Themes
const ModernEcommerce = lazy(() => import('../themes/ecommerce/product-shops/ModernEcommerce'));
const LuxuryBoutique = lazy(() => import('../themes/ecommerce/product-shops/LuxuryBoutique'));
const BeautyStore = lazy(() => import('../themes/ecommerce/product-shops/BeautyStore'));
const ShoeStore = lazy(() => import('../themes/ecommerce/product-shops/ShoeStore'));
const JewelryStore = lazy(() => import('../themes/ecommerce/product-shops/JewelryStore'));
const BakeryStore = lazy(() => import('../themes/ecommerce/product-shops/BakeryStore'));
const CoutureStore = lazy(() => import('../themes/ecommerce/product-shops/CoutureStore'));

// Lazy load themes - Service Shop Themes
const EliteConsulting = lazy(() => import('../themes/ecommerce/service-shops/EliteConsulting'));
const CreativeStudio = lazy(() => import('../themes/ecommerce/service-shops/CreativeStudio'));
const ModernWellness = lazy(() => import('../themes/ecommerce/service-shops/ModernWellness'));

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const MOCK_PRODUCTS: Record<string, any[]> = {
  'modern-ecommerce': [
    { id: 'm1', name: 'Minimalist Watch', price: 120, description: 'A sleek minimalist watch for everyday wear.', images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400'], category: 'Accessories' },
    { id: 'm2', name: 'Leather Bag', price: 250, description: 'Premium leather bag with spacious compartments.', images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=400'], category: 'Fashion' },
    { id: 'm3', name: 'Canvas Sneakers', price: 85, description: 'Comfortable canvas sneakers for casual outings.', images: ['https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=400'], category: 'Footwear' },
    { id: 'm4', name: 'Cotton T-Shirt', price: 35, description: '100% organic cotton t-shirt in various colors.', images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400'], category: 'Fashion' },
  ],
  'luxury-boutique': [
    { id: 'l1', name: 'Diamond Necklace', price: 4500, description: 'Exquisite diamond necklace set in 18k gold.', images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=400'], category: 'Jewelry' },
    { id: 'l2', name: 'Silk Evening Gown', price: 1200, description: 'Elegant silk gown for special occasions.', images: ['https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&q=80&w=400'], category: 'Apparel' },
    { id: 'l3', name: 'Gold Chronograph', price: 8500, description: 'Luxury gold watch with intricate mechanical movement.', images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80&w=400'], category: 'Watches' },
    { id: 'l4', name: 'Designer Heels', price: 950, description: 'Sophisticated designer heels with premium finish.', images: ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=400'], category: 'Footwear' },
  ],
  'beauty-store': [
    { id: 'b1', name: 'Hydrating Serum', price: 45, description: 'Deeply hydrating serum with hyaluronic acid.', images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=400'], category: 'Skincare' },
    { id: 'b2', name: 'Matte Lipstick', price: 28, description: 'Long-lasting matte lipstick in various shades.', images: ['https://images.unsplash.com/photo-1586776977607-310e9c725c37?auto=format&fit=crop&q=80&w=400'], category: 'Makeup' },
    { id: 'b3', name: 'Organic Face Oil', price: 55, description: 'Pure organic face oil for a radiant glow.', images: ['https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&q=80&w=400'], category: 'Skincare' },
    { id: 'b4', name: 'Vitamin C Cream', price: 42, description: 'Brightening vitamin C cream for all skin types.', images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=400'], category: 'Skincare' },
  ],
  'shoe-store': [
    { id: 's1', name: 'Air Max Genesis', price: 180, description: 'Revolutionary cushioning for maximum comfort.', images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400'], category: 'Performance' },
    { id: 's2', name: 'Urban Glide', price: 120, description: 'Sleek design for city life.', images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=400'], category: 'Lifestyle' },
    { id: 's3', name: 'Trail Blazer', price: 150, description: 'Durable grip for any terrain.', images: ['https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&q=80&w=400'], category: 'Outdoor' },
    { id: 's4', name: 'Retro High', price: 210, description: 'Classic silhouette with a modern twist.', images: ['https://images.unsplash.com/photo-1584735175315-9d5df23860e6?auto=format&fit=crop&q=80&w=400'], category: 'Exclusive' },
  ],
  'jewelry-store': [
    { id: 'j1', name: 'Infinity Diamond Ring', price: 3200, description: 'Stunning infinity design with brilliant cut diamonds.', images: ['https://images.unsplash.com/photo-1605100804763-247f67b35534?auto=format&fit=crop&q=80&w=400'], category: 'Rings' },
    { id: 'j2', name: 'Sapphire Drop Earrings', price: 1850, description: 'Deep blue sapphires set in 18k white gold.', images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=400'], category: 'Earrings' },
    { id: 'j3', name: 'Gold Link Bracelet', price: 950, description: 'Hand-polished 24k gold links with secure clasp.', images: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400'], category: 'Bracelets' },
    { id: 'j4', name: 'Emerald Pendant', price: 2400, description: 'Bespoke emerald pendant with gold surround.', images: ['https://images.unsplash.com/photo-1599643478518-a174fc92a5ce?auto=format&fit=crop&q=80&w=400'], category: 'Necklaces' },
  ],
  'bakery-store': [
    { id: 'ba1', name: 'Butter Croissant', price: 4.5, description: 'Flaky, buttery, and golden brown.', images: ['https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=400'], category: 'Pastries' },
    { id: 'ba2', name: 'Sourdough Loaf', price: 8.0, description: 'Naturally leavened with a crisp crust.', images: ['https://images.unsplash.com/photo-1585478259715-876a6a81fc08?auto=format&fit=crop&q=80&w=400'], category: 'Bread' },
    { id: 'ba3', name: 'Macaron Box', price: 24.0, description: 'Assorted flavors of French macarons.', images: ['https://images.unsplash.com/photo-1570784332176-fdd73da66f03?auto=format&fit=crop&q=80&w=400'], category: 'Sweets' },
    { id: 'ba4', name: 'Artisan Baguette', price: 5.5, description: 'Traditional French baguette.', images: ['https://images.unsplash.com/photo-1597079910443-60c43fc4f729?auto=format&fit=crop&q=80&w=400'], category: 'Bread' },
  ],
  'couture-store': [
    { id: 'c1', name: 'Silk Evening Gown', price: 2400, description: 'Hand-sewn silk gown in obsidian black.', images: ['https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&q=80&w=400'], category: 'Gowns' },
    { id: 'c2', name: 'Tailored Blazer', price: 1200, description: 'Structured wool blazer with sharp lapels.', images: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&q=80&w=400'], category: 'Outerwear' },
    { id: 'c3', name: 'Velvet Trousers', price: 850, description: 'High-waisted wide-leg velvet pants.', images: ['https://images.unsplash.com/photo-1594633312681-425c7b97cd31?auto=format&fit=crop&q=80&w=400'], category: 'Trousers' },
    { id: 'c4', name: 'Sheer Mesh Top', price: 450, description: 'Avant-garde mesh top with delicate embroidery.', images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400'], category: 'Tops' },
  ],
  'elite-consulting': [
    { id: 'e1', name: 'Strategic Market Entry', price: 5000, description: 'Comprehensive analysis and roadmap for entering new global markets.', category: 'Strategy' },
    { id: 'e2', name: 'Digital Transformation', price: 8500, description: 'End-to-end modernization of your business operations and tech stack.', category: 'Innovation' },
    { id: 'e3', name: 'Executive Leadership Coaching', price: 2500, description: '1-on-1 performance optimization for C-suite executives.', category: 'Consulting' },
    { id: 'e4', name: 'M&A Due Diligence', price: 12000, description: 'Rigorous financial and operational vetting for mergers and acquisitions.', category: 'Finance' },
  ],
  'creative-studio': [
    { id: 'cs1', name: 'Full Brand Identity', price: 3500, description: 'Logo, typography, color palette, and brand voice guidelines.', category: 'Branding' },
    { id: 'cs2', name: 'Custom Web Experience', price: 6000, description: 'High-performance, immersive digital experience built from scratch.', category: 'Development' },
    { id: 'cs3', name: 'Social Impact Campaign', price: 2800, description: 'Viral-ready content strategy and asset creation.', category: 'Marketing' },
    { id: 'cs4', name: 'UI/UX Audit', price: 1500, description: 'Deep dive into your product usability with actionable improvements.', category: 'Design' },
  ],
  'modern-wellness': [
    { id: 'mw1', name: 'Mindfulness Retreat', price: 1200, description: '3-day immersive experience in a serene natural setting.', category: 'Experience' },
    { id: 'mw2', name: 'Holistic Health Coaching', price: 450, description: 'Personalized nutrition and lifestyle optimization plan.', category: 'Consulting' },
    { id: 'mw3', name: 'Guided Meditation Series', price: 85, description: 'Lifetime access to our premium audio mindfulness library.', category: 'Digital' },
    { id: 'mw4', name: 'Aromatherapy Session', price: 150, description: 'In-person sensory healing experience using organic oils.', category: 'Healing' },
  ],
};

export const Storefront: React.FC = () => {
  const { subdomain } = useParams<{ subdomain: string }>();
  const location = useLocation();
  const { tenant, isLoading: contextLoading, refreshTenant } = useTenant();
  const { sellers, products, bots, isLoading, updateSeller } = useData();
  const [editMode, setEditMode] = useState(false);
  const [sellerData, setSellerData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [localTenant, setLocalTenant] = useState<any>(null);
  const [tenantProducts, setTenantProducts] = useState<any[]>([]);
  const { user } = useAuth();

  const isSellerOfThisStore = user && tenant && (user.id === tenant.userId || tenant.id === 'demo-seller');

  useEffect(() => {
    if (tenant) {
      setLocalTenant(tenant);
      // Load seller data for editing
      const seller = sellers.find(s => s.id === tenant.id);
      if (seller) {
        setSellerData(seller);
      } else if (tenant.id === 'demo-seller') {
        setSellerData(tenant);
      }

      // Fetch tenant products if not demo
      if (tenant.id !== 'demo-seller') {
        productsAPI.getBySellerId(tenant.id)
          .then(setTenantProducts)
          .catch(err => {
            console.error('Error fetching tenant products:', err);
            setTenantProducts([]);
          });
      }
    }
  }, [tenant, sellers]);

  // Handler for updating seller data
  const handleUpdateData = (fieldPath: string, value: any) => {
    if (!sellerData) return;
    
    const fields = fieldPath.split('.');
    if (fields.length === 1) {
      setSellerData({ ...sellerData, [fieldPath]: value });
    } else {
      const nested = fields.slice(0, -1).reduce((obj, key) => obj[key], sellerData);
      if (nested) {
        setSellerData({
          ...sellerData,
          [fields[0]]: {
            ...nested,
            [fields[1]]: value
          }
        });
      }
    }
  };

  // Handler for updating nested theme customizations
  const updateThemeCustomization = (section: string, field: string, value: any) => {
    if (!sellerData) return;
    
    const currentTheme = sellerData.theme || {};
    const currentCustomizations = currentTheme.customizations || {};
    
    // Use field directly as the customization key
    setSellerData({
      ...sellerData,
      theme: {
        ...currentTheme,
        customizations: {
          ...currentCustomizations,
          [field]: value
        }
      }
    });
  };

  // Handler for updating features items
  const updateFeatureItem = (index: number, field: 'title' | 'description', value: string) => {
    if (!sellerData?.theme?.customizations?.features?.items) return;
    
    const items = [...sellerData.theme.customizations.features.items];
    items[index] = { ...items[index], [field]: value };
    
    setSellerData({
      ...sellerData,
      theme: {
        ...sellerData.theme,
        customizations: {
          ...sellerData.theme.customizations,
          features: {
            ...sellerData.theme.customizations.features,
            items
          }
        }
      }
    });
  };

  // Handler for theme colors
  const handleUpdateThemeColor = (type: 'primary' | 'secondary', value: string) => {
    if (!sellerData) return;
    const currentTheme = sellerData.theme || {};
    setSellerData({
      ...sellerData,
      theme: {
        ...currentTheme,
        [type === 'primary' ? 'primaryColor' : 'secondaryColor']: value
      }
    });
  };

  // Image upload handler
  const handleImageUpload = async (file: File, target: 'logo' | 'hero' | 'story') => {
    try {
      const urls = await uploadAPI.upload([file]);
      if (urls && urls.length > 0) {
        const imageUrl = urls[0];
        if (target === 'logo') {
          handleUpdateData('logo', imageUrl);
        } else if (target === 'hero') {
          updateThemeCustomization('hero', 'heroImage', imageUrl);
        } else if (target === 'story') {
          updateThemeCustomization('story', 'storyImage', imageUrl);
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    }
  };

   // Save handler
   const handleSaveCustomization = async () => {
     if (!sellerData || !tenant) return;
     
     setIsSaving(true);
     try {
       await updateSeller(tenant.id, {
         storeName: sellerData.storeName,
         description: sellerData.description,
         logo: sellerData.logo,
         subdomain: sellerData.subdomain,
         shippingPolicy: sellerData.shippingPolicy,
         returnPolicy: sellerData.returnPolicy,
         privacyPolicy: sellerData.privacyPolicy,
         termsOfService: sellerData.termsOfService,
         additionalPages: sellerData.additionalPages || [],
         theme: sellerData.theme || {}
       });
       
       // Update local tenant to reflect changes immediately
       setLocalTenant((prev: any) => ({ 
         ...prev, 
         ...sellerData 
       }));
       
       await refreshTenant();
       
       alert('Customizations saved successfully!');
       setEditMode(false);
     } catch (error) {
       console.error('Error saving customizations:', error);
       alert('Failed to save customizations. Please try again.');
     } finally {
       setIsSaving(false);
     }
   };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (editMode) {
      // Cancel editing - reload seller data
      const seller = sellers.find(s => s.id === tenant?.id);
      if (seller) {
        setSellerData(seller);
      }
    }
    setEditMode(!editMode);
  };

  const showLoading = (isLoading || contextLoading) && !products.length;
  if (showLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        {tenant?.logo ? (
          <div className="relative mb-8">
            <div className="absolute inset-0 animate-ping rounded-full bg-blue-100 opacity-75"></div>
            <img 
              src={tenant.logo} 
              alt={tenant.name} 
              className="relative w-24 h-24 object-contain rounded-2xl shadow-xl"
            />
          </div>
        ) : (
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-6"></div>
        )}
        <h2 className="text-2xl font-black text-gray-900 animate-pulse tracking-tight">
          {tenant?.name || 'Loading Store...'}
        </h2>
      </div>
    );
  }

  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';

  const renderTheme = () => {
    if (!tenant) {
      // Fallback: use default demo with theme from URL
      console.log('No tenant in Storefront, using fallback');
      let themeParam = new URLSearchParams(window.location.search).get('theme');
      
      // Check hash for hash routing
      if (!themeParam && window.location.hash.includes('?')) {
        const hashParts = window.location.hash.split('?');
        if (hashParts.length > 1) {
          themeParam = new URLSearchParams(hashParts[1]).get('theme');
        }
      }
      
      themeParam = themeParam || 'modern-ecommerce';
      console.log('Using theme from URL:', themeParam);
      const fallbackTenant = {
        id: 'demo-seller',
        name: 'Demo Store',
        subdomain: 'demo',
        shopType: 'product',
        description: 'Welcome to our demo store. This is a preview of our theme.',
        themeId: themeParam,
        logo: '',
        theme: { selectedTheme: themeParam },
        deliveryLocations: [
          { id: 'dl1', name: 'Nairobi CBD', fee: 200, enabled: true },
          { id: 'dl2', name: 'Westlands', fee: 300, enabled: true },
          { id: 'dl3', name: 'Mombasa Road', fee: 400, enabled: true }
        ],
        currency: 'KES'
      };
      return renderWithTenant(fallbackTenant);
    }

    return renderWithTenant(tenant);
  };

  const renderWithTenant = (t: any) => {
    // Use themeId directly from tenant (which now includes URL param for demo mode)
    const rawThemeId = t.themeId || 'modern-ecommerce';
    const activeThemeId = rawThemeId.toString().toLowerCase().trim();
    console.log('Rendering theme:', activeThemeId, 'tenant:', t, 'raw:', rawThemeId, 'products:', products.length);
    
    // Get products: prefer actual seller products for live stores or preview of real stores
    const isPreviewMode = new URLSearchParams(window.location.search).get('preview') === 'true';
    let themeProducts;
    if (t.subdomain && t.subdomain !== 'demo' && (t.id !== 'demo-seller')) {
      // Use actual seller products for live stores or preview of real stores
      // Prefer tenantProducts if we fetched them, otherwise fallback to context products
      themeProducts = tenantProducts.length > 0 ? tenantProducts : (products && products.length > 0 ? products : []);
    } else {
      // Use mock products only for the generic "demo" store
      themeProducts = MOCK_PRODUCTS[activeThemeId] || MOCK_PRODUCTS['modern-ecommerce'] || [];
    }

    // Base props that all themes accept
    const baseProps = {
      seller: {
        id: t.id,
        userId: t.userId || '',
        storeName: t.name,
        subdomain: t.subdomain,
        shopType: t.shopType as 'product' | 'service',
        description: t.description,
        theme: t.theme,
        shippingPolicy: t.shippingPolicy,
        returnPolicy: t.returnPolicy,
        privacyPolicy: t.privacyPolicy,
        termsOfService: t.termsOfService,
        additionalPages: t.additionalPages,
        socialLinks: t.socialLinks,
        contactInfo: t.contactInfo,
        logo: t.logo,
        deliveryLocations: t.deliveryLocations,
        paymentTerms: t.paymentTerms,
        subscription: t.subscription || { plan: 'starter', status: 'active', startDate: null, endDate: null },
        pricingConfig: t.pricingConfig,
        currency: t.currency || 'USD',
        stats: { totalProducts: 0, totalOrders: 0, totalRevenue: 0, totalCustomers: 0 },
        isLive: !isPreview,
        createdAt: '',
        paymentGateways: t.paymentGateways
      } as any,
      products: themeProducts
    };

    // Edit mode props for inline customization (only passed to themes that support it)
    const editProps = editMode ? {
      editMode,
      sellerData,
      onUpdateData: handleUpdateData,
      onUpdateThemeCustomization: updateThemeCustomization,
      onUpdateFeatureItem: updateFeatureItem,
      onUpdateThemeColor: handleUpdateThemeColor,
      onImageUpload: handleImageUpload
    } : {};

    console.log('Active theme:', activeThemeId, 'tenant.subdomain:', t.subdomain, 'products:', themeProducts.length);
    
    switch (activeThemeId) {
      case 'modern-wellness':
        console.log('Rendering ModernWellness');
        return <ModernWellness {...baseProps} />;
      case 'creative-studio':
        console.log('Rendering CreativeStudio');
        return <CreativeStudio {...baseProps} />;
      case 'elite-consulting':
        console.log('Rendering EliteConsulting');
        return <EliteConsulting {...baseProps} />;
      case 'couture-store':
        console.log('Rendering CoutureStore');
        return <CoutureStore {...baseProps} {...editProps} />;
      case 'bakery-store':
        console.log('Rendering BakeryStore');
        return <BakeryStore {...baseProps} {...editProps} />;
      case 'jewelry-store':
        console.log('Rendering JewelryStore');
        return <JewelryStore {...baseProps} {...editProps} />;
      case 'shoe-store':
        console.log('Rendering ShoeStore');
        return <ShoeStore {...baseProps} {...editProps} />;
      case 'beauty-store':
        console.log('Rendering BeautyStore');
        return <BeautyStore {...baseProps} {...editProps} />;
      case 'luxury-boutique':
        console.log('Rendering LuxuryBoutique');
        return <LuxuryBoutique {...baseProps} {...editProps} />;
      case 'modern-ecommerce':
      default:
        console.log('Rendering ModernEcommerce');
        return <ModernEcommerce {...baseProps} {...editProps} />;
    }
  };

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      {renderTheme()}
      {bots && bots.length > 0 && <BotWidget bot={bots[0]} />}
      
      {/* Edit Mode Toggle Button */}
      {(isSellerOfThisStore || tenant?.id === 'demo-seller') && !editMode && sellerData && (
        <button
          onClick={() => setEditMode(true)}
          className="fixed bottom-24 right-8 bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:bg-blue-700 transition-all flex items-center gap-2 z-[60] group"
        >
          <Edit3 className="w-6 h-6" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold">
            Edit Store
          </span>
        </button>
      )}
      
      {/* Save Button (shown only in edit mode) */}
      {editMode && (isSellerOfThisStore || tenant?.id === 'demo-seller') && (
        <div className="fixed bottom-8 right-8 z-[60] flex flex-col items-end gap-4">
          <button
            onClick={toggleEditMode}
            className="bg-gray-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-gray-700 transition-all flex items-center gap-2 font-bold"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
          <button
            onClick={handleSaveCustomization}
            disabled={isSaving || !sellerData || tenant?.id === 'demo-seller'}
            className="bg-green-600 text-white px-8 py-4 rounded-full shadow-xl hover:bg-green-700 transition-all flex items-center gap-2 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="w-6 h-6" />
                {tenant?.id === 'demo-seller' ? 'Save Changes (Demo)' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      )}
    </Suspense>
  );
};

export default Storefront;