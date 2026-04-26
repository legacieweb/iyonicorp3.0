import React, { useState, useEffect, useMemo } from 'react';
import { Product, Seller, Order, OrderItem, ordersAPI, reviewsAPI, discountsAPI, Review } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import {
  ShoppingCart, Star, ArrowRight, Heart, Search, Menu, Instagram, Twitter, Facebook,
  ShieldCheck, Truck, RefreshCw, X, Plus, Minus, Trash2, Check, Palette,
  LogIn, UserPlus, Mail, Phone, MapPin, Sparkles, Loader2, MessageCircle, Youtube, Linkedin, Globe,
  Upload, Image as ImageIcon, Edit3, Gift, Package, CreditCard, Zap, Award, Clock, Gem
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
    <div className="group cursor-pointer bg-[#0a0a0a] border border-white/5 overflow-hidden transition-all duration-700 hover:border-white/20" onClick={() => onViewDetail(product)}>
      <div className="relative aspect-square overflow-hidden bg-[#111]">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-80 group-hover:opacity-100"
        />
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleWishlist(product); }}
            className={`p-3 rounded-full backdrop-blur-xl border border-white/10 transition-all ${isWishlisted ? 'bg-[#d4af37] text-white' : 'bg-black/20 text-white hover:bg-white/10'}`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
            className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#d4af37] hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0"
          >
            Inquire / Add
          </button>
        </div>
      </div>
      <div className="p-8 text-center">
        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#d4af37] mb-3 block">{product.category}</span>
        <h4 className="text-lg font-light text-white mb-3 tracking-wide group-hover:text-[#d4af37] transition-colors">{product.name}</h4>
        <p className="text-xl font-medium text-white/90">{formatPrice(product.price, currency)}</p>
      </div>
    </div>
  );
};

const JewelryStore: React.FC<ThemeProps> = ({
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
  
  const themePrimary = seller.theme?.primaryColor || '#d4af37'; // Gold
  const themeSecondary = seller.theme?.secondaryColor || '#050505'; // Midnight
  const customizations = seller.theme?.customizations || {};

  const initialFeatures = [
    { 
      icon: customizations.feature_0_icon ?? 'award', 
      title: customizations.feature_0_title ?? 'Ethically Sourced', 
      description: customizations.feature_0_desc ?? 'Certified conflict-free stones' 
    },
    { 
      icon: customizations.feature_1_icon ?? 'shield', 
      title: customizations.feature_1_title ?? 'Lifetime Warranty', 
      description: customizations.feature_1_desc ?? 'Protection for your investment' 
    },
    { 
      icon: customizations.feature_2_icon ?? 'truck', 
      title: customizations.feature_2_title ?? 'Secure Shipping', 
      description: customizations.feature_2_desc ?? 'Fully insured worldwide delivery' 
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
    <div className="min-h-screen font-serif" style={{ backgroundColor: customizations.mainBgColor || '#050505', color: customizations.mainTextColor || '#ffffff' }}>
      {/* Modern Live Editor */}
      {editMode && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-gray-200 px-6 py-3 shadow-lg overflow-x-auto scrollbar-hide">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 whitespace-nowrap text-gray-900">
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2 bg-[#d4af37] rounded-xl shadow-[#d4af37]/20 shadow-lg">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-tighter block">Aurelius Editor</span>
                <span className="text-[9px] text-[#d4af37] uppercase font-black tracking-widest">Luxury Pro</span>
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
                    value={seller.theme?.primaryColor || '#d4af37'}
                    onChange={(e) => onUpdateData?.('theme.primaryColor', e.target.value)}
                    className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <label className="text-[7px] text-gray-400 uppercase font-black">BG</label>
                  <input
                    type="color"
                    value={customizations.mainBgColor || '#050505'}
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
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideHero ? 'bg-[#d4af37]' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideHero ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Story</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('story', 'hideStory', !customizations.hideStory)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideStory ? 'bg-[#d4af37]' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideStory ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Feat</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('features', 'hideFeatures', !customizations.hideFeatures)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideFeatures ? 'bg-[#d4af37]' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideFeatures ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2">
                  <label className="text-[7px] uppercase font-black text-gray-400">Consult</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('consult', 'hideConsult', !customizations.hideConsult)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideConsult ? 'bg-[#d4af37]' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideConsult ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              {/* Advanced Colors */}
              <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100 shrink-0">
                <div className="flex items-center gap-2 border-r border-gray-200 pr-3 mr-1">
                  <Palette className="w-3 h-3 text-[#d4af37]" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Footer</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[7px] text-gray-400 uppercase font-black">BG</label>
                    <input
                      type="color"
                      value={customizations.footerBgColor || '#050505'}
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
      <nav className="sticky top-0 z-50 bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-28">
            <div className="flex items-center gap-16">
              <div 
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => setView('home')}
              >
                <Gem className="w-6 h-6 text-[#d4af37] mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-2xl font-light tracking-[0.3em] text-white uppercase leading-none">
                  {seller.storeName || 'AURELIUS'}
                </span>
                <span className="text-[7px] font-black tracking-[0.6em] text-[#d4af37] uppercase mt-2">Fine Jewelry</span>
              </div>
            </div>
            
            <div className="hidden lg:flex items-center gap-10">
              {['Collections', 'Engagement', 'Timepieces', 'Bespoke'].map(link => (
                <button key={link} className="text-[10px] font-black text-white/60 hover:text-[#d4af37] uppercase tracking-[0.3em] transition-colors">{link}</button>
              ))}
            </div>

            <div className="flex items-center gap-8">
              <button className="text-white/60 hover:text-[#d4af37] transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setView('cart')}
                className="relative text-white/60 hover:text-[#d4af37] transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#d4af37] text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </span>
                )}
              </button>
              {!user ? (
                <button 
                  onClick={() => navigate('/login')}
                  className="px-8 py-3 border border-white/20 text-white text-[9px] font-black uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all"
                >
                  Account
                </button>
              ) : (
                <div className="w-10 h-10 rounded-full border border-[#d4af37] flex items-center justify-center text-[#d4af37] text-xs font-black">
                  {user.name?.[0] || 'A'}
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
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 z-0">
                <img 
                  src={customizations.heroImage || "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=2070&auto=format&fit=crop"} 
                  className="w-full h-full object-cover opacity-50 scale-105 animate-slow-zoom"
                  alt="Jewelry Hero"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90"></div>
              </div>
              
              <div className="relative z-10 text-center px-4 max-w-4xl">
                <div 
                  className="w-px h-24 mx-auto mb-10 opacity-50"
                  style={{ backgroundColor: themePrimary }}
                ></div>
                <span 
                  className="text-[10px] font-black uppercase tracking-[0.6em] mb-8 block animate-fade-in"
                  style={{ color: themePrimary }}
                >
                  {editMode ? (
                    <input
                      type="text"
                      value={customizations.heroSubtitle || "Exquisite Craftsmanship"}
                      onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroSubtitle', e.target.value)}
                      className="bg-transparent border-none focus:ring-0 p-0 text-center uppercase tracking-[0.6em]"
                      style={{ color: themePrimary }}
                    />
                  ) : (
                    customizations.heroSubtitle || "Exquisite Craftsmanship"
                  )}
                </span>
                <h1 className="text-6xl md:text-8xl font-light text-white leading-tight tracking-wide mb-10 italic">
                  {editMode ? (
                    <textarea
                      value={customizations.heroTitle1 || "Timeless Brilliance."}
                      onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroTitle1', e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-center font-light tracking-wide italic"
                      rows={2}
                    />
                  ) : (
                    customizations.heroTitle1 || "Timeless Brilliance."
                  )}
                </h1>
                <p className="text-lg md:text-xl text-white/60 mb-12 font-light tracking-widest max-w-2xl mx-auto italic">
                  {editMode ? (
                    <textarea
                      value={seller.description || ""}
                      onChange={(e) => onUpdateData?.('description', e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-center text-lg md:text-xl italic"
                      rows={3}
                    />
                  ) : (
                    seller.description || "Discover a world of unparalleled luxury, where every piece tells a story of elegance and eternal beauty."
                  )}
                </p>
                <button 
                  onClick={() => setView('shop')}
                  className="px-14 py-6 text-white text-[10px] font-black uppercase tracking-[0.4em] transition-all"
                  style={{ backgroundColor: themePrimary, boxShadow: `0 0 50px ${themePrimary}33` }}
                >
                  {customizations.heroCtaText || "Explore Collection"}
                </button>
              </div>
            </section>
          )}

          {/* Featured Collections */}
          <section className="py-32 bg-[#050505]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-24">
                <h2 className="text-4xl font-light text-white tracking-widest uppercase mb-4 italic">
                  {editMode ? (
                    <input
                      value={customizations.productGridTitle ?? 'The Masterpieces'}
                      onChange={(e) => onUpdateThemeCustomization?.('productGrid', 'productGridTitle', e.target.value)}
                      className="bg-transparent border-none p-0 w-full focus:ring-0 text-center text-4xl font-light tracking-widest uppercase italic text-white"
                    />
                  ) : (
                    customizations.productGridTitle ?? 'The Masterpieces'
                  )}
                </h2>
                <div 
                  className="w-20 h-px mx-auto opacity-40"
                  style={{ backgroundColor: themePrimary }}
                ></div>
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
            </div>
          </section>

          {/* Brand Story */}
          {!customizations.hideStory && (
            <section className="py-40 bg-[#0a0a0a] relative overflow-hidden">
               <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-24">
                  <div className="lg:w-1/2 relative group">
                     <div className="aspect-[4/5] overflow-hidden border border-white/5">
                        <img 
                          src={customizations.storyImage || "https://images.unsplash.com/photo-1573408302355-a9d35b79bb6d?q=80&w=1924&auto=format&fit=crop"} 
                          className="w-full h-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-110" 
                          alt="Craftsmanship" 
                        />
                     </div>
                     {editMode && (
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && onImageUpload?.(e.target.files[0], 'story')}
                          />
                          <div className="flex flex-col items-center gap-2 text-white">
                            <ImageIcon className="w-8 h-8" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Change Image</span>
                          </div>
                        </label>
                      )}
                     <div className="absolute -bottom-10 -right-10 w-64 h-80 border border-white/10 bg-[#050505] p-8 hidden md:block">
                        <h3 
                          className="text-3xl font-light italic mb-4"
                          style={{ color: themePrimary }}
                        >
                          {editMode ? (
                            <input
                              value={customizations.storyFeatureTitle || "Quality"}
                              onChange={(e) => onUpdateThemeCustomization?.('story', 'storyFeatureTitle', e.target.value)}
                              className="bg-transparent border-none p-0 w-full focus:ring-0 text-3xl font-light italic"
                              style={{ color: themePrimary }}
                            />
                          ) : (
                            customizations.storyFeatureTitle || "Quality"
                          )}
                        </h3>
                        <p className="text-white/40 text-xs leading-relaxed font-light tracking-widest uppercase">
                          {editMode ? (
                            <textarea
                              value={customizations.storyFeatureText || "Only the finest ethically sourced diamonds and 18k gold make it to our studio."}
                              onChange={(e) => onUpdateThemeCustomization?.('story', 'storyFeatureText', e.target.value)}
                              className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-white/40 text-xs font-light tracking-widest uppercase"
                              rows={4}
                            />
                          ) : (
                            customizations.storyFeatureText || "Only the finest ethically sourced diamonds and 18k gold make it to our studio."
                          )}
                        </p>
                     </div>
                  </div>
                  <div className="lg:w-1/2 space-y-10">
                     <span 
                      className="text-[10px] font-black uppercase tracking-[0.5em]"
                      style={{ color: themePrimary }}
                     >
                       Our Legacy
                     </span>
                     <h2 className="text-5xl md:text-7xl font-light text-white leading-tight italic">
                        {editMode ? (
                          <textarea
                            value={customizations.storyTitle || "Defined by Perfection."}
                            onChange={(e) => onUpdateThemeCustomization?.('story', 'storyTitle', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-5xl md:text-7xl font-light italic text-white"
                            rows={2}
                          />
                        ) : (
                          customizations.storyTitle || "Defined by Perfection."
                        )}
                     </h2>
                     <p className="text-white/60 font-light text-xl leading-relaxed tracking-wide italic">
                        {editMode ? (
                          <textarea
                            value={customizations.storyText || "For generations, we have pushed the boundaries of jewelry design, creating pieces that aren't just accessories, but symbols of life's most precious moments."}
                            onChange={(e) => onUpdateThemeCustomization?.('story', 'storyText', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-white/60 font-light text-xl italic"
                            rows={4}
                          />
                        ) : (
                          customizations.storyText || "For generations, we have pushed the boundaries of jewelry design, creating pieces that aren't just accessories, but symbols of life's most precious moments."
                        )}
                     </p>
                     <button 
                      className="text-[10px] font-black uppercase tracking-[0.4em] text-white border-b pb-2 hover:opacity-70 transition-all"
                      style={{ borderBottomColor: themePrimary }}
                     >
                        Read Our Story
                     </button>
                  </div>
               </div>
            </section>
          )}

          {/* Full Width CTA */}
          {!customizations.hideConsult && (
            <section className="h-[70vh] relative flex items-center justify-center overflow-hidden">
               <img 
                src={customizations.consultBgImage || "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?q=80&w=2042&auto=format&fit=crop"} 
                className="absolute inset-0 w-full h-full object-cover opacity-40" 
                alt="CTA" 
               />
               <div className="absolute inset-0 bg-black/40"></div>
               <div className="relative z-10 text-center max-w-2xl px-6">
                  <h2 className="text-4xl md:text-6xl font-light text-white italic mb-10 tracking-widest uppercase">
                    {editMode ? (
                      <input
                        value={customizations.consultTitle || "Bespoke Creations"}
                        onChange={(e) => onUpdateThemeCustomization?.('consult', 'consultTitle', e.target.value)}
                        className="bg-transparent border-none p-0 w-full focus:ring-0 text-center text-4xl md:text-6xl font-light italic tracking-widest uppercase text-white"
                      />
                    ) : (
                      customizations.consultTitle || "Bespoke Creations"
                    )}
                  </h2>
                  <p className="text-white/70 font-light mb-12 tracking-widest text-lg">
                    {editMode ? (
                      <textarea
                        value={customizations.consultSubtitle || "Work with our master artisans to create a one-of-a-kind piece that reflects your unique vision."}
                        onChange={(e) => onUpdateThemeCustomization?.('consult', 'consultSubtitle', e.target.value)}
                        className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-center text-white/70 font-light tracking-widest text-lg"
                        rows={2}
                      />
                    ) : (
                      customizations.consultSubtitle || "Work with our master artisans to create a one-of-a-kind piece that reflects your unique vision."
                    )}
                  </p>
                  <button className="px-14 py-6 border border-white text-white text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all">
                    {customizations.consultCta || "Book Consultation"}
                  </button>
               </div>
            </section>
          )}
        </main>
      )}

      {view === 'shop' && (
        <main className="py-32 bg-[#050505]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center mb-24">
              <h1 className="text-5xl font-light text-white tracking-[0.2em] uppercase italic mb-12">The Inventory</h1>
              <div className="flex flex-wrap justify-center gap-8">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all pb-2 border-b-2 ${selectedCategory === cat ? 'text-[#d4af37] border-[#d4af37]' : 'text-white/40 border-transparent hover:text-white'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
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
        className="pt-40 pb-20 border-t border-white/5 relative overflow-hidden transition-colors duration-500"
        style={{ 
          backgroundColor: customizations.footerBgColor || '#050505',
          color: customizations.footerTextColor || '#ffffff'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-24 mb-40 text-center md:text-left">
            <div className="col-span-1 md:col-span-2 space-y-12">
              <div className="flex flex-col items-center md:items-start">
                <Gem 
                  className="w-8 h-8 mb-4" 
                  style={{ color: themePrimary }}
                />
                <span className="text-4xl font-light tracking-[0.4em] uppercase italic">{seller.storeName || 'AURELIUS'}</span>
              </div>
              <p 
                className="font-light text-xl leading-relaxed tracking-widest max-w-md italic opacity-60"
                style={{ color: customizations.footerTextColor || '#ffffff' }}
              >
                {seller.description || "Defining modern luxury through exceptional craftsmanship and timeless design."}
              </p>
              <div className="flex justify-center md:justify-start gap-10">
                <Instagram className="w-5 h-5 opacity-40 hover:opacity-100 transition-opacity cursor-pointer" />
                <Facebook className="w-5 h-5 opacity-40 hover:opacity-100 transition-opacity cursor-pointer" />
                <Twitter className="w-5 h-5 opacity-40 hover:opacity-100 transition-opacity cursor-pointer" />
              </div>
            </div>
            <div className="space-y-10">
              <h4 
                className="text-[10px] font-black uppercase tracking-[0.4em]"
                style={{ color: themePrimary }}
              >
                Discovery
              </h4>
              <ul 
                className="space-y-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-40"
                style={{ color: customizations.footerTextColor || '#ffffff' }}
              >
                <li><button onClick={() => setView('home')} className="hover:opacity-100 transition-opacity">Home</button></li>
                <li><button onClick={() => setView('shop')} className="hover:opacity-100 transition-opacity">Inventory</button></li>
                <li><button className="hover:opacity-100 transition-opacity">Collections</button></li>
                <li><button className="hover:opacity-100 transition-opacity">Our Ethos</button></li>
              </ul>
            </div>
            <div className="space-y-10">
              <h4 
                className="text-[10px] font-black uppercase tracking-[0.4em]"
                style={{ color: themePrimary }}
              >
                Assistance
              </h4>
              <ul 
                className="space-y-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-40"
                style={{ color: customizations.footerTextColor || '#ffffff' }}
              >
                <li><button className="hover:opacity-100 transition-opacity">Care Guide</button></li>
                <li><button className="hover:opacity-100 transition-opacity">Shipping</button></li>
                <li><button className="hover:opacity-100 transition-opacity">Returns</button></li>
                <li><button className="hover:opacity-100 transition-opacity">Contact</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10 opacity-50">
            <p className="text-[9px] font-black uppercase tracking-[0.3em]">© 2026 {seller.storeName}. All rights reserved.</p>
            <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.3em]">
              Powered by <span className="tracking-[0.4em]">Iyonicorp</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default JewelryStore;
