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
    <div className="group cursor-pointer mb-12" onClick={() => onViewDetail(product)}>
      <div className="relative aspect-[3/4] overflow-hidden mb-6">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-all duration-[1.5s] group-hover:scale-105 group-hover:brightness-90 grayscale-[20%] group-hover:grayscale-0"
        />
        <div className="absolute top-6 right-6">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleWishlist(product); }}
            className={`p-2 transition-all ${isWishlisted ? 'text-black' : 'text-gray-400 hover:text-black'}`}
          >
            <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
        <div className="absolute bottom-8 left-8 right-8 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
           <button
             onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
             className="w-full py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.4em] hover:bg-gray-800 transition-colors"
           >
             Quick Add
           </button>
        </div>
      </div>
      <div className="px-2 flex justify-between items-start">
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-black mb-1 group-hover:underline underline-offset-4 decoration-1 transition-all">{product.name}</h4>
          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-[0.2em]">{product.category}</p>
        </div>
        <p className="text-[11px] font-black tracking-[0.2em] text-black">{formatPrice(product.price, currency)}</p>
      </div>
    </div>
  );
};

const CoutureStore: React.FC<ThemeProps> = ({
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
  
  const themePrimary = seller.theme?.primaryColor || '#000000';
  const themeSecondary = seller.theme?.secondaryColor || '#ffffff';
  const customizations = seller.theme?.customizations || {};

  const initialFeatures = [
    { 
      icon: customizations.feature_0_icon ?? 'award', 
      title: customizations.feature_0_title ?? 'Handmade in Paris', 
      description: customizations.feature_0_desc ?? 'Authentic couture craftsmanship' 
    },
    { 
      icon: customizations.feature_1_icon ?? 'sparkles', 
      title: customizations.feature_1_title ?? 'Bespoke Tailoring', 
      description: customizations.feature_1_desc ?? 'Pieces made to your exact measurements' 
    },
    { 
      icon: customizations.feature_2_icon ?? 'shield', 
      title: customizations.feature_2_title ?? 'Exclusive Designs', 
      description: customizations.feature_2_desc ?? 'Limited edition seasonal collections' 
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
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white" style={{ backgroundColor: customizations.mainBgColor || '#ffffff', color: customizations.mainTextColor || '#000000' }}>
      {/* Modern Live Editor */}
      {editMode && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-gray-200 px-6 py-3 shadow-lg overflow-x-auto scrollbar-hide">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 whitespace-nowrap text-gray-900">
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2 bg-black rounded-xl shadow-gray-200 shadow-lg">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-tighter block">Atelier Editor</span>
                <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Couture Pro</span>
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
                    value={seller.theme?.primaryColor || '#000000'}
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
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideHero ? 'bg-black' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideHero ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Story</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('story', 'hideStory', !customizations.hideStory)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideStory ? 'bg-black' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideStory ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Feat</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('features', 'hideFeatures', !customizations.hideFeatures)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideFeatures ? 'bg-black' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideFeatures ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              {/* Advanced Colors */}
              <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100 shrink-0">
                <div className="flex items-center gap-2 border-r border-gray-200 pr-3 mr-1">
                  <Palette className="w-3 h-3 text-black" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Footer</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[7px] text-gray-400 uppercase font-black">BG</label>
                    <input
                      type="color"
                      value={customizations.footerBgColor || '#ffffff'}
                      onChange={(e) => onUpdateThemeCustomization?.('footer', 'footerBgColor', e.target.value)}
                      className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[7px] text-gray-400 uppercase font-black">Text</label>
                    <input
                      type="color"
                      value={customizations.footerTextColor || '#000000'}
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

      {/* Dynamic Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-[1800px] mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center h-24">
            <div className="flex-1 hidden lg:flex items-center gap-10">
               {['Collection', 'Runway', 'Bespoke'].map(l => (
                 <button key={l} onClick={() => setView('shop')} className="text-[10px] font-black uppercase tracking-[0.4em] hover:opacity-50 transition-opacity">{l}</button>
               ))}
            </div>

            <div 
              className="flex flex-col items-center cursor-pointer"
              onClick={() => setView('home')}
            >
              <span className="text-3xl font-light tracking-[0.5em] uppercase leading-none mb-1">
                {seller.storeName || 'MODA'}
              </span>
              <span className="text-[8px] font-black tracking-[0.8em] uppercase text-gray-400">Atelier Couture</span>
            </div>

            <div className="flex-1 flex justify-end items-center gap-8">
              <button className="hidden sm:block">
                <Search className="w-5 h-5 stroke-1" />
              </button>
              <button onClick={() => setView('cart')} className="relative">
                <ShoppingCart className="w-5 h-5 stroke-1" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-black text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
              <button onClick={() => navigate('/login')} className="text-[10px] font-black uppercase tracking-[0.4em]">Log In</button>
            </div>
          </div>
        </div>
      </header>

      {view === 'home' && (
        <main>
          {/* Hero - Large Cinematic Imagery */}
          {!customizations.hideHero && (
            <section className="relative h-[90vh] bg-gray-50 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0">
                <img 
                  src={customizations.heroImage || "https://images.unsplash.com/photo-1539109132314-d4a8c62e41dc?q=80&w=2070&auto=format&fit=crop"} 
                  className="w-full h-full object-cover object-top grayscale"
                  alt="Runway"
                />
                <div className="absolute inset-0 bg-black/10" />
              </div>
              
              <div className="relative z-10 text-center max-w-4xl px-6">
                <div className="w-16 h-px bg-white mx-auto mb-8"></div>
                <h1 className="text-7xl lg:text-[10rem] font-light text-white leading-none tracking-tighter uppercase mb-12">
                  {editMode ? (
                    <textarea
                      value={customizations.heroTitle1 || "Avant-Garde."}
                      onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroTitle1', e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-center font-light tracking-tighter uppercase"
                      rows={1}
                    />
                  ) : (
                    customizations.heroTitle1 || "Avant-Garde."
                  )}
                </h1>
                <div className="flex justify-center gap-12">
                  <button 
                    onClick={() => setView('shop')}
                    className="px-12 py-5 bg-white text-black text-[10px] font-black uppercase tracking-[0.4em] hover:bg-black hover:text-white transition-all transform hover:scale-105"
                  >
                    {customizations.heroCtaText || "View Spring '24"}
                  </button>
                </div>
              </div>

              <div className="absolute bottom-12 left-12 hidden lg:block">
                <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white/60">
                  {editMode ? (
                    <input
                      type="text"
                      value={customizations.heroSubtitle || "Paris • Milan • London • New York"}
                      onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroSubtitle', e.target.value)}
                      className="bg-transparent border-none focus:ring-0 p-0 text-[9px] font-black uppercase tracking-[0.5em]"
                    />
                  ) : (
                    customizations.heroSubtitle || "Paris • Milan • London • New York"
                  )}
                </p>
              </div>
            </section>
          )}

          {/* Minimal Grid / Features */}
          {!customizations.hideFeatures && (
            <section className="py-24 border-b border-gray-100 bg-gray-50/30">
              <div className="max-w-[1800px] mx-auto px-6 lg:px-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-20">
                  {initialFeatures.map((f, i) => {
                    const IconComponent = ICON_MAP[f.icon as keyof typeof ICON_MAP] || Award;
                    return (
                      <div key={i} className="space-y-6 group relative">
                        <div className="flex items-center gap-4">
                          <IconComponent className="w-5 h-5 stroke-1" />
                          {editMode && (
                            <select
                              value={f.icon}
                              onChange={(e) => onUpdateThemeCustomization?.('features', `feature_${i}_icon`, e.target.value)}
                              className="absolute left-0 w-5 h-5 opacity-0 cursor-pointer"
                            >
                              {Object.keys(ICON_MAP).map(iconName => (
                                <option key={iconName} value={iconName}>{iconName}</option>
                              ))}
                            </select>
                          )}
                          <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">
                            {editMode ? (
                              <input
                                value={f.title}
                                onChange={(e) => onUpdateThemeCustomization?.('features', `feature_${i}_title`, e.target.value)}
                                className="bg-transparent border-none p-0 w-full focus:ring-0 font-black uppercase tracking-[0.4em]"
                              />
                            ) : (
                              f.title
                            )}
                          </h3>
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium uppercase tracking-[0.2em] leading-relaxed">
                          {editMode ? (
                            <textarea
                              value={f.description}
                              onChange={(e) => onUpdateThemeCustomization?.('features', `feature_${i}_desc`, e.target.value)}
                              className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-[11px] text-gray-500 font-medium uppercase tracking-[0.2em]"
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

          {/* Featured Grid */}

          {/* Minimal Grid */}
          <section className="py-32 px-6 lg:px-12 bg-white max-w-[1800px] mx-auto">
             <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-end mb-24">
                <div className="md:col-span-8">
                   <span className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-400 block mb-6">
                    {editMode ? (
                      <input
                        value={customizations.productGridSubtitle ?? 'Curated Selection'}
                        onChange={(e) => onUpdateThemeCustomization?.('productGrid', 'productGridSubtitle', e.target.value)}
                        className="bg-transparent border-none p-0 w-full focus:ring-0 text-[10px] font-black uppercase tracking-[0.6em] text-gray-400"
                      />
                    ) : (
                      customizations.productGridSubtitle ?? 'Curated Selection'
                    )}
                   </span>
                   <h2 className="text-5xl lg:text-7xl font-light uppercase tracking-tight leading-none italic">
                    {editMode ? (
                      <textarea
                        value={customizations.productGridTitle ?? 'The New Standard of Elegance.'}
                        onChange={(e) => onUpdateThemeCustomization?.('productGrid', 'productGridTitle', e.target.value)}
                        className="bg-transparent border-none p-0 w-full focus:ring-0 text-5xl lg:text-7xl font-light uppercase tracking-tight leading-none italic"
                        rows={2}
                      />
                    ) : (
                      customizations.productGridTitle ?? 'The New Standard of Elegance.'
                    )}
                   </h2>
                </div>
                <div className="md:col-span-4 flex md:justify-end">
                   <button onClick={() => setView('shop')} className="flex items-center gap-4 group">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em]">Explore All Pieces</span>
                      <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                   </button>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {products.slice(0, 3).map(product => (
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
          </section>

          {/* Big Statement Section / Story */}
          {!customizations.hideStory && (
            <section className="py-48 bg-black text-white text-center overflow-hidden relative group">
              {customizations.storyImage && (
                <img 
                  src={customizations.storyImage} 
                  className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale"
                  alt="Story Background"
                />
              )}
               <div className="max-w-4xl mx-auto px-6 relative z-10">
                  <span 
                    className="text-[10px] font-black uppercase tracking-[0.6em] text-white/40 block mb-12"
                  >
                    Atelier
                  </span>
                  <h2 className="text-5xl md:text-8xl font-light uppercase tracking-tighter leading-none italic mb-16">
                    {editMode ? (
                      <textarea
                        value={customizations.storyTitle || '"Fashion Fades, Style is Eternal."'}
                        onChange={(e) => onUpdateThemeCustomization?.('story', 'storyTitle', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-center text-5xl md:text-8xl font-light uppercase tracking-tighter leading-none italic text-white"
                        rows={2}
                      />
                    ) : (
                      customizations.storyTitle || '"Fashion Fades, Style is Eternal."'
                    )}
                  </h2>
                  <p className="text-lg md:text-2xl text-white/60 font-light italic leading-relaxed tracking-wide">
                    {editMode ? (
                      <textarea
                        value={customizations.storyText || "Every stitch in our atelier is a testament to the pursuit of perfection. We don't create clothing; we create identity."}
                        onChange={(e) => onUpdateThemeCustomization?.('story', 'storyText', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-center text-lg md:text-2xl font-light italic leading-relaxed tracking-wide text-white/60"
                        rows={3}
                      />
                    ) : (
                      customizations.storyText || "Every stitch in our atelier is a testament to the pursuit of perfection. We don't create clothing; we create identity."
                    )}
                  </p>
                  {editMode && (
                    <label className="inline-block mt-12 px-8 py-4 border border-white/20 text-[10px] font-black uppercase tracking-[0.4em] cursor-pointer hover:bg-white hover:text-black transition-all">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && onImageUpload?.(e.target.files[0], 'story')}
                      />
                      Change Background
                    </label>
                  )}
               </div>
            </section>
          )}
        </main>
      )}

      {view === 'shop' && (
        <main className="py-24 px-6 lg:px-12 max-w-[1800px] mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-baseline gap-12 border-b border-gray-100 pb-12 mb-20">
            <h1 className="text-7xl font-light uppercase tracking-tighter">Inventory</h1>
            <div className="flex flex-wrap gap-8">
               {categories.map(cat => (
                 <button
                   key={cat}
                   onClick={() => setSelectedCategory(cat)}
                   className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all relative pb-2 ${selectedCategory === cat ? 'text-black' : 'text-gray-300 hover:text-black'}`}
                 >
                   {cat}
                   {selectedCategory === cat && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
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
        </main>
      )}

      {/* Footer */}
      <footer 
        className="py-32 px-6 lg:px-12 border-t border-gray-100 transition-colors duration-500"
        style={{ 
          backgroundColor: customizations.footerBgColor || '#ffffff',
          color: customizations.footerTextColor || '#000000'
        }}
      >
         <div className="max-w-[1800px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-24 mb-32">
               <div className="col-span-1 md:col-span-2">
                  <span className="text-4xl font-light tracking-[0.6em] uppercase mb-8 block">{seller.storeName || 'MODA'}</span>
                  <p 
                    className="font-medium italic text-lg max-w-sm opacity-50"
                    style={{ color: customizations.footerTextColor || '#000000' }}
                  >
                    {seller.description || "Redefining the essence of contemporary couture through radical simplicity."}
                  </p>
               </div>
               <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-10">House</h4>
                  <ul 
                    className="space-y-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-40"
                    style={{ color: customizations.footerTextColor || '#000000' }}
                  >
                    <li><button onClick={() => setView('home')} className="hover:opacity-100 transition-opacity">Atelier</button></li>
                    <li><button onClick={() => setView('shop')} className="hover:opacity-100 transition-opacity">Collections</button></li>
                    <li><button className="hover:opacity-100 transition-opacity">Manifesto</button></li>
                  </ul>
               </div>
               <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-10">Client</h4>
                  <ul 
                    className="space-y-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-40"
                    style={{ color: customizations.footerTextColor || '#000000' }}
                  >
                    <li><button className="hover:opacity-100 transition-opacity">Bespoke</button></li>
                    <li><button className="hover:opacity-100 transition-opacity">Shipping</button></li>
                    <li><button className="hover:opacity-100 transition-opacity">Terms</button></li>
                  </ul>
               </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-gray-100 gap-10 opacity-30">
               <p className="text-[9px] font-black uppercase tracking-[0.4em]">© 2026 {seller.storeName}. All Rights Reserved.</p>
               <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.4em]">
                 Powered by <span className="font-black">Iyonicorp</span>
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default CoutureStore;
