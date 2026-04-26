import React, { useState, useEffect, useMemo } from 'react';
import { Product, Seller, Order, OrderItem, ordersAPI, reviewsAPI, discountsAPI, Review } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import {
  ShoppingCart, Star, ArrowRight, Heart, Search, Menu, Instagram, Twitter, Facebook,
  ShieldCheck, Truck, RefreshCw, X, Plus, Minus, Trash2, Check, Palette,
  LogIn, UserPlus, Mail, Phone, MapPin, Sparkles, Loader2, MessageCircle, Youtube, Linkedin, Globe,
  Upload, Image as ImageIcon, Edit3, Gift, Package, CreditCard, Zap, Award, Clock, Utensils
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
  star: Star,
  utensils: Utensils,
  shopping: ShoppingCart,
  search: Search,
  menu: Menu,
  mail: Mail,
  phone: Phone,
  mapPin: MapPin,
  message: MessageCircle,
  globe: Globe,
  instagram: Instagram,
  twitter: Twitter,
  facebook: Facebook,
  youtube: Youtube,
  linkedin: Linkedin
};

type View = 'home' | 'shop' | 'product-detail' | 'cart' | 'checkout' | 'order-success';

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
    <div className="group cursor-pointer bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500" onClick={() => onViewDetail(product)}>
      <div className="relative aspect-square overflow-hidden bg-[#fdfaf5]">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleWishlist(product); }}
            className={`p-3 rounded-full backdrop-blur-md transition-all ${isWishlisted ? 'bg-orange-400 text-white' : 'bg-white/80 text-gray-900 hover:bg-white'}`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>
        <div className="absolute inset-x-4 bottom-4 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
            className="w-full py-3 bg-[#8b5e3c] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg hover:bg-[#6f4a30]"
          >
            Add to Basket
          </button>
        </div>
      </div>
      <div className="p-6">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#8b5e3c] mb-2 block">{product.category}</span>
        <h4 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#8b5e3c] transition-colors">{product.name}</h4>
        <div className="flex items-center justify-between">
          <p className="text-xl font-black text-gray-900" style={{ color: themePrimary }}>{formatPrice(product.price, currency)}</p>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
            <span className="text-[10px] font-bold text-gray-400">Fresh Daily</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const BakeryStore: React.FC<ThemeProps> = ({
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
  
  const themePrimary = seller.theme?.primaryColor || '#8b5e3c'; // Bread brown
  const themeSecondary = seller.theme?.secondaryColor || '#fdfaf5'; // Cream
  const customizations = seller.theme?.customizations || {};

  const initialFeatures = [
    { 
      icon: customizations.feature_0_icon ?? 'clock', 
      title: customizations.feature_0_title ?? 'Fresh Daily', 
      description: customizations.feature_0_desc ?? 'Baked every morning at 4 AM' 
    },
    { 
      icon: customizations.feature_1_icon ?? 'sparkles', 
      title: customizations.feature_1_title ?? 'Organic Only', 
      description: customizations.feature_1_desc ?? 'Heritage grains & local produce' 
    },
    { 
      icon: customizations.feature_2_icon ?? 'truck', 
      title: customizations.feature_2_title ?? 'Home Delivery', 
      description: customizations.feature_2_desc ?? 'Warm bread to your doorstep' 
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
    <div className="min-h-screen font-sans" style={{ backgroundColor: customizations.mainBgColor || '#fdfaf5' }}>
      {/* Modern Live Editor */}
      {editMode && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-gray-200 px-6 py-3 shadow-lg overflow-x-auto scrollbar-hide">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 whitespace-nowrap text-gray-900">
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2 bg-[#8b5e3c] rounded-xl shadow-[#8b5e3c]/20 shadow-lg">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-tighter block">Bakery Editor</span>
                <span className="text-[9px] text-[#8b5e3c] uppercase font-black tracking-widest">Artisan Pro</span>
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
                    value={seller.theme?.primaryColor || '#8b5e3c'}
                    onChange={(e) => onUpdateData?.('theme.primaryColor', e.target.value)}
                    className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <label className="text-[7px] text-gray-400 uppercase font-black">BG</label>
                  <input
                    type="color"
                    value={customizations.mainBgColor || '#fdfaf5'}
                    onChange={(e) => onUpdateThemeCustomization?.('global', 'mainBgColor', e.target.value)}
                    className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                  />
                </div>
              </div>

              {/* Visibility & Toggles */}
              <div className="flex items-center gap-5 bg-gray-50 p-2 rounded-2xl border border-gray-100 shrink-0 text-gray-900 overflow-x-auto">
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Hero</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('hero', 'hideHero', !customizations.hideHero)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideHero ? 'bg-[#8b5e3c]' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideHero ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Story</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('story', 'hideStory', !customizations.hideStory)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideStory ? 'bg-[#8b5e3c]' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideStory ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Feat</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('features', 'hideFeatures', !customizations.hideFeatures)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideFeatures ? 'bg-[#8b5e3c]' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideFeatures ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              {/* Advanced Colors */}
              <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100 shrink-0">
                <div className="flex items-center gap-2 border-r border-gray-200 pr-3 mr-1">
                  <Palette className="w-3 h-3 text-[#8b5e3c]" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Footer</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[7px] text-gray-400 uppercase font-black">BG</label>
                    <input
                      type="color"
                      value={customizations.footerBgColor || '#8b5e3c'}
                      onChange={(e) => onUpdateThemeCustomization?.('footer', 'footerBgColor', e.target.value)}
                      className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[7px] text-gray-400 uppercase font-black">Text</label>
                    <input
                      type="color"
                      value={customizations.footerTextColor || '#ffffff'}
                      onChange={(e) => onUpdateThemeCustomization?.('footer', 'footerTextColor', e.target.value)}
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
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-10">
              <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setView('home')}
              >
                <div className="w-10 h-10 rounded-full bg-[#8b5e3c] flex items-center justify-center group-hover:rotate-12 transition-transform">
                  <Utensils className="text-white w-5 h-5" />
                </div>
                <span className="text-2xl font-black tracking-tight text-[#8b5e3c] uppercase">
                  {seller.storeName || 'The Flour Mill'}
                </span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              {['Home', 'Menu', 'Our Story', 'Wholesale'].map(link => (
                <button 
                  key={link} 
                  onClick={() => link === 'Menu' && setView('shop')}
                  className="text-xs font-bold text-gray-600 hover:text-[#8b5e3c] uppercase tracking-widest transition-colors"
                >
                  {link}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('cart')}
                className="p-2 text-[#8b5e3c] hover:bg-orange-50 rounded-full transition-all relative"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute top-0 right-0 bg-orange-400 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </span>
                )}
              </button>
              {!user ? (
                <button 
                  onClick={() => navigate('/login')}
                  className="px-6 py-2.5 bg-[#8b5e3c] text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#6f4a30] transition-all"
                >
                  Sign In
                </button>
              ) : (
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-[#8b5e3c] font-bold border-2 border-white">
                  {user.name?.[0] || 'B'}
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
            <section className="relative h-[80vh] flex items-center overflow-hidden bg-[#faf3eb]">
              <div className="absolute inset-0 z-0">
                <img 
                  src={customizations.heroImage || "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=2072&auto=format&fit=crop"} 
                  className="w-full h-full object-cover opacity-80"
                  alt="Bakery Hero"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#fdfaf5] via-transparent to-transparent"></div>
              </div>
              
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="max-w-xl">
                  <span 
                    className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 block animate-fade-in"
                    style={{ color: themePrimary }}
                  >
                    {editMode ? (
                      <input
                        type="text"
                        value={customizations.heroSubtitle || "Artisanal & Organic"}
                        onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroSubtitle', e.target.value)}
                        className="bg-transparent border-none focus:ring-0 p-0 uppercase tracking-[0.4em]"
                        style={{ color: themePrimary }}
                      />
                    ) : (
                      customizations.heroSubtitle || "Artisanal & Organic"
                    )}
                  </span>
                  <h1 className="text-6xl lg:text-8xl font-black text-gray-900 leading-[0.9] tracking-tighter mb-8">
                    {editMode ? (
                      <textarea
                        value={customizations.heroTitle1 || "Baked with Love daily."}
                        onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroTitle1', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none font-black tracking-tighter"
                        rows={2}
                      />
                    ) : (
                      customizations.heroTitle1 || "Baked with Love daily."
                    )}
                  </h1>
                  <p className="text-xl text-gray-600 mb-10 font-medium leading-relaxed">
                    {editMode ? (
                      <textarea
                        value={seller.description || ""}
                        onChange={(e) => onUpdateData?.('description', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-xl"
                        rows={3}
                      />
                    ) : (
                      seller.description || "Discover the magic of sourdough, flaky croissants, and decadent pastries made with heritage grains."
                    )}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => setView('shop')}
                      className="px-10 py-5 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl shadow-orange-200"
                      style={{ backgroundColor: themePrimary }}
                    >
                      {customizations.heroCtaText || "View Our Menu"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Features / Stats */}
          {!customizations.hideFeatures && (
            <section className="py-24 bg-[#fdfaf5] border-y border-orange-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  {initialFeatures.map((f, i) => {
                    const IconComponent = ICON_MAP[f.icon as keyof typeof ICON_MAP] || Truck;
                    return (
                      <div key={i} className="flex flex-col items-center text-center group relative">
                        <div 
                          className="w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-transform relative"
                          style={{ backgroundColor: `${themePrimary}11`, color: themePrimary }}
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
                        <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 mb-2">
                          {editMode ? (
                            <input
                              value={f.title}
                              onChange={(e) => onUpdateThemeCustomization?.('features', `feature_${i}_title`, e.target.value)}
                              className="bg-transparent border-none p-0 w-full focus:ring-0 text-center font-black uppercase tracking-tight text-gray-900"
                            />
                          ) : (
                            f.title
                          )}
                        </h3>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed">
                          {editMode ? (
                            <textarea
                              value={f.description}
                              onChange={(e) => onUpdateThemeCustomization?.('features', `feature_${i}_desc`, e.target.value)}
                              className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-center text-sm text-gray-500 font-medium"
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

          {/* Featured items */}
          <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-black text-gray-900 tracking-tighter mb-4">
                  {editMode ? (
                    <input
                      value={customizations.productGridTitle ?? 'Fresh from the Oven'}
                      onChange={(e) => onUpdateThemeCustomization?.('productGrid', 'productGridTitle', e.target.value)}
                      className="bg-transparent border-none p-0 w-full focus:ring-0 text-center text-4xl font-black tracking-tighter text-gray-900"
                    />
                  ) : (
                    customizations.productGridTitle ?? 'Fresh from the Oven'
                  )}
                </h2>
                <p className="text-gray-500 font-medium">
                  {editMode ? (
                    <textarea
                      value={customizations.productGridSubtitle ?? 'Handcrafted daily using only the finest ingredients.'}
                      onChange={(e) => onUpdateThemeCustomization?.('productGrid', 'productGridSubtitle', e.target.value)}
                      className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-center text-gray-500 font-medium"
                      rows={2}
                    />
                  ) : (
                    customizations.productGridSubtitle ?? 'Handcrafted daily using only the finest ingredients.'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
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

          {/* Brand Story Section */}
          {!customizations.hideStory && (
            <section className="py-24 bg-[#faf3eb]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                  <div className="relative group">
                    <div className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl">
                      <img
                        src={customizations.storyImage || "https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=1926&auto=format&fit=crop"}
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
                  </div>
                  <div className="space-y-8">
                    <span 
                      className="text-[10px] font-black uppercase tracking-[0.4em]"
                      style={{ color: themePrimary }}
                    >
                      Our Tradition
                    </span>
                    <h2 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">
                      {editMode ? (
                        <textarea
                          value={customizations.storyTitle || "The Secret is in the Sourdough."}
                          onChange={(e) => onUpdateThemeCustomization?.('story', 'storyTitle', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-5xl font-black tracking-tighter text-gray-900"
                          rows={2}
                        />
                      ) : (
                        customizations.storyTitle || "The Secret is in the Sourdough."
                      )}
                    </h2>
                    <p className="text-lg text-gray-600 font-medium leading-relaxed">
                      {editMode ? (
                        <textarea
                          value={customizations.storyText || "We believe in the slow way of doing things. Our starters are decades old, and our techniques haven't changed in generations. Every loaf is a labor of time, heat, and passion."}
                          onChange={(e) => onUpdateThemeCustomization?.('story', 'storyText', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-lg text-gray-600 font-medium"
                          rows={4}
                        />
                      ) : (
                        customizations.storyText || "We believe in the slow way of doing things. Our starters are decades old, and our techniques haven't changed in generations. Every loaf is a labor of time, heat, and passion."
                      )}
                    </p>
                    <button 
                      className="px-10 py-5 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-xl"
                      style={{ backgroundColor: themePrimary }}
                    >
                      Learn Our Craft
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      )}

      {view === 'shop' && (
        <main className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
              <div>
                <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-4">Our Full Menu</h1>
                <p className="text-gray-500 font-medium italic">Click on items to see ingredients and details.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-[#8b5e3c] text-white' : 'bg-white text-gray-500 border border-orange-100 hover:bg-orange-50'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
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

      {/* Footer */}
      <footer 
        className="py-20 transition-colors duration-500"
        style={{ 
          backgroundColor: customizations.footerBgColor || '#8b5e3c',
          color: customizations.footerTextColor || '#ffffff'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 text-center md:text-left">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
                <Utensils className="w-8 h-8" style={{ color: customizations.footerTextColor || '#ffffff' }} />
                <span className="text-2xl font-black tracking-tight uppercase">{seller.storeName || 'The Flour Mill'}</span>
              </div>
              <p 
                className="font-medium leading-relaxed max-w-sm mx-auto md:mx-0 opacity-70"
                style={{ color: customizations.footerTextColor || '#ffffff' }}
              >
                {seller.description || "Bringing the authentic taste of artisanal baking to your table every single morning."}
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest opacity-50">Visit Us</h4>
              <p className="font-medium">123 Bakery Lane, <br/>Pastry District, NY 10001</p>
              <p className="font-medium">Mon-Sat: 7am - 6pm</p>
            </div>
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-widest opacity-50">Follow the Aroma</h4>
              <div className="flex justify-center md:justify-start gap-6">
                <Instagram className="w-6 h-6 hover:opacity-70 transition-opacity cursor-pointer" />
                <Facebook className="w-6 h-6 hover:opacity-70 transition-opacity cursor-pointer" />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BakeryStore;
