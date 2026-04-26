import React, { useState, useEffect, useMemo } from 'react';
import { Product, Seller, Order, OrderItem, ordersAPI, reviewsAPI, discountsAPI, Review } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import {
  ShoppingCart, Star, ArrowRight, Heart, Search, Menu, Instagram, Twitter, Facebook,
  ShieldCheck, Truck, RefreshCw, X, Plus, Minus, Trash2, Check, Palette,
  LogIn, UserPlus, Mail, Phone, MapPin, Sparkles, Loader2, MessageCircle, Youtube, Linkedin, Globe,
  Upload, Image as ImageIcon, Edit3, Gift, Package, CreditCard, Zap, Award, Clock
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ICON_MAP: Record<string, any> = {
  truck: Truck,
  shield: ShieldCheck,
  refresh: RefreshCw,
  sparkles: Sparkles,
  gift: Gift,
  package: Package,
  card: CreditCard,
  zap: Zap,
  award: Award,
  clock: Clock,
  heart: Heart,
  star: Star
};

interface ThemeProps {
  seller: Seller;
  products: Product[];
  editMode?: boolean;
  sellerData?: Seller;
  onUpdateData?: (fieldPath: string, value: any) => void;
  onUpdateThemeCustomization?: (section: string, field: string, value: any) => void;
  onUpdateFeatureItem?: (index: number, field: 'title' | 'description', value: string) => void;
  onUpdateThemeColor?: (type: 'primary' | 'secondary', value: string) => void;
  onImageUpload?: (file: File, target: 'logo' | 'hero' | 'story') => void;
}

type View = 'home' | 'shop' | 'product-detail' | 'cart' | 'checkout' | 'order-success' | 'auth-choice' | 'policy-page';

const ProductCard = ({
  product,
  onViewDetail,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
  currency = 'USD',
  themePrimary
}: {
  product: Product;
  onViewDetail: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onToggleWishlist: (p: Product) => void;
  isWishlisted: boolean;
  currency?: string;
  themePrimary: string;
}) => {
  return (
    <div className="group cursor-pointer" onClick={() => onViewDetail(product)}>
      <div className="relative aspect-square overflow-hidden rounded-2xl mb-4 bg-gray-50">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleWishlist(product); }}
            className={`p-2 rounded-full backdrop-blur-md transition-all ${isWishlisted ? 'bg-pink-500 text-white' : 'bg-white/80 text-gray-900 hover:bg-white'}`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>
        <div className="absolute inset-x-4 bottom-4 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
            className="w-full py-3 bg-white/90 backdrop-blur-md text-gray-900 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg hover:bg-white"
          >
            Quick Add
          </button>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-pink-600 transition-colors line-clamp-1">{product.name}</h4>
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-gray-900" style={{ color: themePrimary }}>{formatPrice(product.price, currency)}</p>
          <div className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[10px] font-bold text-gray-500">4.9</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const BeautyStore: React.FC<ThemeProps> = ({
  seller: initialSeller,
  products,
  editMode = false,
  sellerData,
  onUpdateData,
  onUpdateThemeCustomization,
  onUpdateThemeColor,
  onImageUpload
}) => {
  const seller = editMode && sellerData ? sellerData : initialSeller;
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const themePrimary = seller.theme?.primaryColor || '#e09fb1';
  const themeSecondary = seller.theme?.secondaryColor || '#fff5f7';
  const customizations = seller.theme?.customizations || {};

  const initialFeatures = [
    { 
      icon: customizations.feature_0_icon ?? 'truck', 
      title: customizations.feature_0_title ?? 'Fast Shipping', 
      description: customizations.feature_0_desc ?? 'Free on orders over $50' 
    },
    { 
      icon: customizations.feature_1_icon ?? 'shield', 
      title: customizations.feature_1_title ?? 'Clean Beauty', 
      description: customizations.feature_1_desc ?? '100% Organic & Vegan' 
    },
    { 
      icon: customizations.feature_2_icon ?? 'refresh', 
      title: customizations.feature_2_title ?? 'Easy Returns', 
      description: customizations.feature_2_desc ?? '30-day money back' 
    },
    { 
      icon: customizations.feature_3_icon ?? 'sparkles', 
      title: customizations.feature_3_title ?? 'Rewards', 
      description: customizations.feature_3_desc ?? 'Earn points every spend' 
    }
  ];

  const [view, setView] = useState<View>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>(() => {
    try {
      const saved = localStorage.getItem(`cart_${seller.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(`wishlist_${seller.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  useEffect(() => {
    localStorage.setItem(`cart_${seller.id}`, JSON.stringify(cart));
  }, [cart, seller.id]);

  useEffect(() => {
    localStorage.setItem(`wishlist_${seller.id}`, JSON.stringify(wishlist));
  }, [wishlist, seller.id]);

  const cartTotal = useMemo(() => cart.reduce((total, item) => total + (Number(item.product.price) * item.quantity), 0), [cart]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const toggleWishlist = (product: Product) => {
    setWishlist(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });
  };

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return products;
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: customizations.mainBgColor || '#ffffff' }}>
      {/* Modern Live Editor */}
      {editMode && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-gray-200 px-6 py-3 shadow-lg overflow-x-auto scrollbar-hide">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 whitespace-nowrap text-gray-900">
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2 bg-pink-600 rounded-xl shadow-pink-200 shadow-lg">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-tighter block">Beauty Editor</span>
                <span className="text-[9px] text-pink-600 uppercase font-black tracking-widest">Interface Pro</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Global Controls */}
              <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100 shrink-0">
                <div className="flex items-center gap-2 border-r border-gray-200 pr-3 mr-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Global</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <label className="text-[7px] text-gray-400 uppercase font-black">Primary</label>
                  <input
                    type="color"
                    value={seller.theme?.primaryColor || '#e09fb1'}
                    onChange={(e) => onUpdateData?.('theme.primaryColor', e.target.value)}
                    className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <label className="text-[7px] text-gray-400 uppercase font-black">BG</label>
                  <input
                    type="color"
                    value={customizations.mainBgColor || '#ffffff'}
                    onChange={(e) => onUpdateThemeCustomization?.('global', 'mainBgColor', e.target.value)}
                    className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                  />
                </div>
              </div>

              {/* Header Controls */}
              <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100 shrink-0">
                <div className="flex items-center gap-2 border-r border-gray-200 pr-3 mr-1">
                  <Menu className="w-3 h-3 text-pink-500" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Header</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[7px] text-gray-400 uppercase font-black">BG</label>
                    <input
                      type="color"
                      value={customizations.headerBgColor || '#ffffff'}
                      onChange={(e) => onUpdateThemeCustomization?.('header', 'headerBgColor', e.target.value)}
                      className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[7px] text-gray-400 uppercase font-black">Text</label>
                    <input
                      type="color"
                      value={customizations.headerTextColor || '#111827'}
                      onChange={(e) => onUpdateThemeCustomization?.('header', 'headerTextColor', e.target.value)}
                      className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Visibility & Toggles */}
              <div className="flex items-center gap-5 bg-gray-50 p-2 rounded-2xl border border-gray-100 shrink-0 text-gray-900 overflow-x-auto">
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Hero</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('hero', 'hideHero', !customizations.hideHero)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideHero ? 'bg-pink-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideHero ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Story</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('story', 'hideStory', !customizations.hideStory)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideStory ? 'bg-pink-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideStory ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Feat</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('features', 'hideFeatures', !customizations.hideFeatures)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideFeatures ? 'bg-pink-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideFeatures ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2">
                  <label className="text-[7px] uppercase font-black text-gray-400">News</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('newsletter', 'hideNewsletter', !customizations.hideNewsletter)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideNewsletter ? 'bg-pink-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideNewsletter ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              {/* Advanced Colors */}
              <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100 shrink-0">
                <div className="flex items-center gap-2 border-r border-gray-200 pr-3 mr-1">
                  <Palette className="w-3 h-3 text-pink-500" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Colors</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[7px] text-gray-400 uppercase font-black">Hero</label>
                    <input
                      type="color"
                      value={customizations.heroTitleColor || '#111827'}
                      onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroTitleColor', e.target.value)}
                      className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[7px] text-gray-400 uppercase font-black">Feat</label>
                    <input
                      type="color"
                      value={customizations.featuresBgColor || '#ffffff'}
                      onChange={(e) => onUpdateThemeCustomization?.('features', 'featuresBgColor', e.target.value)}
                      className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[7px] text-gray-400 uppercase font-black">News</label>
                    <input
                      type="color"
                      value={customizations.newsletterBgColor || '#fdf2f8'}
                      onChange={(e) => onUpdateThemeCustomization?.('newsletter', 'newsletterBgColor', e.target.value)}
                      className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav 
        className="sticky top-0 z-50 backdrop-blur-md border-b border-gray-100"
        style={{ 
          backgroundColor: customizations.headerBgColor || 'rgba(255, 255, 255, 0.8)',
          color: customizations.headerTextColor || '#111827'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-8">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setView('home')}
              >
                {seller.logo ? (
                  <img src={seller.logo} alt={seller.storeName} className="h-10 w-auto object-contain" />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                    style={{ background: `linear-gradient(to bottom right, ${themePrimary}, ${themePrimary}dd)` }}
                  >
                    <Sparkles className="text-white w-6 h-6" />
                  </div>
                )}
                {editMode && onUpdateData ? (
                  <input
                    type="text"
                    value={seller.storeName}
                    onChange={(e) => onUpdateData('storeName', e.target.value)}
                    className="text-2xl font-black tracking-tighter bg-transparent border-none focus:ring-0 p-0 uppercase"
                    style={{ color: customizations.headerTextColor || '#111827' }}
                  />
                ) : (
                  <span className="text-2xl font-black tracking-tighter uppercase">
                    {seller.storeName || 'Beauty Boutique'}
                  </span>
                )}
              </div>
              <div className="hidden md:flex items-center gap-6">
                <button 
                  onClick={() => setView('home')} 
                  className="text-sm font-bold uppercase tracking-widest hover:text-pink-600 transition-colors"
                  style={{ color: view === 'home' ? themePrimary : (customizations.headerTextColor || '#4b5563') }}
                >
                  Home
                </button>
                <button 
                  onClick={() => setView('shop')} 
                  className="text-sm font-bold uppercase tracking-widest hover:text-pink-600 transition-colors"
                  style={{ color: view === 'shop' ? themePrimary : (customizations.headerTextColor || '#4b5563') }}
                >
                  Shop
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:text-pink-600 transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setView('cart')}
                className="p-2 hover:text-pink-600 transition-colors relative"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: themePrimary }}
                  >
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </span>
                )}
              </button>
              {!user ? (
                <button 
                  onClick={() => navigate('/login')}
                  className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                >
                  Sign In
                </button>
              ) : (
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-md"
                  style={{ backgroundColor: `${themePrimary}22`, color: themePrimary }}
                >
                  {user.name?.[0] || 'U'}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {view === 'home' && (
        <main>
          {/* Hero Section */}
          {!customizations.hideHero && (
            <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-[#faf8f6]">
              <div className="absolute inset-0 z-0">
                <img 
                  src={customizations.heroImage || "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=2070&auto=format&fit=crop"} 
                  className="w-full h-full object-cover object-center opacity-90"
                  alt="Beauty Hero"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/50 to-transparent"></div>
              </div>
              
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="max-w-xl">
                  <div 
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 animate-fade-in"
                    style={{ backgroundColor: `${themePrimary}22`, color: themePrimary }}
                  >
                    <Sparkles className="w-3 h-3" />
                    {editMode ? (
                      <input
                        type="text"
                        value={customizations.heroSubtitle || "New Collection Arrived"}
                        onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroSubtitle', e.target.value)}
                        className="bg-transparent border-none focus:ring-0 p-0 uppercase"
                        style={{ color: themePrimary }}
                      />
                    ) : (
                      customizations.heroSubtitle || "New Collection Arrived"
                    )}
                  </div>
                  <h1 
                    className="text-6xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-8"
                    style={{ color: customizations.heroTitleColor || '#111827' }}
                  >
                    {editMode ? (
                      <textarea
                        value={customizations.heroTitle1 || "Reveal Your Natural Glow."}
                        onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroTitle1', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none"
                        rows={2}
                      />
                    ) : (
                      customizations.heroTitle1 || "Reveal Your Natural Glow."
                    )}
                  </h1>
                  <p className="text-xl text-gray-600 mb-12 font-medium leading-relaxed max-w-md">
                    {editMode ? (
                      <textarea
                        value={seller.description || ""}
                        onChange={(e) => onUpdateData?.('description', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-xl"
                        rows={3}
                      />
                    ) : (
                      seller.description || "Experience professional-grade beauty and skincare curated for your unique skin journey."
                    )}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => setView('shop')}
                      className="px-10 py-5 text-white rounded-full font-black text-sm uppercase tracking-widest transition-all shadow-2xl hover:scale-105 active:scale-95 flex items-center gap-3"
                      style={{ backgroundColor: '#111827' }}
                    >
                      {customizations.heroCtaText || "Shop Collection"}
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button className="px-10 py-5 bg-white text-gray-900 rounded-full font-black text-sm uppercase tracking-widest hover:bg-gray-50 transition-all border-2 border-gray-100">
                      Watch Video
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Features */}
          {!customizations.hideFeatures && (
            <section 
              className="py-24 border-y border-gray-100"
              style={{ backgroundColor: customizations.featuresBgColor || '#ffffff' }}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                  {initialFeatures.map((f, i) => {
                    const IconComponent = ICON_MAP[f.icon as keyof typeof ICON_MAP] || Truck;
                    return (
                      <div key={i} className="flex flex-col items-center text-center group relative">
                        <div 
                          className="w-16 h-16 rounded-3xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform relative"
                          style={{ backgroundColor: `${themePrimary}22`, color: themePrimary }}
                        >
                          <IconComponent className="w-8 h-8" strokeWidth={1.5} />
                          {editMode && (
                            <select
                              value={f.icon}
                              onChange={(e) => onUpdateThemeCustomization?.('features', `feature_${i}_icon`, e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            >
                              {Object.keys(ICON_MAP).map(iconName => (
                                <option key={iconName} value={iconName}>{iconName}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 mb-2">
                          {editMode ? (
                            <input
                              value={f.title}
                              onChange={(e) => onUpdateThemeCustomization?.('features', `feature_${i}_title`, e.target.value)}
                              className="bg-transparent border-none p-0 w-full focus:ring-0 text-center font-black uppercase tracking-widest text-gray-900"
                            />
                          ) : (
                            f.title
                          )}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">
                          {editMode ? (
                            <textarea
                              value={f.description}
                              onChange={(e) => onUpdateThemeCustomization?.('features', `feature_${i}_desc`, e.target.value)}
                              className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-center text-xs text-gray-500 font-medium"
                              rows={2}
                            />
                          ) : (
                            f.description
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Brand Story Section */}
          {!customizations.hideStory && (
            <section className="py-24 bg-[#faf8f6]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                  <div className="relative group">
                    <div className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl">
                      <img
                        src={customizations.storyImage || "https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?auto=format&fit=crop&q=80"}
                        alt="Our Story"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>
                    {editMode && (
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[3rem]">
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && onImageUpload?.(e.target.files[0], 'story')}
                        />
                        <div className="flex flex-col items-center gap-2 text-white">
                          <ImageIcon className="w-8 h-8" />
                          <span className="text-xs font-bold uppercase tracking-widest">Change Image</span>
                        </div>
                      </label>
                    )}
                    <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-pink-100 rounded-[2.5rem] -z-10 animate-pulse" />
                  </div>
                  <div className="space-y-8">
                    <div 
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
                      style={{ backgroundColor: `${themePrimary}22`, color: themePrimary }}
                    >
                      Our Philosophy
                    </div>
                    <h2 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter leading-[0.9]">
                      {editMode ? (
                        <textarea
                          value={customizations.storyTitle || "Clean Beauty, Consciously Crafted"}
                          onChange={(e) => onUpdateThemeCustomization?.('story', 'storyTitle', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-5xl md:text-6xl font-black tracking-tighter text-gray-900"
                          rows={2}
                        />
                      ) : (
                        customizations.storyTitle || "Clean Beauty, Consciously Crafted"
                      )}
                    </h2>
                    <p className="text-xl text-gray-600 font-medium leading-relaxed">
                      {editMode ? (
                        <textarea
                          value={customizations.storyText || "Founded on the principle that beauty should be kind to your skin and the planet. We source the finest organic ingredients to create products that deliver professional results without compromise."}
                          onChange={(e) => onUpdateThemeCustomization?.('story', 'storyText', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-xl text-gray-600 font-medium"
                          rows={4}
                        />
                      ) : (
                        customizations.storyText || "Founded on the principle that beauty should be kind to your skin and the planet. We source the finest organic ingredients to create products that deliver professional results without compromise."
                      )}
                    </p>
                    <button 
                      className="px-10 py-5 bg-gray-900 text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
                    >
                      Learn More
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Featured Products */}
          <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
                <div className="max-w-lg">
                  <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter mb-4">
                    {editMode ? (
                      <input
                        value={customizations.productGridTitle ?? 'Trending Now'}
                        onChange={(e) => onUpdateThemeCustomization?.('productGrid', 'productGridTitle', e.target.value)}
                        className="bg-transparent border-none p-0 w-full focus:ring-0 text-4xl md:text-5xl font-black tracking-tighter text-gray-900"
                      />
                    ) : (
                      customizations.productGridTitle ?? 'Trending Now'
                    )}
                  </h2>
                  <p className="text-gray-500 font-medium text-lg">
                    {editMode ? (
                      <textarea
                        value={customizations.productGridSubtitle ?? "Our community's favorites this month. Grab yours before they are gone."}
                        onChange={(e) => onUpdateThemeCustomization?.('productGrid', 'productGridSubtitle', e.target.value)}
                        className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-gray-500 font-medium text-lg"
                        rows={2}
                      />
                    ) : (
                      customizations.productGridSubtitle ?? "Our community's favorites this month. Grab yours before they are gone."
                    )}
                  </p>
                </div>
                <button 
                  onClick={() => setView('shop')} 
                  className="text-sm font-black uppercase tracking-[0.2em] border-b-2 pb-1 hover:text-pink-700 hover:border-pink-700 transition-all"
                  style={{ color: themePrimary, borderBottomColor: themePrimary }}
                >
                  View All Products
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                {products.slice(0, 4).map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onViewDetail={setSelectedProduct}
                    onAddToCart={addToCart}
                    onToggleWishlist={toggleWishlist}
                    isWishlisted={wishlist.some(p => p.id === product.id)}
                    themePrimary={themePrimary}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* CTA Banner / Newsletter */}
          {!customizations.hideNewsletter && (
            <section className="py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div 
                  className="relative rounded-[3rem] overflow-hidden min-h-[500px] flex items-center px-12 lg:px-24"
                  style={{ backgroundColor: customizations.newsletterBgColor || '#fdf2f8' }}
                >
                  <img 
                    src="https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=2070&auto=format&fit=crop" 
                    className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-20"
                    alt="Banner"
                  />
                  <div className="relative z-10 max-w-xl">
                    <h2 className="text-5xl md:text-6xl font-black text-gray-900 leading-[0.9] tracking-tighter mb-8">
                      {editMode ? (
                        <textarea
                          value={customizations.newsletterTitle ?? 'Join Our Beauty Circle & Get 20% Off'}
                          onChange={(e) => onUpdateThemeCustomization?.('newsletter', 'newsletterTitle', e.target.value)}
                          className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-5xl md:text-6xl font-black tracking-tighter text-gray-900"
                          rows={2}
                        />
                      ) : (
                        customizations.newsletterTitle ?? 'Join Our Beauty Circle & Get 20% Off'
                      )}
                    </h2>
                    <p className="text-xl text-gray-700 mb-12 font-medium">
                      {editMode ? (
                        <textarea
                          value={customizations.newsletterSubtitle ?? 'Be the first to know about new arrivals, beauty tips, and exclusive member-only sales.'}
                          onChange={(e) => onUpdateThemeCustomization?.('newsletter', 'newsletterSubtitle', e.target.value)}
                          className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-xl text-gray-700 font-medium"
                          rows={2}
                        />
                      ) : (
                        customizations.newsletterSubtitle ?? 'Be the first to know about new arrivals, beauty tips, and exclusive member-only sales.'
                      )}
                    </p>
                    <div className="flex gap-2 p-2 bg-white rounded-full shadow-2xl max-w-md">
                      <input 
                        type="email" 
                        placeholder="Enter your email" 
                        className="flex-1 px-6 py-3 rounded-full text-sm font-medium focus:outline-none"
                      />
                      <button 
                        className="px-8 py-3 text-white rounded-full text-sm font-black uppercase tracking-widest hover:brightness-110 transition-all"
                        style={{ backgroundColor: themePrimary }}
                      >
                        Join Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      )}

      {view === 'shop' && (
        <main className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-12">The Collection</h1>
            
            {/* Categories */}
            <div className="flex flex-wrap gap-3 mb-16">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onViewDetail={setSelectedProduct}
                  onAddToCart={addToCart}
                  onToggleWishlist={toggleWishlist}
                  isWishlisted={wishlist.some(p => p.id === product.id)}
                  themePrimary={themePrimary}
                />
              ))}
            </div>
          </div>
        </main>
      )}

      {view === 'cart' && (
        <main className="py-24 bg-gray-50 min-h-screen">
          <div className="max-w-3xl mx-auto px-4">
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-12">Your Bag</h1>
            
            {cart.length === 0 ? (
              <div className="bg-white rounded-[2rem] p-16 text-center shadow-sm border border-gray-100">
                <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-8">
                  <ShoppingCart className="w-10 h-10 text-pink-400" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-4">Your bag is empty</h2>
                <p className="text-gray-500 mb-8 font-medium">Looks like you haven't added anything to your bag yet.</p>
                <button 
                  onClick={() => setView('shop')}
                  className="px-10 py-5 bg-gray-900 text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-pink-600 transition-all"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex gap-6 py-6 border-b border-gray-100 last:border-0">
                      <img src={item.product.images[0]} className="w-24 h-24 object-cover rounded-2xl bg-gray-50" />
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">{item.product.name}</h3>
                        <p className="text-sm text-gray-500 mb-4">{item.product.category}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 bg-gray-50 rounded-full px-4 py-2">
                            <button className="text-gray-400 hover:text-gray-900 transition-colors"><Minus className="w-4 h-4" /></button>
                            <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                            <button className="text-gray-400 hover:text-gray-900 transition-colors"><Plus className="w-4 h-4" /></button>
                          </div>
                          <p className="font-black text-gray-900">{formatPrice(Number(item.product.price) * item.quantity, seller.currency)}</p>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-gray-300 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
                    </div>
                  ))}
                </div>
                
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-gray-500 font-bold uppercase tracking-widest text-xs">Total</span>
                    <span className="text-3xl font-black text-gray-900">{formatPrice(cartTotal, seller.currency)}</span>
                  </div>
                  <button className="w-full py-6 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-pink-600 transition-all shadow-xl shadow-gray-200">
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Footer */}
      <footer 
        className="py-24 transition-colors duration-500"
        style={{ 
          backgroundColor: customizations.footerBgColor || '#111827',
          color: customizations.footerTextColor || '#ffffff'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-8">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl"
                  style={{ background: `linear-gradient(to bottom right, ${themePrimary}, ${themePrimary}dd)` }}
                >
                  <Sparkles className="text-white w-7 h-7" />
                </div>
                <span className="text-3xl font-black tracking-tighter uppercase">{seller.storeName || 'Beauty Boutique'}</span>
              </div>
              <p 
                className="font-medium text-lg leading-relaxed max-w-sm mb-12 opacity-80"
                style={{ color: customizations.footerTextColor || '#ffffff' }}
              >
                {seller.description || "Elevating your daily beauty ritual with curated essentials that prioritize both efficacy and experience."}
              </p>
              <div className="flex gap-6">
                <Instagram className="w-6 h-6 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" />
                <Facebook className="w-6 h-6 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" />
                <Twitter className="w-6 h-6 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" />
              </div>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-8 opacity-50">Quick Links</h4>
              <ul className="space-y-4 font-bold">
                <li><button onClick={() => setView('home')} className="opacity-70 hover:opacity-100 transition-opacity">Home</button></li>
                <li><button onClick={() => setView('shop')} className="opacity-70 hover:opacity-100 transition-opacity">Shop All</button></li>
                <li><button className="opacity-70 hover:opacity-100 transition-opacity">Our Story</button></li>
                <li><button className="opacity-70 hover:opacity-100 transition-opacity">Contact</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-8 opacity-50">Support</h4>
              <ul className="space-y-4 font-bold">
                <li><button className="opacity-70 hover:opacity-100 transition-opacity">Shipping Policy</button></li>
                <li><button className="opacity-70 hover:opacity-100 transition-opacity">Returns & Refunds</button></li>
                <li><button className="opacity-70 hover:opacity-100 transition-opacity">Terms of Service</button></li>
                <li><button className="opacity-70 hover:opacity-100 transition-opacity">Privacy Policy</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="opacity-50 text-sm font-medium">© {new Date().getFullYear()} {seller.storeName}. All rights reserved.</p>
            <div className="flex items-center gap-2 opacity-50 font-bold text-[10px] uppercase tracking-widest">
              Powered by <span className="opacity-100 font-black tracking-tighter">Iyonicorp</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BeautyStore;
