import React, { useState, useEffect, useMemo } from 'react';
import { Product, Seller, Order, OrderItem, ordersAPI, sellersAPI, Review, reviewsAPI, messagesAPI, discountsAPI, DeliveryLocation } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import {
  ShoppingCart, Star, ArrowRight, Heart, Search, Menu, Instagram, Twitter, Facebook,
  ShieldCheck, Truck, RefreshCw, X, Plus, Minus, Trash2, Check, Edit2, Palette,
  LogIn, UserPlus, Mail, Phone, MapPin, Sparkles, Loader2, Send, Youtube, Linkedin, Globe, MessageCircle, Music2, LayoutDashboard, Tag,
  Upload, Image as ImageIcon, Edit3, Gift, Package, CreditCard, Zap, Award, Clock
} from 'lucide-react';

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
import { useAuth } from '../../../context/AuthContext';
import { useAutoFillAddress } from '../../../hooks/useAutoFillAddress';
import { useNavigate, useLocation } from 'react-router-dom';

declare const PaystackPop: any;

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

type View = 'home' | 'shop' | 'product-detail' | 'cart' | 'checkout' | 'order-success' | 'auth-choice' | 'policy-page' | 'contact' | 'pricing';

const ProductCard = ({
  product,
  onViewDetail,
  onAddToCart,
  onQuickBuy,
  onToggleWishlist,
  isWishlisted,
  onWriteReview,
  currency = 'USD',
  themePrimary,
  themeSecondary
}: {
  product: Product;
  onViewDetail: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onQuickBuy: (p: Product) => void;
  onToggleWishlist: (p: Product) => void;
  isWishlisted: boolean;
  onWriteReview: (p: Product) => void;
  currency?: string;
  themePrimary?: string;
  themeSecondary?: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group cursor-pointer"
      onClick={() => onViewDetail(product)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[3/4] overflow-hidden mb-6" style={{ backgroundColor: themeSecondary }}>
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
        <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            className="p-3 bg-white/90 text-gray-900 transition-colors rounded-full shadow-sm"
            style={{ color: isHovered ? themePrimary : undefined }}
            onClick={(e) => { e.stopPropagation(); onWriteReview(product); }}
            title="Write a Review"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              className="flex-1 py-3 bg-white text-gray-900 text-[10px] font-medium uppercase tracking-widest transition-colors hover:bg-gray-900 hover:text-white"
              onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
            >
              Add to Bag
            </button>
            <button
              className="p-3 bg-white/90 text-gray-900 hover:text-red-500 transition-colors"
              onClick={(e) => { e.stopPropagation(); onToggleWishlist(product); }}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          </div>
          <button
            className="w-full py-3 text-white text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:brightness-110 shadow-lg"
            style={{ backgroundColor: themePrimary }}
            onClick={(e) => { e.stopPropagation(); onQuickBuy(product); }}
          >
            Quick Buy
          </button>
        </div>
        {product.images.length > 1 && (
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-1">
            {product.images.slice(0, 3).map((_, i) => (
              <div key={i} className="w-2 h-2 bg-white/60 rounded-full" />
            ))}
          </div>
        )}
      </div>
      <div className="px-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500">{product.category}</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={`w-3 h-3 ${s <= 4 ? 'fill-gray-400 text-gray-400' : 'text-gray-300'}`} />
            ))}
          </div>
        </div>
        <h4
          className="text-base font-medium text-gray-900 mb-1 transition-colors duration-300 line-clamp-2"
          style={{ color: isHovered ? themePrimary : undefined }}
        >
          {product.name}
        </h4>
        <p className="text-lg font-light text-gray-900">{formatPrice(product.price, currency)}</p>
      </div>
    </div>
  );
};

const LuxuryBoutique: React.FC<ThemeProps> = ({
  seller: initialSeller,
  products,
  editMode = false,
  sellerData,
  onUpdateData,
  onUpdateThemeCustomization,
  onUpdateFeatureItem,
  onUpdateThemeColor,
  onImageUpload
}) => {
  console.log('LuxuryBoutique seller debug:', initialSeller);
  const seller = editMode && sellerData ? sellerData : initialSeller;
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const themePrimary = seller.theme?.primaryColor || '#c5a059';
  const themeSecondary = seller.theme?.secondaryColor || '#faf8f5';
  const customizations = seller.theme?.customizations || {};
  
  const initialFeatures = [
    { 
      icon: customizations.feature_0_icon ?? 'truck', 
      title: customizations.feature_0_title ?? 'Complimentary Shipping', 
      description: customizations.feature_0_desc ?? 'Worldwide delivery' 
    },
    { 
      icon: customizations.feature_1_icon ?? 'shield', 
      title: customizations.feature_1_title ?? 'Authenticity Guaranteed', 
      description: customizations.feature_1_desc ?? '100% certified' 
    },
    { 
      icon: customizations.feature_2_icon ?? 'refresh', 
      title: customizations.feature_2_title ?? '30-Day Returns', 
      description: customizations.feature_2_desc ?? 'Hassle-free' 
    },
    { 
      icon: customizations.feature_3_icon ?? 'sparkles', 
      title: customizations.feature_3_title ?? 'Private Shopping', 
      description: customizations.feature_3_desc ?? 'By appointment' 
    }
  ];

  const [view, setView] = useState<View>('home');

  const mainBgColor = customizations.mainBgColor || '#0a0a0a';
  const cardBgColor = customizations.cardBgColor || '#151515';
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [reviewProduct, setReviewProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>(() => {
    try {
      const saved = localStorage.getItem(`cart_${seller.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(`cart_${seller.id}`, JSON.stringify(cart));
  }, [cart, seller.id]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    let isCheckout = searchParams.get('checkout') === 'true';

    if (!isCheckout && window.location.hash.includes('?')) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      isCheckout = hashParams.get('checkout') === 'true';
    }

    if (isCheckout) {
      setView('checkout');
    }
  }, []);

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(`wishlist_${seller.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(`wishlist_${seller.id}`, JSON.stringify(wishlist));
  }, [wishlist, seller.id]);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [policyPageData, setPolicyPageData] = useState<{ title: string; content: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });

  const cartTotal = useMemo(() => cart.reduce((total, item) => total + (Number(item.product.price) * item.quantity), 0), [cart]);

  const [appliedDiscount, setAppliedDiscount] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(`discount_${seller.id}`);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    if (appliedDiscount) {
      localStorage.setItem(`discount_${seller.id}`, JSON.stringify(appliedDiscount));
    } else {
      localStorage.removeItem(`discount_${seller.id}`);
    }
  }, [appliedDiscount, seller.id]);

  const discountAmount = useMemo(() => {
    if (!appliedDiscount) return 0;
    if (appliedDiscount.type === 'percentage') {
      return cartTotal * (appliedDiscount.value / 100);
    }
    if (appliedDiscount.type === 'fixed_amount') {
      return Math.min(appliedDiscount.value, cartTotal);
    }
    return 0;
  }, [appliedDiscount, cartTotal]);

  function calculateDiscount(subtotal: number) {
    if (!appliedDiscount) return 0;
    if (appliedDiscount.type === 'percentage') {
      return subtotal * (appliedDiscount.value / 100);
    }
    if (appliedDiscount.type === 'fixed_amount') {
      return Math.min(appliedDiscount.value, subtotal);
    }
    return 0;
  }
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
    customerName: '',
    customerEmail: ''
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [reviewVerificationStatus, setReviewVerificationStatus] = useState<'idle' | 'searching' | 'found' | 'not-found'>('idle');

  useEffect(() => {
    const timer = setTimeout(async () => {
      const targetProduct = reviewProduct || selectedProduct;
      if (reviewForm.customerEmail && targetProduct && isReviewModalOpen) {
        setIsVerifyingEmail(true);
        setReviewVerificationStatus('searching');
        try {
          const res = await reviewsAPI.verifyPurchase(targetProduct.id, reviewForm.customerEmail);
          if (res.success) {
            setReviewVerificationStatus('found');
          }
        } catch (error) {
          setReviewVerificationStatus('not-found');
        } finally {
          setIsVerifyingEmail(false);
        }
      } else {
        setReviewVerificationStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [reviewForm.customerEmail, reviewProduct, selectedProduct, isReviewModalOpen]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    let productId = searchParams.get('product');

    if (!productId && window.location.hash.includes('?')) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      productId = hashParams.get('product');
    }

    if (productId && products.length > 0) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProduct(product);
        setView('product-detail');
      }
    }
  }, [products]);

  useEffect(() => {
    if (selectedProduct) {
      reviewsAPI.getByProductId(selectedProduct.id)
        .then(setReviews)
        .catch(() => setReviews([]));
    }
   }, [selectedProduct?.id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProduct = reviewProduct || selectedProduct;
    if (!targetProduct) return;

    setReviewSubmitting(true);
    setReviewError(null);
    try {
      await reviewsAPI.create({
        productId: targetProduct.id,
        customerName: reviewForm.customerName,
        customerEmail: reviewForm.customerEmail,
        rating: reviewForm.rating,
        comment: reviewForm.comment
      });

      // Refresh reviews if looking at the same product detail
      if (selectedProduct?.id === targetProduct.id) {
        const updatedReviews = await reviewsAPI.getByProductId(targetProduct.id);
        setReviews(updatedReviews);
      }

      setIsReviewModalOpen(false);
      setReviewProduct(null);
      setReviewForm({ rating: 5, comment: '', customerName: '', customerEmail: '' });
      alert('Review published successfully!');
    } catch (error: any) {
      console.error('Failed to submit review:', error);
      setReviewError(error.response?.data?.message || 'Failed to submit review. Make sure you purchased this product with the provided email.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleWriteReview = (product: Product) => {
    setReviewProduct(product);
    setIsReviewModalOpen(true);
  };

  const handleViewDetail = (product: Product) => {
    setSelectedProduct(product);
    setView('product-detail');
    window.scrollTo(0, 0);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleQuickBuy = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (!existing) {
      setCart([{ product, quantity: 1 }]);
    } else {
      setCart([{ product, quantity: 1 }]);
    }

    if (user) {
      setView('checkout');
    } else {
      setView('auth-choice');
    }
    window.scrollTo(0, 0);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const toggleWishlist = (product: Product) => {
    setWishlist(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    try {
      const discount = await discountsAPI.validateCoupon(seller.id, couponCode.trim());
      setAppliedDiscount(discount);
    } catch (error: any) {
      setCouponError(error.response?.data?.message || 'Invalid coupon code');
      setAppliedDiscount(null);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedDiscount(null);
    setCouponCode('');
    setCouponError(null);
  };

  const getSellerPaymentMethod = () => {
    if (seller.paymentGateways?.iyonicpay?.enabled) return 'iyonicpay';
    if (seller.paymentGateways?.custom?.enabled) return 'custom';
    return 'paystack';
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (enabledDeliveryLocations.length > 0 && !checkoutData.deliveryLocationId) {
      alert('Please select a delivery location');
      return;
    }

    const activePaymentMethod = getSellerPaymentMethod();
    try {
      const orderItems: OrderItem[] = cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      }));

      const orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
        sellerId: seller.id,
        customerId: user?.id || '',
        customerName: checkoutData.name,
        customerEmail: checkoutData.email,
        customerPhone: checkoutData.phone,
        items: orderItems,
        total: finalTotal,
        subtotal: cartTotal,
        originalTotal: cartTotal,
        discount: appliedDiscount ? {
          code: appliedDiscount.code || couponCode,
          name: appliedDiscount.name,
          type: appliedDiscount.type,
          value: appliedDiscount.value,
          amount: discountAmount
        } : undefined,
        currency: seller.currency || 'USD',
        status: 'pending',
        paymentMethod: activePaymentMethod,
        shippingAddress: {
          street: checkoutData.address || 'N/A',
          city: selectedDeliveryLocation?.name || 'N/A',
          state: selectedDeliveryLocation?.name || 'N/A',
          country: 'N/A',
          zipCode: 'N/A'
        },
        deliveryFee: deliveryFee,
        deliveryLocation: selectedDeliveryLocation?.name
      } as any;

      const response = await ordersAPI.create(orderData);

      if (response.paymentMethod === 'iyonicpay' && response.paymentLink) {
        const autoPayLink = response.paymentLink.includes('?') 
          ? `${response.paymentLink}&autoPay=true` 
          : `${response.paymentLink}?autoPay=true`;
        navigate(autoPayLink);
        return;
      }

      if (response.paymentMethod === 'custom' && response.paymentLink) {
        window.location.href = response.paymentLink;
        return;
      }

      if (response.paymentLink && response.reference) {
        if ((response as any).isCustomPaystack) {
          window.location.href = response.paymentLink;
          return;
        }

        const handler = (window as any).PaystackPop.setup({
          key: (response as any).publicKey || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
          email: checkoutData.email,
          amount: Math.round(finalTotal * 100),
          currency: seller.currency || 'USD',
          reference: response.reference,
          metadata: {
            order_id: response.id,
            type: 'order_payment'
          },
          onClose: () => {
            alert('Payment cancelled. Your order has been cancelled.');
          },
          callback: async (paystackResponse: any) => {
            try {
              const res = await ordersAPI.verifyPayment(paystackResponse.reference, response.id);
              if (res.success) {
                setCart([]);
                setAppliedDiscount(null);
                localStorage.removeItem(`cart_${seller.id}`);
                localStorage.removeItem(`discount_${seller.id}`);
                setCouponCode('');
                setView('order-success');
              } else {
                alert('Payment verification failed. Please contact support.');
              }
            } catch (error) {
              console.error('Verification error:', error);
              alert('An error occurred during payment verification.');
            }
          }
        });
        handler.openIframe();
      } else {
        alert('No payment method configured. Please contact the seller.');
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Failed to place order. Please try again.');
    }
  };

  const renderHome = () => {
    if (customizations.hideHero && !editMode) return null;

    return (
      <>
        <section
          className={`relative h-screen flex items-center overflow-hidden ${customizations.hideHero ? 'opacity-50 grayscale' : ''}`}
          style={{ backgroundColor: themeSecondary }}
        >
          {editMode && (
            <div className="absolute top-52 left-8 z-[60] flex gap-2">
              {onImageUpload && (
                <label className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg cursor-pointer flex items-center gap-2 text-xs font-bold uppercase hover:bg-blue-700 transition-colors">
                  <Upload className="w-4 h-4" />
                  Change Hero Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onImageUpload(e.target.files[0], 'hero')}
                  />
                </label>
              )}
              <button
                onClick={() => onUpdateThemeCustomization?.('hero', 'hideHero', !customizations.hideHero)}
                className={`${customizations.hideHero ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-xs font-bold uppercase transition-colors`}
              >
                <Trash2 className="w-4 h-4" />
                {customizations.hideHero ? 'Show Section' : 'Hide Section'}
              </button>
            </div>
          )}
          <div className="absolute inset-0 z-0">
            <img
              src={customizations.heroImage || (seller.theme as any).heroImage || "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2070&auto=format&fit=crop"}
              alt="Hero Background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10 w-full pt-52 pb-32">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-4 h-4" style={{ color: themePrimary }} />
                {editMode && onUpdateThemeCustomization ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={customizations.heroSubtitle || (seller.theme as any).heroSubtitle || "New Season"}
                       onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroSubtitle', e.target.value)}
                      className="text-xs font-medium uppercase tracking-[0.3em] bg-white px-2 py-1 border-2 border-blue-500 rounded focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-gray-500 uppercase font-bold">Text Color:</label>
                      <input
                        type="color"
                        value={customizations.heroSubtitleColor || "#d4af37"}
                         onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroSubtitleColor', e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-none"
                      />
                    </div>
                  </div>
                ) : (
                  <span
                    className="text-xs font-medium uppercase tracking-[0.3em]"
                    style={{ color: customizations.heroSubtitleColor || themePrimary }}
                  >
                    {(seller.theme as any).heroSubtitle || "New Season"}
                  </span>
                )}
              </div>
              <h2
                className="text-5xl lg:text-7xl font-light mb-8 tracking-tight leading-[1.1]"
                style={{ color: customizations.heroTitle1Color || "#ffffff" }}
              >
                {editMode && onUpdateThemeCustomization ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={customizations.heroTitle1 || (seller.theme as any).heroTitle1 || "Redefine"}
                        onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroTitle1', e.target.value)}
                        className="w-full text-5xl lg:text-7xl font-light bg-white/10 backdrop-blur px-2 py-1 border-2 border-blue-500 rounded focus:outline-none text-white placeholder-white/50"
                      />
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-gray-300 uppercase font-bold">Color:</label>
                        <input
                          type="color"
                          value={customizations.heroTitle1Color || "#ffffff"}
                           onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroTitle1Color', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={customizations.heroTitle2 || (seller.theme as any).heroTitle2 || "Elegance"}
                        onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroTitle2', e.target.value)}
                        className="w-full text-5xl lg:text-7xl italic bg-white/10 backdrop-blur px-2 py-1 border-2 border-blue-500 rounded focus:outline-none text-white placeholder-white/50"
                        style={{ color: customizations.heroTitle2Color || themePrimary }}
                      />
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-gray-300 uppercase font-bold">Color:</label>
                        <input
                          type="color"
                          value={customizations.heroTitle2Color || themePrimary}
                           onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroTitle2Color', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <span style={{ color: customizations.heroTitle1Color || "#ffffff" }}>
                      {(seller.theme as any).heroTitle1 || "Redefine"}{' '}
                    </span>
                    <span
                      className="italic"
                      style={{ color: customizations.heroTitle2Color || themePrimary }}
                    >
                      {(seller.theme as any).heroTitle2 || "Elegance"}
                    </span>
                  </>
                )}
              </h2>
              <p className="text-lg text-gray-300 mb-10 max-w-md leading-relaxed">
                {editMode && onUpdateData ? (
                  <textarea
                    value={seller.description || ''}
                    onChange={(e) => onUpdateData?.('description', e.target.value)}
                    rows={2}
                    className="w-full text-lg text-gray-300 bg-white/10 backdrop-blur border-2 border-blue-500 rounded focus:outline-none resize-none px-2 py-1"
                  />
                ) : (
                  seller.description || 'Discover our curated selection of extraordinary pieces crafted for the discerning individual.'
                )}
              </p>
            </div>
          </div>
        </section>

        {(!customizations.hideFeatures || editMode) && (
          <section 
            className={`border-t border-white/10 py-16 relative ${customizations.hideFeatures ? 'opacity-50 grayscale' : ''}`}
            style={{ backgroundColor: customizations.featuresBgColor || '#0a0a0a' }}
          >
            {editMode && (
              <div className="absolute top-4 right-4 z-20 flex gap-2">
                <div className="flex flex-col items-center gap-1 bg-black/50 p-2 rounded backdrop-blur-md">
                  <label className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">BG Color</label>
                  <input
                    type="color"
                    value={customizations.featuresBgColor || '#0a0a0a'}
                    onChange={(e) => onUpdateThemeCustomization?.('features', 'featuresBgColor', e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                  />
                </div>
                <button
                  onClick={() => onUpdateThemeCustomization?.('features', 'hideFeatures', !customizations.hideFeatures)}
                  className={`${customizations.hideFeatures ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-xs font-bold uppercase transition-colors`}
                >
                  <Trash2 className="w-4 h-4" />
                  {customizations.hideFeatures ? 'Show Section' : 'Hide Section'}
                </button>
              </div>
            )}
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
              {initialFeatures.map((item, i) => {
                const IconComponent = ICON_MAP[item.icon as keyof typeof ICON_MAP] || Truck;
                return (
                  <div key={i} className="flex flex-col items-center text-center space-y-4 group p-6 rounded-2xl transition-all hover:bg-white/5 border border-transparent hover:border-white/10">
                    <div className="relative">
                      <div className="w-16 h-16 border border-white/10 rounded-full flex items-center justify-center group-hover:border-blue-500 transition-colors duration-500 shadow-xl" style={{ color: themePrimary, backgroundColor: cardBgColor }}>
                        <IconComponent className="w-7 h-7" strokeWidth={1.2} />
                      </div>
                      {editMode && (
                        <div className="absolute -top-2 -right-2 z-30">
                          <select
                            value={item.icon}
                            onChange={(e) => onUpdateThemeCustomization?.('features', `feature_${i}_icon`, e.target.value)}
                            className="bg-blue-600 text-white text-[9px] font-bold uppercase rounded-lg pl-2 pr-6 py-1 outline-none shadow-lg border-2 border-white/20 cursor-pointer hover:bg-blue-700 transition-colors relative z-50"
                          >
                            {Object.keys(ICON_MAP).map(iconName => (
                              <option key={iconName} value={iconName} className="bg-gray-900">{iconName}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3 w-full">
                      {editMode ? (
                        <div className="flex flex-col gap-3">
                          <div className="relative group/input">
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => onUpdateThemeCustomization?.('features', `feature_${i}_title`, e.target.value)}
                              className="bg-white/5 text-white text-xs font-bold uppercase tracking-[0.2em] border border-white/10 rounded-lg px-3 py-2 text-center focus:outline-none focus:border-blue-500 w-full transition-all"
                              placeholder="Feature Title"
                            />
                            <div className="absolute inset-0 rounded-lg border border-blue-500/0 group-hover/input:border-blue-500/30 pointer-events-none"></div>
                          </div>
                          <div className="relative group/input">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => onUpdateThemeCustomization?.('features', `feature_${i}_desc`, e.target.value)}
                              className="bg-white/5 text-gray-400 text-[10px] uppercase tracking-widest border border-white/10 rounded-lg px-3 py-2 text-center focus:outline-none focus:border-blue-400 w-full transition-all"
                              placeholder="Description"
                            />
                            <div className="absolute inset-0 rounded-lg border border-blue-400/0 group-hover/input:border-blue-400/30 pointer-events-none"></div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h4 className="text-white text-xs font-bold uppercase tracking-[0.2em] group-hover:text-blue-400 transition-colors">{item.title}</h4>
                          <p className="text-gray-500 text-[10px] uppercase tracking-widest leading-relaxed">{item.description}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {(!customizations.hideArrivals || editMode) && products.length > 0 && (
          <section className={`py-24 ${customizations.hideArrivals ? 'opacity-50 grayscale' : ''}`}
          style={{ backgroundColor: mainBgColor }}
        >
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex items-end justify-between mb-16">
                <div>
                  <h2 className="text-4xl font-light text-white mb-2 italic">New Arrivals</h2>
                  <p className="text-[#c5a059] text-[10px] uppercase tracking-[0.4em]">The Latest Pieces</p>
                </div>
                <button 
                  onClick={() => setView('shop')}
                  className="group flex items-center gap-3 text-white text-[10px] uppercase tracking-[0.3em] hover:text-[#c5a059] transition-colors"
                >
                  View Collection
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-2" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {products.slice(0, 4).map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onViewDetail={handleViewDetail}
                    onAddToCart={addToCart}
                    onQuickBuy={handleQuickBuy}
                    onToggleWishlist={toggleWishlist}
                    isWishlisted={!!wishlist.find(p => p.id === product.id)}
                    onWriteReview={handleWriteReview}
                    currency={seller.currency}
                    themePrimary={themePrimary}
                    themeSecondary={themeSecondary}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </>
    );
  };

  const renderShop = () => {
    const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
    const filteredProducts = selectedCategory === 'All'
      ? products
      : products.filter(p => p.category === selectedCategory);

    return (
      <section className="py-24 min-h-screen" style={{ backgroundColor: mainBgColor }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-16">
            <div>
              <h2 className="text-4xl font-light text-white mb-2 italic">The Collection</h2>
              <p className="text-gray-500 text-sm uppercase tracking-widest">All Pieces</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-6 py-2 text-xs uppercase tracking-widest transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#c5a059] text-black'
                      : 'border border-white/20 text-gray-400 hover:border-[#c5a059] hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetail={handleViewDetail}
                onAddToCart={addToCart}
                onQuickBuy={handleQuickBuy}
                onToggleWishlist={toggleWishlist}
                isWishlisted={!!wishlist.find(p => p.id === product.id)}
                onWriteReview={handleWriteReview}
                currency={seller.currency}
                themePrimary={themePrimary}
                themeSecondary={themeSecondary}
              />
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderProductDetail = () => {
    if (!selectedProduct) return null;

    return (
      <section className="py-24 min-h-screen" style={{ backgroundColor: mainBgColor }}>
        <div className="max-w-7xl mx-auto px-6">
          <button
            onClick={() => setView('shop')}
            className="flex items-center space-x-2 text-sm text-gray-400 uppercase tracking-widest mb-12 hover:text-[#c5a059] transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>Back to Collection</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-4">
              <div className="aspect-[4/5] bg-[#151515] overflow-hidden border border-white/5">
                <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="w-full h-full object-cover" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                {selectedProduct.images.slice(1).map((img, i) => (
                  <div key={i} className="aspect-square bg-[#151515] overflow-hidden border border-white/5">
                    <img src={img} alt="" className="w-full h-full object-cover opacity-60" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs text-[#c5a059] uppercase tracking-[0.4em]">{selectedProduct.category}</span>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 text-[#c5a059] fill-current" />)}
                </div>
              </div>

              <h2 className="text-4xl font-light text-white mb-8 italic">{selectedProduct.name}</h2>
              <p className="text-3xl font-light text-[#c5a059] mb-10">{formatPrice(selectedProduct.price, seller.currency)}</p>

              <p className="text-gray-400 leading-relaxed mb-12">
                {selectedProduct.description}
              </p>

              <div className="flex space-x-4 mb-12">
                <button
                  onClick={() => addToCart(selectedProduct)}
                  className="flex-1 py-5 bg-[#c5a059] text-black font-bold text-sm uppercase tracking-widest hover:bg-white transition-colors"
                >
                  Add to Bag
                </button>
                <button
                  onClick={() => toggleWishlist(selectedProduct)}
                  className={`p-5 border transition-all ${wishlist.find(p => p.id === selectedProduct.id) ? 'bg-[#c5a059]/20 border-[#c5a059] text-[#c5a059]' : 'border-white/20 text-white hover:border-[#c5a059] hover:text-[#c5a059]'}`}
                >
                  <Heart className={`w-5 h-5 ${wishlist.find(p => p.id === selectedProduct.id) ? 'fill-current' : ''}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/10">
                <div className="flex items-center space-x-3 text-gray-400">
                  <Truck className="w-5 h-5 text-[#c5a059]" />
                  <span className="text-xs uppercase tracking-widest">Complimentary Ship</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-400">
                  <ShieldCheck className="w-5 h-5 text-[#c5a059]" />
                  <span className="text-xs uppercase tracking-widest">Authenticity</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderCart = () => (
    <section style={{ backgroundColor: mainBgColor }}>
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-light text-white mb-16 italic">Your Bag</h2>

        {cart.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="w-20 h-20 text-gray-700 mx-auto mb-6" />
            <h3 className="text-2xl font-light text-white mb-4 italic">Your bag is empty</h3>
            <button onClick={() => setView('shop')} className="text-[#c5a059] uppercase tracking-widest hover:text-white transition-colors">
              Explore Collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2 space-y-6">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-8 p-6 bg-[#151515] border border-white/5">
                  <div className="w-28 h-28 bg-[#0a0a0a] flex-shrink-0">
                    <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg text-white font-light mb-2">{item.product.name}</h4>
                    <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">{item.product.category}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-white/20 px-3 py-2 gap-3">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="text-gray-400 hover:text-white"><Minus size={14} /></button>
                        <span className="text-white font-light text-sm w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="text-gray-400 hover:text-white"><Plus size={14} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-gray-500 hover:text-red-500 text-xs uppercase tracking-widest">Remove</button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl text-white font-light">{formatPrice(item.product.price * item.quantity, seller.currency)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: cardBgColor }}>
              <h3 className="text-xl font-light text-white mb-8 italic border-b border-white/5 pb-4">Order Summary</h3>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-gray-400 text-[10px] uppercase tracking-[0.2em]">
                  <span>Subtotal</span>
                  <span className="text-white">{formatPrice(cartTotal, seller.currency)}</span>
                </div>

                {appliedDiscount && (
                  <div className="flex justify-between text-green-500 text-[10px] uppercase tracking-[0.2em] bg-green-500/5 p-2 rounded border border-green-500/10">
                    <div className="flex items-center gap-2">
                      <Tag size={12} />
                      <span>{appliedDiscount.code}</span>
                    </div>
                    <span>-{formatPrice(discountAmount, seller.currency)}</span>
                  </div>
                )}

                {deliveryFee > 0 && (
                  <div className="flex justify-between text-gray-400 text-[10px] uppercase tracking-[0.2em]">
                    <span>Delivery Fee</span>
                    <span className="text-white">{formatPrice(deliveryFee, seller.currency)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-400 text-[10px] uppercase tracking-[0.2em]">
                  <span>Shipping</span>
                  <span className="text-[#c5a059] font-bold">Complimentary</span>
                </div>
                
                <div className="h-px bg-white/10 my-6"></div>
                
                <div className="flex justify-between items-end text-white">
                  <span className="text-xs uppercase tracking-[0.3em] font-light mb-1">Total Amount</span>
                  <span className="text-3xl font-light italic text-[#c5a059]">{formatPrice(finalTotal, seller.currency)}</span>
                </div>
              </div>

              {!appliedDiscount ? (
                <div className="mb-8 p-6 border border-white/10 bg-white/[0.02] backdrop-blur-sm rounded-lg group">
                  <div className="flex items-center gap-2 mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-[#c5a059]">
                    <Sparkles size={14} className="animate-pulse" />
                    <span>Exclusive Offers</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="ENTER PROMO CODE"
                      className="flex-1 bg-transparent border-b border-white/20 px-0 py-3 text-white text-[10px] uppercase tracking-[0.2em] focus:border-[#c5a059] outline-none transition-all placeholder:text-gray-600"
                    />
                    <button
                      onClick={applyCoupon}
                      disabled={isApplyingCoupon || !couponCode.trim()}
                      className="px-8 py-3 bg-[#c5a059] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white disabled:opacity-50 transition-all duration-500 shadow-lg"
                    >
                      {isApplyingCoupon ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Apply'}
                    </button>
                  </div>
                  {couponError && <p className="text-red-500 text-[9px] mt-3 uppercase tracking-widest font-medium">{couponError}</p>}
                </div>
              ) : (
                <div className="mb-8 p-6 border border-green-500/20 bg-green-500/5 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Check size={14} className="text-green-500" />
                    </div>
                    <div>
                      <p className="text-green-500 text-[10px] font-bold uppercase tracking-widest">Reward Applied</p>
                      <p className="text-white text-[9px] uppercase tracking-widest opacity-60">Savings Secured</p>
                    </div>
                  </div>
                  <button onClick={removeCoupon} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all">
                    <X size={16} />
                  </button>
                </div>
              )}

              <button
                onClick={() => setView(user ? 'checkout' : 'auth-choice')}
                className="w-full py-5 bg-[#c5a059] text-black font-bold text-sm uppercase tracking-widest hover:bg-white transition-colors shadow-lg"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  const renderCheckout = () => {
    return (
      <section className="py-24 min-h-screen" style={{ backgroundColor: mainBgColor }}>
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-light text-white mb-16 italic">Checkout</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <form onSubmit={handlePlaceOrder} className="space-y-8">
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-[#c5a059] uppercase tracking-[0.4em] mb-8 border-b border-white/10 pb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Full Name</label>
                    <input
                      required
                      type="text"
                      value={checkoutData.name}
                      onChange={(e) => setCheckoutData({ ...checkoutData, name: e.target.value })}
                      className="w-full bg-[#151515] border border-white/10 px-6 py-4 text-white focus:border-[#c5a059] transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Email</label>
                    <input
                      required
                      type="email"
                      value={checkoutData.email}
                      onChange={(e) => setCheckoutData({ ...checkoutData, email: e.target.value })}
                      className="w-full bg-[#151515] border border-white/10 px-6 py-4 text-white focus:border-[#c5a059] transition-all outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Phone Number</label>
                  <input
                    required
                    type="tel"
                    value={checkoutData.phone}
                    onChange={(e) => setCheckoutData({ ...checkoutData, phone: e.target.value })}
                    className="w-full bg-[#151515] border border-white/10 px-6 py-4 text-white focus:border-[#c5a059] transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-6 pt-8">
                <h3 className="text-xs font-bold text-[#c5a059] uppercase tracking-[0.4em] mb-8 border-b border-white/10 pb-4">Delivery & Location</h3>
                
                <div className="space-y-6">
                  {enabledDeliveryLocations.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Delivery Area</label>
                      <select
                        required
                        value={checkoutData.deliveryLocationId}
                        onChange={(e) => setCheckoutData({ ...checkoutData, deliveryLocationId: e.target.value })}
                        className="w-full bg-[#151515] border border-white/10 px-6 py-4 text-white focus:border-[#c5a059] transition-all outline-none appearance-none cursor-pointer"
                      >
                        <option value="">Select your delivery area</option>
                        {enabledDeliveryLocations.map((loc: DeliveryLocation) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} {loc.fee ? `(+${formatPrice(loc.fee, seller.currency)})` : '(Complimentary Delivery)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Specific Address / Building / Landmark</label>
                    <textarea
                      required
                      rows={4}
                      value={checkoutData.address}
                      onChange={(e) => setCheckoutData({ ...checkoutData, address: e.target.value })}
                      placeholder="Please provide your exact building name, apartment number, and nearby landmarks for the courier..."
                      className="w-full bg-[#151515] border border-white/10 px-6 py-4 text-white focus:border-[#c5a059] transition-all outline-none resize-none font-light leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-6 bg-[#c5a059] text-black font-bold text-sm uppercase tracking-widest hover:bg-white transition-all shadow-xl mt-12"
              >
                Place Order • {formatPrice(finalTotal, seller.currency)}
              </button>
            </form>

            <div style={{ backgroundColor: cardBgColor }}>
              <h3 className="text-xs font-bold text-[#c5a059] uppercase tracking-[0.4em] mb-12 border-b border-white/10 pb-4">Order Summary</h3>
              <div className="space-y-6">
                {cart.map(item => (
                  <div key={item.product.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-[#0a0a0a] border border-white/5 p-1">
                        <img src={item.product.images[0]} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-white font-light text-sm uppercase tracking-wider">{item.product.name}</p>
                        <p className="text-gray-500 text-[10px] uppercase tracking-widest">Quantity: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="text-white font-light">{formatPrice(item.product.price * item.quantity, seller.currency)}</p>
                  </div>
                ))}
                
                <div className="h-px bg-white/10 my-8"></div>
                
                <div className="space-y-4">
                  <div className="flex justify-between text-xs text-gray-500 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span>{formatPrice(cartTotal, seller.currency)}</span>
                  </div>

                  {appliedDiscount && (
                    <div className="flex justify-between text-xs text-green-500 uppercase tracking-widest font-bold">
                      <span>Discount ({appliedDiscount.code})</span>
                      <span>-{formatPrice(discountAmount, seller.currency)}</span>
                    </div>
                  )}

                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-xs text-gray-500 uppercase tracking-widest">
                      <span>Delivery Fee</span>
                      <span>{formatPrice(deliveryFee, seller.currency)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-gray-500 uppercase tracking-widest">
                    <span>Shipping</span>
                    <span className="text-[#c5a059]">Complimentary</span>
                  </div>
                </div>

                <div className="h-px bg-white/10 my-8"></div>
                
                <div className="flex justify-between text-white text-3xl font-light italic">
                  <span>Total</span>
                  <span className="text-[#c5a059]">{formatPrice(finalTotal, seller.currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderSuccess = () => (
    <section style={{ backgroundColor: mainBgColor }}>
      <div>
        <div className="w-24 h-24 bg-[#c5a059]/10 text-[#c5a059] rounded-full flex items-center justify-center mx-auto mb-8">
          <Check size={48} strokeWidth={3} />
        </div>
        <h2 className="text-5xl font-light text-white mb-6 italic">Order Confirmed</h2>
        <p className="text-gray-400 mb-12 max-w-md mx-auto">
          Thank you for your purchase. A confirmation has been sent to your email.
        </p>
        <button
          onClick={() => setView('home')}
          className="px-12 py-5 bg-[#c5a059] text-black font-bold text-sm uppercase tracking-widest hover:bg-white transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    </section>
  );

  const renderContact = () => (
    <section style={{ backgroundColor: mainBgColor }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div>
            <h2 className="text-4xl font-light text-white mb-8 italic">Inquiries & Concierge</h2>
            <p className="text-gray-400 text-lg mb-12 font-light leading-relaxed">
              Our dedicated team is available to assist you with any questions regarding our collections or your personal requirements.
            </p>

            <div className="space-y-10">
              {(seller.contactInfo?.email || seller.ownerEmail) && (
                <div className="flex items-start gap-6">
                  <div style={{ backgroundColor: cardBgColor, color: themePrimary }}>
                    <Mail size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">Email Support</h4>
                    <p className="text-white font-light">{seller.contactInfo?.email || seller.ownerEmail}</p>
                  </div>
                </div>
              )}
              {seller.contactInfo?.phone && (
                <div className="flex items-start gap-6">
                  <div style={{ backgroundColor: cardBgColor, color: themePrimary }}>
                    <Phone size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">Phone Line</h4>
                    <p className="text-white font-light">{seller.contactInfo.phone}</p>
                  </div>
                </div>
              )}
              {seller.contactInfo?.address && (
                <div className="flex items-start gap-6">
                  <div style={{ backgroundColor: cardBgColor, color: themePrimary }}>
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">Headquarters</h4>
                    <p className="text-white font-light">{seller.contactInfo.address}</p>
                  </div>
                </div>
              )}
              {seller.contactInfo?.whatsapp && (
                <div className="flex items-start gap-6">
                  <div style={{ backgroundColor: cardBgColor, color: themePrimary }}>
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">WhatsApp</h4>
                    <p className="text-white font-light">{seller.contactInfo.whatsapp}</p>
                  </div>
                </div>
              )}
            </div>

            {seller.socialLinks && Object.values(seller.socialLinks).some(link => typeof link === 'string' && link.trim() !== '') && (
              <div className="mt-16">
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-[0.2em] mb-6">Digital Networks</h4>
                <div className="flex gap-4">
                  {seller.socialLinks?.instagram && typeof seller.socialLinks.instagram === 'string' && seller.socialLinks.instagram.trim() !== '' && (
                    <a href={seller.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                      className="w-12 h-12 border border-white/10 flex items-center justify-center rounded-full text-gray-400 transition-all hover:border-[#c5a059] hover:text-[#c5a059]"
                    >
                      <Instagram size={18} />
                    </a>
                  )}
                  {seller.socialLinks?.facebook && typeof seller.socialLinks.facebook === 'string' && seller.socialLinks.facebook.trim() !== '' && (
                    <a href={seller.socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                      className="w-12 h-12 border border-white/10 flex items-center justify-center rounded-full text-gray-400 transition-all hover:border-[#c5a059] hover:text-[#c5a059]"
                    >
                      <Facebook size={18} />
                    </a>
                  )}
                  {seller.socialLinks?.twitter && typeof seller.socialLinks.twitter === 'string' && seller.socialLinks.twitter.trim() !== '' && (
                    <a href={seller.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                      className="w-12 h-12 border border-white/10 flex items-center justify-center rounded-full text-gray-400 transition-all hover:border-[#c5a059] hover:text-[#c5a059]"
                    >
                      <Twitter size={18} />
                    </a>
                  )}
                  {seller.socialLinks?.linkedin && typeof seller.socialLinks.linkedin === 'string' && seller.socialLinks.linkedin.trim() !== '' && (
                    <a href={seller.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                      className="w-12 h-12 border border-white/10 flex items-center justify-center rounded-full text-gray-400 transition-all hover:border-[#c5a059] hover:text-[#c5a059]"
                    >
                      <Linkedin size={18} />
                    </a>
                  )}
                  {seller.socialLinks?.youtube && typeof seller.socialLinks.youtube === 'string' && seller.socialLinks.youtube.trim() !== '' && (
                    <a href={seller.socialLinks.youtube} target="_blank" rel="noopener noreferrer"
                      className="w-12 h-12 border border-white/10 flex items-center justify-center rounded-full text-gray-400 transition-all hover:border-[#c5a059] hover:text-[#c5a059]"
                    >
                      <Youtube size={18} />
                    </a>
                  )}
                  {seller.socialLinks?.tiktok && typeof seller.socialLinks.tiktok === 'string' && seller.socialLinks.tiktok.trim() !== '' && (
                    <a href={seller.socialLinks.tiktok} target="_blank" rel="noopener noreferrer"
                      className="w-12 h-12 border border-white/10 flex items-center justify-center rounded-full text-gray-400 transition-all hover:border-[#c5a059] hover:text-[#c5a059]"
                    >
                      <Music2 size={18} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#151515] p-10 md:p-16 border border-white/5">
            <form onSubmit={handleContactSubmit} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full bg-transparent border-b border-white/20 p-5 text-white focus:border-[#c5a059] transition-all outline-none"
                  placeholder="NAME"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full bg-transparent border-b border-white/20 p-5 text-white focus:border-[#c5a059] transition-all outline-none"
                  placeholder="EMAIL"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Your Inquiry</label>
                <textarea
                  required
                  rows={5}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full bg-transparent border-b border-white/20 p-5 text-white focus:border-[#c5a059] transition-all outline-none resize-none"
                  placeholder="HOW CAN WE ASSIST YOU?"
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-6 text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                style={{ backgroundColor: themePrimary }}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send size={16} />
                    Submit Inquiry
                  </>
                )}
              </button>
              {submitStatus === 'success' && (
                <div className="p-4 bg-green-500/10 text-green-500 text-sm font-medium text-center rounded-xl border border-green-500/20">
                  Thank you. Your message has been received.
                </div>
              )}
              {submitStatus === 'error' && (
                <div className="p-4 bg-red-500/10 text-red-500 text-sm font-medium text-center rounded-xl border border-red-500/20">
                  Submission error. Please try again.
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );

  const renderPricing = () => {
    const pricingConfig = seller.pricingConfig;
    if (!pricingConfig || !pricingConfig.plans) {
      return (
        <section style={{ backgroundColor: mainBgColor }}>
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-4xl font-light text-white mb-8 italic">Pricing</h2>
            <p className="text-gray-400 text-lg">No pricing plans available at this time.</p>
          </div>
        </section>
      );
    }

    const tiers = [
      { id: 'starter', name: 'Starter', ...pricingConfig.plans.starter },
      { id: 'professional', name: 'Professional', ...pricingConfig.plans.professional },
      { id: 'enterprise', name: 'Enterprise', ...pricingConfig.plans.enterprise }
    ];
    const currentPlan = seller.subscription?.plan || 'starter';

    return (
      <section className="py-24 min-h-screen" style={{ backgroundColor: mainBgColor }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-light text-white mb-4 italic">Choose Your Plan</h2>
            <p className="text-gray-400 text-lg font-light">Select the perfect plan for your business needs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative p-10 rounded-3xl border-2 transition-all ${
                  currentPlan === tier.id
                    ? ''
                    : 'border-white/10 hover:border-white/30'
                }`}
                style={{
                  borderColor: currentPlan === tier.id ? themePrimary : undefined,
                  backgroundColor: currentPlan === tier.id ? `${themePrimary}0D` : undefined
                }}
              >
                {currentPlan === tier.id && (
                  <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 text-black px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
                    style={{ backgroundColor: themePrimary }}
                  >
                    Current Plan
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className="text-xl font-medium text-white uppercase tracking-widest mb-2">{tier.name}</h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-5xl font-light text-white">${tier.price}</span>
                    <span className="text-gray-500 ml-2">/month</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-10">
                  {tier.features?.map((feature: string, i: number) => (
                    <li key={i} className="flex items-center text-sm text-gray-400">
                      <Check className="w-4 h-4 mr-3 flex-shrink-0" style={{ color: themePrimary }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="text-center text-xs text-gray-600 uppercase tracking-widest">
                  {tier.productLimit === Infinity ? 'Unlimited' : tier.productLimit} products
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderPolicyPage = () => (
    <section className="py-40 bg-[#0a0a0a] min-h-screen pt-48 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl font-light text-white mb-12 italic border-b border-white/10 pb-6">{policyPageData?.title}</h2>
        <div className="text-gray-400 leading-relaxed whitespace-pre-wrap font-light">
          {policyPageData?.content}
        </div>
        <div className="mt-12 pt-8 border-t border-white/10">
          <button
            onClick={() => setView('home')}
            className="text-xs uppercase tracking-widest text-[#c5a059] hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to Home
          </button>
        </div>
      </div>
    </section>
  );

  const renderAuthChoice = () => {
    const redirectUrl = `${location.pathname}?checkout=true`;
    return (
      <section className="py-24 bg-[#0a0a0a] min-h-screen pt-40 text-center px-6">
        <div className="max-w-xl mx-auto">
          <h2 className="text-4xl font-light text-white mb-6 italic">Join the Collection</h2>
          <p className="text-gray-400 mb-12 font-light tracking-wide">To provide you with a tailored experience, please sign in or create an account to proceed with your selection.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <button 
              onClick={() => navigate(`/login?shop=${seller.id}&subdomain=${seller.subdomain}&redirect=${encodeURIComponent(redirectUrl)}`)}
              className="flex flex-col items-center justify-center p-12 bg-[#151515] border border-white/5 hover:border-[#c5a059]/50 transition-all duration-500 group rounded-lg"
            >
              <LogIn className="w-10 h-10 text-gray-500 mb-6 group-hover:text-[#c5a059] transition-colors" />
              <span className="text-white text-xs uppercase tracking-[0.2em] font-medium">Log In</span>
            </button>

            <button 
              onClick={() => navigate(`/register?role=customer&shop=${seller.id}&subdomain=${seller.subdomain}&redirect=${encodeURIComponent(redirectUrl)}`)}
              className="flex flex-col items-center justify-center p-12 bg-[#151515] border border-white/5 hover:border-[#c5a059]/50 transition-all duration-500 group rounded-lg"
            >
              <UserPlus className="w-10 h-10 text-gray-500 mb-6 group-hover:text-[#c5a059] transition-colors" />
              <span className="text-white text-xs uppercase tracking-[0.2em] font-medium">Sign Up</span>
            </button>
          </div>
          
          <button 
            onClick={() => setView('cart')}
            className="text-gray-500 text-xs uppercase tracking-widest hover:text-[#c5a059] transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to Bag
          </button>
        </div>
      </section>
    );
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    try {
      await messagesAPI.sendPublic(seller.subdomain, {
        name: contactForm.name,
        email: contactForm.email,
        message: contactForm.message
      });
      setSubmitStatus('success');
      setContactForm({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('Failed to send message:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOwner = user?.id === seller.userId;
  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return products;
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    if (reference) {
      ordersAPI.verifyPayment(reference)
        .then((res) => {
          if (res.success) {
            setCart([]);
            setView('order-success');
            window.history.replaceState({}, '', window.location.pathname);
          }
        })
        .catch(console.error);
    }
  }, []);

  const [checkoutData, setCheckoutData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    deliveryLocationId: ''
   });

  const enabledDeliveryLocations = useMemo(() => {
    return (seller.deliveryLocations || []).filter((loc: DeliveryLocation) => loc.enabled);
  }, [seller.deliveryLocations]);

  const selectedDeliveryLocation = useMemo(() => {
    return enabledDeliveryLocations.find((loc: DeliveryLocation) => loc.id === checkoutData.deliveryLocationId);
  }, [enabledDeliveryLocations, checkoutData.deliveryLocationId]);

  const deliveryFee = selectedDeliveryLocation?.fee || 0;

  const finalTotal = useMemo(() => cartTotal - discountAmount + deliveryFee, [cartTotal, discountAmount, deliveryFee]);

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: mainBgColor }}>
      {editMode && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-[#0a0a0a] text-white px-6 py-4 flex flex-col lg:flex-row items-center justify-between shadow-2xl border-b border-white/10 gap-6">
          <div className="flex items-center gap-4 shrink-0">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Palette className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest block">Store Designer</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Luxury Theme</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-8 justify-center">
            {/* Brand Colors */}
            <div className="flex items-center gap-6 bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-bold">Primary</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={seller.theme?.primaryColor || '#c5a059'}
                    onChange={(e) => onUpdateData?.('theme.primaryColor', e.target.value)}
                    className="w-7 h-7 bg-transparent border-0 cursor-pointer rounded-lg overflow-hidden"
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-bold">Secondary</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={seller.theme?.secondaryColor || '#faf8f5'}
                    onChange={(e) => onUpdateData?.('theme.secondaryColor', e.target.value)}
                    className="w-7 h-7 bg-transparent border-0 cursor-pointer rounded-lg overflow-hidden"
                  />
                </div>
              </div>

              <div className="w-px h-8 bg-white/10"></div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-bold">Background</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={mainBgColor}
                    onChange={(e) => onUpdateThemeCustomization?.('global', 'mainBgColor', e.target.value)}
                    className="w-7 h-7 bg-transparent border-0 cursor-pointer rounded-lg overflow-hidden"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-bold">Card BG</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={cardBgColor}
                    onChange={(e) => onUpdateThemeCustomization?.('global', 'cardBgColor', e.target.value)}
                    className="w-7 h-7 bg-transparent border-0 cursor-pointer rounded-lg overflow-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Header Group */}
            <div className="flex items-center gap-4 bg-white/5 p-2 rounded-xl border border-white/10 shrink-0">
              <div className="flex items-center gap-2 border-r border-white/10 pr-3 mr-1">
                <Palette className="w-3 h-3 text-blue-400" />
                <span className="text-[9px] font-bold text-white uppercase tracking-wider">Header</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <label className="text-[7px] text-gray-400 uppercase font-bold">BG</label>
                  <input
                    type="color"
                    value={customizations.headerBgColor || '#0a0a0a'}
                    onChange={(e) => onUpdateThemeCustomization?.('header', 'headerBgColor', e.target.value)}
                    className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <label className="text-[7px] text-gray-400 uppercase font-bold">Text</label>
                  <input
                    type="color"
                    value={customizations.headerTextColor || '#ffffff'}
                    onChange={(e) => onUpdateThemeCustomization?.('header', 'headerTextColor', e.target.value)}
                    className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <label className="text-[7px] text-gray-400 uppercase font-bold">Active</label>
                  <input
                    type="color"
                    value={customizations.headerActiveTextColor || '#c5a059'}
                    onChange={(e) => onUpdateThemeCustomization?.('header', 'headerActiveTextColor', e.target.value)}
                    className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="flex flex-col items-center gap-1 border-l border-white/10 pl-2">
                  <label className="text-[7px] text-gray-400 uppercase font-bold">Btn</label>
                  <input
                    type="color"
                    value={customizations.headerButtonBgColor || '#ffffff'}
                    onChange={(e) => onUpdateThemeCustomization?.('header', 'headerButtonBgColor', e.target.value)}
                    className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <label className="text-[7px] text-gray-400 uppercase font-bold">Btn Txt</label>
                  <input
                    type="color"
                    value={customizations.headerButtonTextColor || '#000000'}
                    onChange={(e) => onUpdateThemeCustomization?.('header', 'headerButtonTextColor', e.target.value)}
                    className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="flex flex-col items-center gap-1 border-l border-white/10 pl-2">
                  <label className="text-[7px] text-gray-400 uppercase font-bold">Logout</label>
                  <input
                    type="color"
                    value={customizations.headerLogoutColor || '#ef4444'}
                    onChange={(e) => onUpdateThemeCustomization?.('header', 'headerLogoutColor', e.target.value)}
                    className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <label className="text-[7px] text-gray-400 uppercase font-bold">Radius</label>
                  <select
                    value={customizations.headerButtonRadius || '0px'}
                    onChange={(e) => onUpdateThemeCustomization?.('header', 'headerButtonRadius', e.target.value)}
                    className="bg-gray-800 text-white text-[8px] rounded px-1 py-0.5 outline-none border border-white/10"
                  >
                    <option value="0px">Sharp</option>
                    <option value="4px">Soft</option>
                    <option value="8px">Round</option>
                    <option value="9999px">Pill</option>
                  </select>
                </div>
                <div className="flex flex-col items-center gap-1 border-l border-white/10 pl-2">
                  <label className="text-[7px] text-gray-400 uppercase font-bold">Shape</label>
                  <select
                    value={customizations.headerShape || '0px'}
                    onChange={(e) => onUpdateThemeCustomization?.('header', 'headerShape', e.target.value)}
                    className="bg-gray-800 text-white text-[8px] rounded px-1 py-0.5 outline-none border border-white/10"
                  >
                    <option value="0px">Flat</option>
                    <option value="12px">Soft</option>
                    <option value="24px">Round</option>
                    <option value="40px">Curved</option>
                  </select>
                </div>
                <div className="flex flex-col items-center gap-1 border-l border-white/10 pl-2">
                  <label className="text-[7px] text-gray-400 uppercase font-bold">Icons</label>
                  <input
                    type="color"
                    value={customizations.headerIconColor || '#ffffff'}
                    onChange={(e) => onUpdateThemeCustomization?.('header', 'headerIconColor', e.target.value)}
                    className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <label className="text-[7px] text-gray-400 uppercase font-bold">Badge</label>
                  <input
                    type="color"
                    value={customizations.headerBadgeBgColor || '#c5a059'}
                    onChange={(e) => onUpdateThemeCustomization?.('header', 'headerBadgeBgColor', e.target.value)}
                    className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <label className="text-[7px] text-gray-400 uppercase font-bold">B-Txt</label>
                  <input
                    type="color"
                    value={customizations.headerBadgeTextColor || '#000000'}
                    onChange={(e) => onUpdateThemeCustomization?.('header', 'headerBadgeTextColor', e.target.value)}
                    className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="flex flex-col items-center gap-1 border-l border-white/10 pl-2">
                  <label className="text-[7px] text-gray-400 uppercase font-bold">Sticky</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('header', 'stickyHeader', customizations.stickyHeader === false ? true : false)}
                    className={`w-6 h-3 rounded-full transition-all relative ${customizations.stickyHeader !== false ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all ${customizations.stickyHeader !== false ? 'left-3.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Group */}
            <div className="flex items-center gap-4 bg-white/5 p-2 rounded-xl border border-white/10 shrink-0">
              <div className="flex items-center gap-2 border-r border-white/10 pr-3 mr-1">
                <LayoutDashboard className="w-3 h-3 text-green-400" />
                <span className="text-[9px] font-bold text-white uppercase tracking-wider">Footer</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <label className="text-[7px] text-gray-400 uppercase font-bold">BG</label>
                <input 
                  type="color" 
                  value={customizations.footerBgColor || '#0a0a0a'}
                   onChange={(e) => onUpdateThemeCustomization?.('footer', 'footerBgColor', e.target.value)}
                  className="w-4 h-4 bg-transparent border-0 cursor-pointer rounded-lg overflow-hidden"
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <label className="text-[7px] text-gray-400 uppercase font-bold">Text</label>
                <input 
                  type="color" 
                  value={customizations.footerTextColor || '#ffffff'}
                   onChange={(e) => onUpdateThemeCustomization?.('footer', 'footerTextColor', e.target.value)}
                  className="w-4 h-4 bg-transparent border-0 cursor-pointer rounded-lg overflow-hidden"
                />
              </div>
            </div>

            {/* Visibility Group */}
            <div className="flex items-center gap-4 bg-white/5 p-2 rounded-xl border border-white/10 shrink-0">
              <div className="flex flex-col items-center gap-1">
                <label className="text-[8px] uppercase tracking-widest text-gray-400 font-bold">Hero</label>
                <button
                  onClick={() => onUpdateThemeCustomization?.('hero', 'hideHero', !customizations.hideHero)}
                  className={`w-7 h-4 rounded-full transition-all relative ${!customizations.hideHero ? 'bg-blue-600' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${!customizations.hideHero ? 'left-3.5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex flex-col items-center gap-1">
                <label className="text-[8px] uppercase tracking-widest text-gray-400 font-bold">Features</label>
                <button
                  onClick={() => onUpdateThemeCustomization?.('features', 'hideFeatures', !customizations.hideFeatures)}
                  className={`w-7 h-4 rounded-full transition-all relative ${!customizations.hideFeatures ? 'bg-green-600' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${!customizations.hideFeatures ? 'left-3.5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex flex-col items-center gap-1">
                <label className="text-[8px] uppercase tracking-widest text-gray-400 font-bold">Arrivals</label>
                <button
                  onClick={() => onUpdateThemeCustomization?.('arrivals', 'hideArrivals', !customizations.hideArrivals)}
                  className={`w-7 h-4 rounded-full transition-all relative ${!customizations.hideArrivals ? 'bg-purple-600' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${!customizations.hideArrivals ? 'left-3.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-500">Live Editor</span>
            </div>
          </div>
        </div>
      )}

      <main className={editMode ? 'pt-44' : 'pt-20'}>
        {view === 'home' && renderHome()}
        {view === 'shop' && renderShop()}
        {view === 'product-detail' && renderProductDetail()}
        {view === 'cart' && renderCart()}
        {view === 'checkout' && renderCheckout()}
        {view === 'order-success' && renderSuccess()}
        {view === 'auth-choice' && renderAuthChoice()}
        {view === 'policy-page' && renderPolicyPage()}
        {view === 'contact' && renderContact()}
        {view === 'pricing' && renderPricing()}
      </main>

      {view !== 'checkout' && view !== 'order-success' && (
        <header 
          className={`${customizations.stickyHeader !== false || editMode ? 'fixed' : 'absolute'} ${editMode ? 'top-24' : 'top-0'} left-0 right-0 z-50 backdrop-blur-xl border-b transition-all duration-300`}
          style={{ 
            backgroundColor: customizations.headerBgColor || 'rgba(10, 10, 10, 0.9)',
            borderColor: customizations.headerBorderColor || 'rgba(255, 255, 255, 0.1)',
            borderRadius: customizations.headerShape || '0px',
            margin: customizations.headerShape && customizations.headerShape !== '0px' ? '12px 24px' : '0px',
            width: customizations.headerShape && customizations.headerShape !== '0px' ? 'calc(100% - 48px)' : '100%'
          }}
        >
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('home')}>
              {editMode && onImageUpload && (
                <label className="absolute -top-8 left-0 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 z-[60]">
                  <Upload className="w-3 h-3" />
                  Change Logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onImageUpload(e.target.files[0], 'logo')}
                  />
                </label>
              )}
              <div className="flex items-center gap-4">
                {seller.logo ? (
                  <div className="relative group/logo">
                    <img 
                      src={seller.logo} 
                      alt={seller.storeName} 
                      className="h-10 md:h-12 w-auto object-contain hover:scale-105 transition-all duration-500"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 group">
                    <div 
                      className="w-12 h-12 border-2 flex items-center justify-center transition-colors duration-500"
                      style={{ 
                        borderColor: customizations.headerActiveTextColor || '#c5a059',
                        color: customizations.headerActiveTextColor || '#c5a059'
                      }}
                    >
                      <span className="font-serif italic text-2xl transition-colors">{seller.storeName.charAt(0)}</span>
                    </div>
                    {editMode && onUpdateData ? (
                      <input
                        type="text"
                        value={seller.storeName}
                        onChange={(e) => onUpdateData('storeName', e.target.value)}
                        className="text-xl font-light uppercase tracking-[0.3em] bg-transparent border-b-2 border-blue-500 focus:outline-none"
                        style={{ color: customizations.headerTextColor || '#ffffff' }}
                      />
                    ) : (
                      <h1 className="text-xl font-light uppercase tracking-[0.3em]" style={{ color: customizations.headerTextColor || '#ffffff' }}>
                        {seller.storeName}
                      </h1>
                    )}
                  </div>
                )}
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-10">
              <button 
                onClick={() => setView('home')} 
                className="text-xs uppercase tracking-widest transition-colors"
                style={{ color: view === 'home' ? (customizations.headerActiveTextColor || '#c5a059') : (customizations.headerTextColor || '#9ca3af') }}
              >
                Home
              </button>
              <button 
                onClick={() => setView('shop')} 
                className="text-xs uppercase tracking-widest transition-colors"
                style={{ color: view === 'shop' ? (customizations.headerActiveTextColor || '#c5a059') : (customizations.headerTextColor || '#9ca3af') }}
              >
                Collection
              </button>
              <button 
                onClick={() => setView('contact')} 
                className="text-xs uppercase tracking-widest transition-colors"
                style={{ color: view === 'contact' ? (customizations.headerActiveTextColor || '#c5a059') : (customizations.headerTextColor || '#9ca3af') }}
              >
                Contact
              </button>
            </nav>

            <div className="flex items-center space-x-6">
              <div className="hidden md:flex items-center space-x-4 mr-2 border-r pr-6" style={{ borderColor: customizations.headerBorderColor || 'rgba(255, 255, 255, 0.1)' }}>
                {user ? (
                  <>
                    <button
                      onClick={() => navigate(user.role === 'customer' ? '/customer/dashboard' : '/seller/dashboard')}
                      className="text-xs uppercase tracking-widest font-bold transition-colors flex items-center gap-2"
                      style={{ color: customizations.headerTextColor || '#ffffff' }}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </button>
                    <button
                      onClick={logout}
                      className="text-xs uppercase tracking-widest font-bold transition-colors"
                      style={{ color: customizations.headerLogoutColor || '#ef4444' }}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => navigate(`/login?shop=${seller.id}`)}
                      className="text-xs uppercase tracking-widest font-bold hover:brightness-125 transition-colors"
                      style={{ color: customizations.headerTextColor || '#9ca3af' }}
                    >
                      Login
                    </button>
                    <button
                      onClick={() => navigate(`/register?role=customer&shop=${seller.id}`)}
                      className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-all"
                      style={{ 
                        backgroundColor: customizations.headerButtonBgColor || '#ffffff',
                        color: customizations.headerButtonTextColor || '#000000',
                        borderRadius: customizations.headerButtonRadius || '0px'
                      }}
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </div>
              <button className="relative" onClick={() => setWishlist([])}>
                <Heart 
                  className="w-5 h-5 transition-colors" 
                  style={{ 
                    color: wishlist.length > 0 ? (customizations.headerActiveTextColor || '#c5a059') : (customizations.headerIconColor || customizations.headerTextColor || '#9ca3af'), 
                    fill: wishlist.length > 0 ? 'currentColor' : 'none' 
                  }} 
                />
                {wishlist.length > 0 && (
                  <span 
                    className="absolute -top-2 -right-2 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
                    style={{ 
                      backgroundColor: customizations.headerBadgeBgColor || customizations.headerActiveTextColor || '#c5a059',
                      color: customizations.headerBadgeTextColor || '#000000'
                    }}
                  >
                    {wishlist.length}
                  </span>
                )}
              </button>
              <button className="relative" onClick={() => setView('cart')}>
                <ShoppingCart 
                  className="w-5 h-5 transition-colors" 
                  style={{ 
                    color: cart.length > 0 ? (customizations.headerActiveTextColor || '#c5a059') : (customizations.headerIconColor || customizations.headerTextColor || '#9ca3af') 
                  }} 
                />
                {cart.length > 0 && (
                  <span 
                    className="absolute -top-2 -right-2 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
                    style={{ 
                      backgroundColor: customizations.headerBadgeBgColor || customizations.headerActiveTextColor || '#c5a059',
                      color: customizations.headerBadgeTextColor || '#000000'
                    }}
                  >
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>
      )}

      {view !== 'checkout' && view !== 'order-success' && (
        <footer 
          className="border-t border-white/10 py-20 px-6 mt-20"
          style={{ 
            backgroundColor: customizations.footerBgColor || '#0a0a0a',
            color: customizations.footerTextColor || '#ffffff'
          }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-16 pb-16 border-b border-white/10">
              <div className="lg:col-span-2 space-y-8">
                <div className="flex items-center space-x-4">
                  {editMode && onImageUpload && (
                    <label className="absolute -top-8 left-0 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 z-10">
                      <Upload className="w-3 h-3" />
                      Change Logo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && onImageUpload(e.target.files[0], 'logo')}
                      />
                    </label>
                  )}
                  {seller.logo ? (
                    <div className="relative group/footer-logo">
                      <img 
                        src={seller.logo} 
                        alt={seller.storeName} 
                        className="h-12 object-contain hover:opacity-80 transition-all" 
                        onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                        style={{ opacity: 0 }}
                      />
                      <div className="absolute inset-0 bg-white/5 animate-pulse rounded h-12 w-28 -z-10 group-load-hidden" />
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 border border-[#c5a059] flex items-center justify-center">
                        <span className="text-[#c5a059] font-serif italic text-2xl">{seller.storeName.charAt(0)}</span>
                      </div>
                      {editMode && onUpdateData ? (
                        <div>
                          <input
                            type="text"
                            value={seller.storeName}
                            onChange={(e) => onUpdateData('storeName', e.target.value)}
                            className="text-3xl font-serif italic tracking-wide bg-transparent border-b-2 border-blue-500 focus:outline-none"
                            style={{ color: 'inherit' }}
                          />
                          <p className="text-[10px] font-medium text-[#c5a059] uppercase tracking-[0.4em] mt-1">Est. 2024</p>
                        </div>
                      ) : (
                        <div>
                          <h1 className="text-3xl font-serif italic tracking-wide" style={{ color: 'inherit' }}>{seller.storeName}</h1>
                          <p className="text-[10px] font-medium text-[#c5a059] uppercase tracking-[0.4em] mt-1">Est. 2024</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {editMode && onUpdateData ? (
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.3em] mb-2 block font-bold opacity-50">
                      Store Description
                    </label>
                    <textarea
                      value={seller.description || ''}
                      onChange={(e) => onUpdateData('description', e.target.value)}
                      rows={3}
                      className="w-full text-sm leading-relaxed bg-transparent border-2 border-blue-500 focus:outline-none resize-none font-serif italic"
                      style={{ color: 'inherit' }}
                    />
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed font-serif italic max-w-xs opacity-60" style={{ color: 'inherit' }}>
                    {seller.description || 'Luxury redefined for the modern connoisseur.'}
                  </p>
                )}

                {/* Delivery Locations */}
                <div className="flex flex-wrap gap-3">
                  {seller.deliveryLocations && seller.deliveryLocations.length > 0 && (
                    <div className="flex items-center gap-2 text-[#c5a059] text-[10px] uppercase tracking-widest bg-white/5 px-3 py-1.5 border border-white/10">
                      <MapPin size={12} />
                      <span>{seller.deliveryLocations.filter((l: DeliveryLocation) => l.enabled).map((l: DeliveryLocation) => l.name).join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex items-center gap-3 opacity-60">
                    <Mail className="w-4 h-4 text-[#c5a059]" />
                    <span className="text-sm font-serif italic">{seller.contactInfo?.email || `hello@${seller.subdomain}.com`}</span>
                  </div>
                  <div className="flex items-center gap-3 opacity-60">
                    <Phone className="w-4 h-4 text-[#c5a059]" />
                    <span className="text-sm font-serif italic">{seller.contactInfo?.phone || '+1 (800) 555-0000'}</span>
                  </div>
                  <div className="flex items-center gap-3 opacity-60">
                    <MapPin className="w-4 h-4 text-[#c5a059]" />
                    <span className="text-sm font-serif italic">{seller.contactInfo?.address || 'New York, NY'}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <h5 className="text-xs font-medium text-[#c5a059] uppercase tracking-widest mb-8">Explore</h5>
                <ul className="space-y-4 text-sm opacity-60">
                  <li><button onClick={() => setView('shop')} className="hover:text-[#c5a059] transition-colors font-serif italic">New Arrivals</button></li>
                  <li><button onClick={() => setView('home')} className="hover:text-[#c5a059] transition-colors font-serif italic">Home</button></li>
                  <li><button onClick={() => setView('contact')} className="hover:text-[#c5a059] transition-colors font-serif italic">Contact</button></li>
                  {seller.additionalPages && seller.additionalPages.map(({ title, content }) => (
                    <li key={title}>
                      <button
                        onClick={() => { setPolicyPageData({ title, content }); setView('policy-page'); window.scrollTo(0, 0); }}
                        className="hover:text-[#c5a059] transition-colors font-serif italic text-left"
                      >
                        {title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-2">
                <h5 className="text-xs font-medium text-[#c5a059] uppercase tracking-widest mb-8">Policies</h5>
                <ul className="space-y-4 text-sm opacity-60">
                  {seller.shippingPolicy && (
                    <li>
                      <button
                        onClick={() => { setPolicyPageData({ title: 'Shipping Policy', content: seller.shippingPolicy! }); setView('policy-page'); window.scrollTo(0, 0); }}
                        className="hover:text-[#c5a059] transition-colors font-serif italic text-left"
                      >
                        Shipping Policy
                      </button>
                    </li>
                  )}
                  {seller.privacyPolicy && (
                    <li>
                      <button
                        onClick={() => { setPolicyPageData({ title: 'Privacy Policy', content: seller.privacyPolicy! }); setView('policy-page'); window.scrollTo(0, 0); }}
                        className="hover:text-[#c5a059] transition-colors font-serif italic text-left"
                      >
                        Privacy Policy
                      </button>
                    </li>
                  )}
                  {seller.termsOfService && (
                    <li>
                      <button
                        onClick={() => { setPolicyPageData({ title: 'Terms of Service', content: seller.termsOfService! }); setView('policy-page'); window.scrollTo(0, 0); }}
                        className="hover:text-[#c5a059] transition-colors font-serif italic text-left"
                      >
                        Terms of Service
                      </button>
                    </li>
                  )}
                </ul>

                {(seller.socialLinks && Object.values(seller.socialLinks).some(link => link && link.trim() !== '')) && (
                  <div className="mt-12">
                    <h5 className="text-xs font-medium text-[#c5a059] uppercase tracking-widest mb-4">Follow Us</h5>
                    <div className="flex gap-3">
                      {seller.socialLinks?.instagram && seller.socialLinks.instagram.trim() !== '' && (
                        <a href={seller.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-white/10 flex items-center justify-center rounded-full opacity-60 hover:text-[#c5a059] hover:border-[#c5a059] transition-all" style={{ color: 'inherit' }}>
                          <Instagram size={14} />
                        </a>
                      )}
                      {seller.socialLinks?.facebook && seller.socialLinks.facebook.trim() !== '' && (
                        <a href={seller.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-white/10 flex items-center justify-center rounded-full opacity-60 hover:text-[#c5a059] hover:border-[#c5a059] transition-all" style={{ color: 'inherit' }}>
                          <Facebook size={14} />
                        </a>
                      )}
                      {seller.socialLinks?.twitter && seller.socialLinks.twitter.trim() !== '' && (
                        <a href={seller.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-white/10 flex items-center justify-center rounded-full opacity-60 hover:text-[#c5a059] hover:border-[#c5a059] transition-all" style={{ color: 'inherit' }}>
                          <Twitter size={14} />
                        </a>
                      )}
                      {seller.socialLinks?.linkedin && seller.socialLinks.linkedin.trim() !== '' && (
                        <a href={seller.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-white/10 flex items-center justify-center rounded-full opacity-60 hover:text-[#c5a059] hover:border-[#c5a059] transition-all" style={{ color: 'inherit' }}>
                          <Linkedin size={14} />
                        </a>
                      )}
                      {seller.socialLinks?.youtube && seller.socialLinks.youtube.trim() !== '' && (
                        <a href={seller.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-white/10 flex items-center justify-center rounded-full opacity-60 hover:text-[#c5a059] hover:border-[#c5a059] transition-all" style={{ color: 'inherit' }}>
                          <Youtube size={14} />
                        </a>
                      )}
                      {seller.socialLinks?.tiktok && seller.socialLinks.tiktok.trim() !== '' && (
                        <a href={seller.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-white/10 flex items-center justify-center rounded-full opacity-60 hover:text-[#c5a059] hover:border-[#c5a059] transition-all" style={{ color: 'inherit' }}>
                          <Music2 size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-8 text-center">
              <p className="text-[11px] font-serif italic uppercase tracking-widest opacity-40">
                © {new Date().getFullYear()} {seller.storeName}. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default LuxuryBoutique;