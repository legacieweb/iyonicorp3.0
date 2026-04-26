import React, { useState, useEffect, useMemo } from 'react';
import { Product, Seller, Order, OrderItem, ordersAPI, reviewsAPI, discountsAPI, Review } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import {
  ShoppingCart, Star, ArrowRight, Heart, Search, Menu, Instagram, Twitter, Facebook,
  ShieldCheck, Truck, RefreshCw, X, Plus, Minus, Trash2, Check, Palette,
  LogIn, UserPlus, Mail, Phone, MapPin, Sparkles, Loader2, MessageCircle, Youtube, Linkedin, Globe,
  Upload, Image as ImageIcon, Edit3, Gift, Package, CreditCard, Zap, Award, Clock, MoveRight
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
    <div className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100" onClick={() => onViewDetail(product)}>
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleWishlist(product); }}
            className={`p-3 rounded-2xl backdrop-blur-md transition-all ${isWishlisted ? 'bg-orange-600 text-white' : 'bg-white/80 text-gray-900 hover:bg-white'}`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>
        <div className="absolute inset-x-4 bottom-4 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-orange-600 transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
           <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">{product.category}</span>
           <div className="flex items-center gap-1">
             <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
             <span className="text-[10px] font-bold text-gray-400">4.8</span>
           </div>
        </div>
        <h4 className="text-lg font-black text-gray-900 mb-2 line-clamp-1 group-hover:text-orange-600 transition-colors uppercase tracking-tight">{product.name}</h4>
        <p className="text-xl font-black text-gray-900" style={{ color: themePrimary }}>{formatPrice(product.price, currency)}</p>
      </div>
    </div>
  );
};

const ShoeStore: React.FC<ThemeProps> = ({
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
  
  const themePrimary = seller.theme?.primaryColor || '#ff6b00';
  const themeSecondary = seller.theme?.secondaryColor || '#111111';
  const customizations = seller.theme?.customizations || {};

  const initialFeatures = [
    { 
      icon: customizations.feature_0_icon ?? 'truck', 
      title: customizations.feature_0_title ?? 'Next Day Delivery', 
      description: customizations.feature_0_desc ?? 'Order by 10PM for next day shipping' 
    },
    { 
      icon: customizations.feature_1_icon ?? 'shield', 
      title: customizations.feature_1_title ?? 'Authenticity Guarantee', 
      description: customizations.feature_1_desc ?? 'Every pair verified by our experts' 
    },
    { 
      icon: customizations.feature_2_icon ?? 'sparkles', 
      title: customizations.feature_2_title ?? 'Sustainability', 
      description: customizations.feature_2_desc ?? 'Made with 40% recycled materials' 
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
    <div className="min-h-screen font-sans bg-white" style={{ fontFamily: '"Inter", sans-serif', backgroundColor: customizations.mainBgColor || '#ffffff' }}>
      {/* Modern Live Editor */}
      {editMode && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-gray-200 px-6 py-3 shadow-lg overflow-x-auto scrollbar-hide">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 whitespace-nowrap text-gray-900">
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2 bg-orange-600 rounded-xl shadow-orange-200 shadow-lg">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-tighter block">Kicks Editor</span>
                <span className="text-[9px] text-orange-600 uppercase font-black tracking-widest">Performance Pro</span>
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
                    value={seller.theme?.primaryColor || '#ff6b00'}
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

              {/* Visibility & Toggles */}
              <div className="flex items-center gap-5 bg-gray-50 p-2 rounded-2xl border border-gray-100 shrink-0 text-gray-900 overflow-x-auto">
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Hero</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('hero', 'hideHero', !customizations.hideHero)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideHero ? 'bg-orange-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideHero ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Story</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('story', 'hideStory', !customizations.hideStory)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideStory ? 'bg-orange-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideStory ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Feat</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('features', 'hideFeatures', !customizations.hideFeatures)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideFeatures ? 'bg-orange-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideFeatures ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2">
                  <label className="text-[7px] uppercase font-black text-gray-400">News</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('newsletter', 'hideNewsletter', !customizations.hideNewsletter)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideNewsletter ? 'bg-orange-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideNewsletter ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              {/* Advanced Colors */}
              <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100 shrink-0">
                <div className="flex items-center gap-2 border-r border-gray-200 pr-3 mr-1">
                  <Palette className="w-3 h-3 text-orange-500" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Footer</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[7px] text-gray-400 uppercase font-black">BG</label>
                    <input
                      type="color"
                      value={customizations.footerBgColor || '#111827'}
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

      {/* Top Banner */}
      <div className="bg-gray-900 text-white py-2 text-center text-[10px] font-black uppercase tracking-[0.3em]">
        Free Worldwide Shipping on all orders over $150
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">
            <div className="flex items-center gap-12">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setView('home')}
              >
                {seller.logo ? (
                  <img src={seller.logo} alt={seller.storeName} className="h-10 w-auto object-contain" />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center -rotate-12 group-hover:rotate-0 transition-transform">
                      <Zap className="text-orange-500 w-7 h-7 fill-orange-500" />
                    </div>
                    <span className="text-3xl font-black tracking-tighter text-gray-900 uppercase italic">
                      {seller.storeName || 'Kicks Studio'}
                    </span>
                  </div>
                )}
              </div>
              <div className="hidden lg:flex items-center gap-8">
                {['New Arrivals', 'Men', 'Women', 'Exclusive'].map(link => (
                  <button key={link} className="text-xs font-black text-gray-900 hover:text-orange-600 uppercase tracking-widest transition-colors">{link}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center bg-gray-50 rounded-2xl px-4 py-2 border border-gray-100">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input type="text" placeholder="Search sneakers..." className="bg-transparent text-xs font-bold focus:outline-none w-40" />
              </div>
              <button 
                onClick={() => setView('cart')}
                className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl text-gray-900 transition-all relative"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </span>
                )}
              </button>
              {!user ? (
                <button 
                  onClick={() => navigate('/login')}
                  className="hidden md:block px-8 py-3.5 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-gray-200"
                >
                  Join the Club
                </button>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-black border-2 border-white shadow-md">
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
            <section className="relative h-[90vh] flex items-center overflow-hidden bg-gray-900">
              <div className="absolute inset-0 z-0">
                <img 
                  src={customizations.heroImage || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop"} 
                  className="w-full h-full object-cover opacity-60 scale-110"
                  alt="Shoe Hero"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
              </div>
              
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="max-w-3xl">
                  <div 
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-white text-xs font-black uppercase tracking-[0.3em] mb-10 shadow-2xl"
                    style={{ backgroundColor: themePrimary }}
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    {editMode ? (
                      <input
                        type="text"
                        value={customizations.heroSubtitle || "Limited Drop: Air Max 2024"}
                        onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroSubtitle', e.target.value)}
                        className="bg-transparent border-none focus:ring-0 p-0 uppercase"
                      />
                    ) : (
                      customizations.heroSubtitle || "Limited Drop: Air Max 2024"
                    )}
                  </div>
                  <h1 className="text-7xl lg:text-[9rem] font-black text-white leading-[0.8] tracking-tighter mb-10 uppercase italic">
                    {editMode ? (
                      <textarea
                        value={customizations.heroTitle1 || "Step into Greatness."}
                        onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroTitle1', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none"
                        rows={2}
                      />
                    ) : (
                      customizations.heroTitle1 || "Step into Greatness."
                    )}
                  </h1>
                  <p className="text-xl text-gray-300 mb-12 font-medium leading-relaxed max-w-xl">
                    {editMode ? (
                      <textarea
                        value={seller.description || ""}
                        onChange={(e) => onUpdateData?.('description', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-xl"
                        rows={3}
                      />
                    ) : (
                      seller.description || "Unleash your potential with our latest collection of performance and lifestyle footwear. Engineered for those who never stop moving."
                    )}
                  </p>
                  <div className="flex flex-wrap gap-6">
                    <button 
                      onClick={() => setView('shop')}
                      className="px-12 py-6 bg-white text-gray-900 rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl hover:scale-105 active:scale-95 flex items-center gap-4"
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themePrimary)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                    >
                      {customizations.heroCtaText || "Explore Drop"}
                      <MoveRight className="w-6 h-6" />
                    </button>
                    <button className="px-12 py-6 bg-transparent text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all border-2 border-white/20">
                      Watch the Film
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating Shoe Tag */}
              <div className="absolute bottom-20 right-20 hidden xl:flex flex-col items-end animate-bounce">
                <span className="text-[12rem] font-black text-white/5 uppercase leading-none select-none tracking-tighter italic">KICKS</span>
              </div>
            </section>
          )}

          {/* Stats / Features */}
          {!customizations.hideFeatures && (
            <section className="py-24 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  {initialFeatures.map((f, i) => {
                    const IconComponent = ICON_MAP[f.icon as keyof typeof ICON_MAP] || Truck;
                    return (
                      <div key={i} className="flex gap-6 items-start p-8 rounded-[2rem] bg-gray-50 border border-gray-100 transition-colors group relative">
                        <div 
                          className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center transition-all relative"
                          style={{ color: themePrimary }}
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
                        <div className="flex-1">
                          <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 mb-2">
                            {editMode ? (
                              <input
                                value={f.title}
                                onChange={(e) => onUpdateThemeCustomization?.('features', `feature_${i}_title`, e.target.value)}
                                className="bg-transparent border-none p-0 w-full focus:ring-0 font-black uppercase tracking-tight text-gray-900"
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
                                className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-sm text-gray-500 font-medium"
                                rows={2}
                              />
                            ) : (
                              f.description
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Brand Story Section */}
          {!customizations.hideStory && (
            <section className="py-24 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-24 items-center">
                  <div className="relative group order-2 md:order-1">
                    <div className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl">
                      <img
                        src={customizations.storyImage || "https://images.unsplash.com/photo-1556906781-9a412961c28c?q=80&w=1974&auto=format&fit=crop"}
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
                    <div className="absolute -top-12 -left-12 w-64 h-64 bg-gray-50 rounded-[4rem] -z-10 animate-pulse" />
                  </div>
                  <div className="space-y-10 order-1 md:order-2">
                    <div className="space-y-4">
                      <span className="text-orange-600 text-xs font-black uppercase tracking-[0.4em]">Our Legacy</span>
                      <h2 className="text-6xl font-black text-gray-900 tracking-tighter leading-none uppercase italic">
                        {editMode ? (
                          <textarea
                            value={customizations.storyTitle || "Engineered for Greatness."}
                            onChange={(e) => onUpdateThemeCustomization?.('story', 'storyTitle', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-6xl font-black tracking-tighter text-gray-900 uppercase italic"
                            rows={2}
                          />
                        ) : (
                          customizations.storyTitle || "Engineered for Greatness."
                        )}
                      </h2>
                    </div>
                    <p className="text-xl text-gray-500 font-medium leading-relaxed">
                      {editMode ? (
                        <textarea
                          value={customizations.storyText || "Since our inception, we've been dedicated to pushing the boundaries of footwear technology. Our journey started on the track and has evolved into a global movement of performance and style."}
                          onChange={(e) => onUpdateThemeCustomization?.('story', 'storyText', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-xl text-gray-500 font-medium"
                          rows={4}
                        />
                      ) : (
                        customizations.storyText || "Since our inception, we've been dedicated to pushing the boundaries of footwear technology. Our journey started on the track and has evolved into a global movement of performance and style."
                      )}
                    </p>
                    <button 
                      className="px-12 py-6 bg-gray-900 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
                    >
                      Our Technology
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* New Arrivals Grid */}
          <section className="py-24 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-end mb-16">
                <div>
                  <h2 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic mb-4">
                    {editMode ? (
                      <input
                        value={customizations.productGridTitle ?? 'Latest Drops'}
                        onChange={(e) => onUpdateThemeCustomization?.('productGrid', 'productGridTitle', e.target.value)}
                        className="bg-transparent border-none p-0 w-full focus:ring-0 text-5xl font-black tracking-tighter uppercase italic text-gray-900"
                      />
                    ) : (
                      customizations.productGridTitle ?? 'Latest Drops'
                    )}
                  </h2>
                  <p className="text-gray-500 font-medium text-lg italic">
                    {editMode ? (
                      <textarea
                        value={customizations.productGridSubtitle ?? "The most anticipated releases, all in one place."}
                        onChange={(e) => onUpdateThemeCustomization?.('productGrid', 'productGridSubtitle', e.target.value)}
                        className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-gray-500 font-medium text-lg italic"
                        rows={2}
                      />
                    ) : (
                      customizations.productGridSubtitle ?? "The most anticipated releases, all in one place."
                    )}
                  </p>
                </div>
                <button 
                  onClick={() => setView('shop')} 
                  className="hidden md:flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themePrimary)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#111827')}
                >
                  Shop All Kicks
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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

          {/* Featured Banner */}
          <section className="py-24 bg-white overflow-hidden">
             <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <div 
                className="relative rounded-[4rem] h-[600px] flex items-center px-12 lg:px-24 overflow-hidden group"
                style={{ backgroundColor: customizations.featuredBannerBgColor || '#111827' }}
               >
                  <img 
                    src={customizations.featuredBannerImage || "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=2070&auto=format&fit=crop"} 
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-[2s]"
                    alt="Featured"
                  />
                  <div className="relative z-10 max-w-xl">
                    <h2 className="text-6xl md:text-8xl font-black text-white leading-[0.8] tracking-tighter uppercase italic mb-10">
                      {editMode ? (
                        <textarea
                          value={customizations.featuredBannerTitle || "Be Legendary."}
                          onChange={(e) => onUpdateThemeCustomization?.('featuredBanner', 'featuredBannerTitle', e.target.value)}
                          className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-6xl md:text-8xl font-black tracking-tighter uppercase italic text-white"
                          rows={2}
                        />
                      ) : (
                        customizations.featuredBannerTitle || "Be Legendary."
                      )}
                    </h2>
                    <p className="text-xl text-gray-300 font-medium mb-12">
                      {editMode ? (
                        <textarea
                          value={customizations.featuredBannerSubtitle || "Exclusive collaborations and limited edition sneakers from the world's most iconic brands."}
                          onChange={(e) => onUpdateThemeCustomization?.('featuredBanner', 'featuredBannerSubtitle', e.target.value)}
                          className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-xl text-gray-300 font-medium"
                          rows={2}
                        />
                      ) : (
                        customizations.featuredBannerSubtitle || "Exclusive collaborations and limited edition sneakers from the world's most iconic brands."
                      )}
                    </p>
                    <button 
                      className="px-12 py-6 text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl"
                      style={{ backgroundColor: themePrimary }}
                    >
                      {customizations.featuredBannerCta || "View Exclusives"}
                    </button>
                  </div>
               </div>
             </div>
          </section>

          {/* Newsletter Section */}
          {!customizations.hideNewsletter && (
            <section className="py-24 bg-gray-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div 
                  className="relative rounded-[4rem] overflow-hidden min-h-[500px] flex items-center px-12 lg:px-24 bg-gray-900"
                >
                  <img 
                    src="https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=2070&auto=format&fit=crop" 
                    className="absolute inset-0 w-full h-full object-cover opacity-20"
                    alt="Newsletter Background"
                  />
                  <div className="relative z-10 max-w-2xl">
                    <h2 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tighter uppercase italic mb-8">
                      {editMode ? (
                        <textarea
                          value={customizations.newsletterTitle ?? 'Join the Inner Circle.'}
                          onChange={(e) => onUpdateThemeCustomization?.('newsletter', 'newsletterTitle', e.target.value)}
                          className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-5xl md:text-7xl font-black tracking-tighter uppercase italic text-white"
                          rows={2}
                        />
                      ) : (
                        customizations.newsletterTitle ?? 'Join the Inner Circle.'
                      )}
                    </h2>
                    <p className="text-xl text-gray-400 mb-12 font-medium italic">
                      {editMode ? (
                        <textarea
                          value={customizations.newsletterSubtitle ?? 'Get early access to drops, member-only events, and exclusive offers.'}
                          onChange={(e) => onUpdateThemeCustomization?.('newsletter', 'newsletterSubtitle', e.target.value)}
                          className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-xl text-gray-400 font-medium"
                          rows={2}
                        />
                      ) : (
                        customizations.newsletterSubtitle ?? 'Get early access to drops, member-only events, and exclusive offers.'
                      )}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 max-w-md">
                      <input 
                        type="email" 
                        placeholder="Drop your email here..." 
                        className="flex-1 px-8 py-5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-gray-500 font-bold focus:outline-none focus:border-orange-600 transition-colors"
                      />
                      <button 
                        className="px-10 py-5 text-white rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-2xl"
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
              <h1 className="text-6xl font-black text-gray-900 tracking-tighter uppercase italic">The Vault</h1>
              <div className="flex flex-wrap gap-3">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-orange-600 text-white shadow-xl shadow-orange-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
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
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-center gap-4 mb-12">
               <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic">Your Box</h1>
               <span className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black">{cart.length} ITEMS</span>
            </div>
            
            {cart.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-24 text-center shadow-xl shadow-gray-200/50 border border-gray-100">
                <div className="w-32 h-32 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 rotate-12">
                  <ShoppingCart className="w-12 h-12 text-gray-300" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-4 uppercase italic">Your box is empty</h2>
                <p className="text-gray-500 mb-12 font-medium max-w-sm mx-auto">Don't let these kicks slip away. Grab your favorites now.</p>
                <button 
                  onClick={() => setView('shop')}
                  className="px-12 py-6 bg-gray-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-all shadow-2xl"
                >
                  Return to Store
                </button>
              </div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-6">
                  {cart.map(item => (
                    <div key={item.product.id} className="bg-white rounded-[2.5rem] p-8 flex gap-8 shadow-sm border border-gray-100 group">
                      <div className="w-32 h-32 rounded-[2rem] overflow-hidden bg-gray-50 shrink-0">
                        <img src={item.product.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-1">{item.product.name}</h3>
                            <p className="text-xs font-black text-orange-600 uppercase tracking-widest">{item.product.category}</p>
                          </div>
                          <button onClick={() => removeFromCart(item.product.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-6 bg-gray-50 rounded-2xl px-6 py-3 border border-gray-100">
                            <button className="text-gray-400 hover:text-gray-900 transition-colors"><Minus className="w-4 h-4" /></button>
                            <span className="font-black text-sm">{item.quantity}</span>
                            <button className="text-gray-400 hover:text-gray-900 transition-colors"><Plus className="w-4 h-4" /></button>
                          </div>
                          <p className="text-2xl font-black text-gray-900">{formatPrice(Number(item.product.price) * item.quantity, seller.currency)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-6">
                  <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-gray-300">
                    <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 italic">Order Summary</h2>
                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between text-gray-400 text-sm font-bold uppercase tracking-widest">
                        <span>Subtotal</span>
                        <span className="text-white">{formatPrice(cartTotal, seller.currency)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400 text-sm font-bold uppercase tracking-widest">
                        <span>Shipping</span>
                        <span className="text-white">FREE</span>
                      </div>
                    </div>
                    <div className="pt-8 border-t border-white/10 flex justify-between items-center mb-10">
                      <span className="text-lg font-black uppercase tracking-tighter italic">Total</span>
                      <span className="text-3xl font-black text-orange-500">{formatPrice(cartTotal, seller.currency)}</span>
                    </div>
                    <button className="w-full py-6 bg-white text-gray-900 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-orange-600 hover:text-white transition-all shadow-2xl">
                      Secure Checkout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Footer */}
      <footer 
        className="pt-32 pb-16 transition-colors duration-500 overflow-hidden relative"
        style={{ 
          backgroundColor: customizations.footerBgColor || '#111827',
          color: customizations.footerTextColor || '#ffffff'
        }}
      >
        <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 text-[25rem] font-black text-white/5 uppercase select-none pointer-events-none italic tracking-tighter">
          KICKS
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-20 mb-32">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-10">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center -rotate-12 shadow-xl"
                  style={{ backgroundColor: themePrimary }}
                >
                  <Zap className="text-white w-8 h-8 fill-current" />
                </div>
                <span className="text-4xl font-black tracking-tighter uppercase italic">{seller.storeName || 'Kicks Studio'}</span>
              </div>
              <p 
                className="font-medium text-xl leading-relaxed max-w-md mb-12 italic opacity-80"
                style={{ color: customizations.footerTextColor || '#ffffff' }}
              >
                {seller.description || "The ultimate destination for sneaker culture. Redefining style, one step at a time."}
              </p>
              <div className="flex gap-8">
                {[Instagram, Facebook, Twitter, Youtube].map((Icon, i) => (
                  <Icon key={i} className="w-7 h-7 opacity-60 hover:opacity-100 transition-all cursor-pointer hover:scale-125" />
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 text-orange-600">Explore</h4>
              <ul className="space-y-5 font-black text-sm uppercase tracking-widest">
                <li><button onClick={() => setView('home')} className="text-gray-400 hover:text-white transition-colors">Home</button></li>
                <li><button onClick={() => setView('shop')} className="text-gray-400 hover:text-white transition-colors">The Vault</button></li>
                <li><button className="text-gray-400 hover:text-white transition-colors">Limited Drop</button></li>
                <li><button className="text-gray-400 hover:text-white transition-colors">Collaborations</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 text-orange-600">Company</h4>
              <ul className="space-y-5 font-black text-sm uppercase tracking-widest">
                <li><button className="text-gray-400 hover:text-white transition-colors">About Us</button></li>
                <li><button className="text-gray-400 hover:text-white transition-colors">Careers</button></li>
                <li><button className="text-gray-400 hover:text-white transition-colors">Store Locator</button></li>
                <li><button className="text-gray-400 hover:text-white transition-colors">Press</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10">
            <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em]">© 2026 {seller.storeName}. All rights reserved.</p>
            <div className="flex items-center gap-3 text-gray-600 font-black text-[10px] uppercase tracking-[0.2em]">
              Powered by <span className="text-white font-black tracking-tighter text-base bg-orange-600 px-3 py-1 rounded-lg">Iyonicorp</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ShoeStore;
