import React, { useState, useEffect, useMemo } from 'react';
import { Product, Seller, Order, OrderItem, ordersAPI, sellersAPI, Review, reviewsAPI, messagesAPI, discountsAPI, DeliveryLocation } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import {
   ShoppingCart, Star, ArrowRight, Heart, Search, Menu, Instagram, Twitter, Facebook,
   ShieldCheck, Truck, RefreshCw, X, Plus, Minus, Trash2, Check, Edit2, Palette,
   LogIn, UserPlus, Mail, Phone, MapPin, Sparkles, Loader2, Send, Youtube, Linkedin, Globe, MessageCircle, Music2, LayoutDashboard, Tag,
   Upload, Image as ImageIcon, Edit3, Headphones, CreditCard
 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Popup } from '../../../components/ui/Popup';
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

const ICON_MAP: Record<string, any> = {
  Truck,
  ShieldCheck,
  RefreshCw,
  Heart,
  Star,
  Sparkles,
  Check,
  Globe,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Music2,
  Tag,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin
};

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
  themeSecondary,
  cardBgColor = '#ffffff'
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
  cardBgColor?: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-gray-100"
      style={{ backgroundColor: cardBgColor }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div 
        className="relative aspect-square overflow-hidden cursor-pointer"
        onClick={() => onViewDetail(product)}
      >
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Wishlist Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(product); }}
          className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 shadow-sm group/wishlist ${
            isWishlisted 
              ? 'bg-red-500 text-white scale-110' 
              : 'bg-white/80 text-gray-900 hover:bg-gray-900 hover:text-white'
          }`}
        >
          <Heart className={`w-4 h-4 transition-transform duration-300 group-hover/wishlist:scale-110 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Quick Actions Overlay */}
        <div className={`absolute inset-x-4 bottom-4 flex flex-col gap-2 transition-all duration-500 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <button
            className="w-full py-3 bg-white/90 backdrop-blur-md text-gray-900 text-xs font-black uppercase tracking-[0.1em] rounded-xl hover:bg-gray-900 hover:text-white transition-all duration-300 shadow-lg border border-white/20 active:scale-95"
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
          >
            Add to Bag
          </button>
          <button
            className="w-full py-3 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg hover:brightness-110 active:scale-95"
            style={{ backgroundColor: themePrimary }}
            onClick={(e) => { e.stopPropagation(); onQuickBuy(product); }}
          >
            Quick Buy
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col gap-2 cursor-pointer" onClick={() => onViewDetail(product)}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.category}</span>
          <div className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[10px] font-bold text-gray-600">4.9</span>
          </div>
        </div>
        
        <h4 className="text-sm font-bold text-gray-900 line-clamp-2 min-h-[2.5rem] leading-tight">
          {product.name}
        </h4>
        
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-lg font-black text-gray-900">
            {formatPrice(product.price, currency)}
          </span>
          <div 
            className="p-2 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors"
            onClick={(e) => { e.stopPropagation(); onWriteReview(product); }}
          >
            <MessageCircle className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
};

const ModernEcommerce: React.FC<ThemeProps> = ({
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
  const seller = editMode && sellerData ? sellerData : initialSeller;
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const themePrimary = seller.theme?.primaryColor || '#6366f1'; // Indigo default for modern
  const themeSecondary = seller.theme?.secondaryColor || '#f8fafc';
  const customizations = seller.theme?.customizations || {};
  const mainBgColor = customizations.mainBgColor || '#ffffff';
  const cardBgColor = customizations.cardBgColor || '#ffffff';
  
  const initialFeatures = [
    { 
      icon: customizations.feature_0_icon ?? 'Truck', 
      title: customizations.feature_0_title ?? 'Free Shipping', 
      description: customizations.feature_0_desc ?? 'Orders over $100' 
    },
    { 
      icon: customizations.feature_1_icon ?? 'ShieldCheck', 
      title: customizations.feature_1_title ?? 'Secure Payment', 
      description: customizations.feature_1_desc ?? '100% secure payment' 
    },
    { 
      icon: customizations.feature_2_icon ?? 'RefreshCw', 
      title: customizations.feature_2_title ?? 'Easy Returns', 
      description: customizations.feature_2_desc ?? '30-day return policy' 
    },
    { 
      icon: customizations.feature_3_icon ?? 'Headphones', 
      title: customizations.feature_3_title ?? '24/7 Support', 
      description: customizations.feature_3_desc ?? 'Dedicated concierge for all your needs' 
    }
  ];

  const [view, setView] = useState<View>('home');
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
        status: checkoutData.paymentMethod === 'pod' ? 'pending' : 'pending',
        paymentMethod: checkoutData.paymentMethod === 'pod' ? 'pod' : activePaymentMethod,
        shippingAddress: {
          street: checkoutData.address || 'N/A',
          city: selectedDeliveryLocation?.name || 'N/A',
          state: selectedDeliveryLocation?.name || 'N/A',
          country: 'N/A',
          zipCode: 'N/A'
        },
        deliveryFee: deliveryFee,
        deliveryLocation: selectedDeliveryLocation?.name,
        paymentType: checkoutData.paymentMethod,
        remainingBalance: checkoutData.paymentMethod === 'deposit' ? remainingBalance : undefined
      } as any;

      const response = await ordersAPI.create(orderData);

      if (checkoutData.paymentMethod === 'pod') {
      setCart([]);
      setAppliedDiscount(null);
      localStorage.removeItem(`cart_${seller.id}`);
      localStorage.removeItem(`discount_${seller.id}`);
      setCouponCode('');
      setView('order-success');
      return;
    }

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
          callback: (paystackResponse: any) => {
            ordersAPI.verifyPayment(paystackResponse.reference, response.id)
              .then(res => {
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
              }).catch(() => {
                console.error('Verification error');
                alert('An error occurred during payment verification.');
              });
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

  const renderHome = () => (
    <div className="space-y-32 pb-32">
      {/* Dynamic Hero Section */}
      {!customizations.hideHero && (
        <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-0 right-0 w-[50%] h-[100%] bg-indigo-50/50 rounded-bl-[200px]" />
            <div className="absolute top-[20%] left-[10%] w-64 h-64 bg-indigo-200/20 blur-[120px] rounded-full" />
            <div className="absolute bottom-[10%] right-[20%] w-96 h-96 bg-purple-200/20 blur-[120px] rounded-full" />
          </div>

          <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 relative z-10 w-full">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-10">
                <div className="space-y-4">
                  <div 
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                    style={{ backgroundColor: customizations.heroBadgeBgColor || '#f5f7ff' }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: customizations.heroBadgeTextColor || '#4f46e5' }} />
                    {editMode ? (
                      <input
                        type="text"
                        value={customizations.heroBadgeText ?? 'New Collection 2026'}
                        onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroBadgeText', e.target.value)}
                        className="text-[10px] font-black uppercase tracking-widest bg-transparent border-none focus:ring-0 p-0"
                        style={{ color: customizations.heroBadgeTextColor || '#4f46e5' }}
                      />
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: customizations.heroBadgeTextColor || '#4f46e5' }}>
                        {customizations.heroBadgeText ?? 'New Collection 2026'}
                      </span>
                    )}
                  </div>
                  <h2 
                    className="text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9]"
                    style={{ color: customizations.heroTitleColor || '#111827' }}
                  >
                    {editMode ? (
                      <textarea
                        value={customizations.heroTitle ?? 'Redefine Your Modern Style.'}
                        onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroTitle', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none"
                        rows={2}
                        style={{ color: customizations.heroTitleColor || '#111827' }}
                      />
                    ) : (
                      customizations.heroTitle ?? 'Redefine Your Modern Style.'
                    )}
                  </h2>
                  <p 
                    className="text-lg max-w-lg leading-relaxed font-medium"
                    style={{ color: customizations.heroSubtitleColor || '#6b7280' }}
                  >
                    {editMode ? (
                      <textarea
                        value={customizations.heroSubtitle ?? 'Experience the perfect blend of innovation and elegance with our curated digital selection.'}
                        onChange={(e) => onUpdateThemeCustomization?.('hero', 'heroSubtitle', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none"
                        rows={2}
                        style={{ color: customizations.heroSubtitleColor || '#6b7280' }}
                      />
                    ) : (
                      customizations.heroSubtitle ?? 'Experience the perfect blend of innovation and elegance with our curated digital selection.'
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <button 
                    onClick={() => setView('shop')}
                    className="group relative px-10 py-5 bg-gray-900 text-white rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-200"
                  >
                    <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    <span className="relative text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
                      Shop Now <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                  <button className="px-10 py-5 border-2 border-gray-100 text-gray-900 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-gray-50 transition-all">
                    View Lookbook
                  </button>
                </div>

                <div className="pt-10 flex items-center gap-8 border-t border-gray-100">
                  <div className="flex -space-x-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-sm">
                        <img src={`https://i.pravatar.cc/150?u=${i}`} alt="user" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3 h-3 fill-current" />)}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">10k+ Happy Customers</p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="relative z-10 rounded-[60px] overflow-hidden shadow-2xl rotate-2 transition-transform duration-700 hover:rotate-0">
                  <img 
                    src={customizations.heroImage ?? 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80'} 
                    alt="Hero" 
                    className="w-full aspect-[4/5] object-cover"
                  />
                  {editMode && onImageUpload && (
                    <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                      <Upload className="w-8 h-8 text-white mb-2" />
                      <span className="text-white text-xs font-black uppercase">Change Image</span>
                      <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onImageUpload(e.target.files[0], 'hero')} />
                    </label>
                  )}
                </div>
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-white p-6 rounded-[40px] shadow-2xl z-20 animate-bounce-slow">
                  <div className="w-full h-full bg-indigo-50 rounded-[30px] flex flex-col items-center justify-center text-center p-4">
                    <span className="text-3xl font-black text-indigo-600">30%</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 mt-1">Limited Offer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Brand Story Section */}
      {!customizations.hideStory && (
        <section className="max-w-screen-2xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div className="relative group">
              <div className="relative rounded-[60px] overflow-hidden shadow-2xl transition-transform duration-700 hover:scale-[1.02]">
                <img 
                  src={customizations.storyImage ?? 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80'} 
                  alt="Our Story" 
                  className="w-full aspect-square object-cover"
                />
                {editMode && onImageUpload && (
                  <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Upload className="w-8 h-8 text-white mb-2" />
                    <span className="text-white text-xs font-black uppercase">Update Story Image</span>
                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onImageUpload(e.target.files[0], 'story')} />
                  </label>
                )}
              </div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white rounded-[40px] shadow-2xl p-6 hidden lg:flex items-center justify-center">
                <div className="w-full h-full bg-indigo-50 rounded-[30px] flex items-center justify-center">
                  <span className="text-2xl font-black text-indigo-600 italic">Est. 2026</span>
                </div>
              </div>
            </div>

            <div className="space-y-12">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Our Essence</span>
                </div>
                <h2 className="text-6xl font-black tracking-tighter text-gray-900 leading-none">
                  {editMode ? (
                    <textarea
                      value={customizations.storyTitle ?? 'Crafting Modern Legacies.'}
                      onChange={(e) => onUpdateThemeCustomization?.('story', 'storyTitle', e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-6xl font-black tracking-tighter"
                      rows={2}
                    />
                  ) : (
                    customizations.storyTitle ?? 'Crafting Modern Legacies.'
                  )}
                </h2>
                <p className="text-xl text-gray-500 font-medium leading-relaxed">
                  {editMode ? (
                    <textarea
                      value={customizations.storyDescription ?? 'We believe in the power of minimalist design and maximum impact. Each piece in our collection is a testament to our commitment to innovation, quality, and the modern spirit.'}
                      onChange={(e) => onUpdateThemeCustomization?.('story', 'storyDescription', e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none text-xl text-gray-500 font-medium leading-relaxed"
                      rows={4}
                    />
                  ) : (
                    customizations.storyDescription ?? 'We believe in the power of minimalist design and maximum impact. Each piece in our collection is a testament to our commitment to innovation, quality, and the modern spirit.'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-100">
                <div>
                  <h4 className="text-3xl font-black text-gray-900 tracking-tighter">100%</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Sustainable Materials</p>
                </div>
                <div>
                  <h4 className="text-3xl font-black text-gray-900 tracking-tighter">24/7</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Global Support</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features - Minimalist */}
      {!customizations.hideFeatures && (
        <section 
          className="max-w-screen-2xl mx-auto px-6 lg:px-12 relative"
          style={{ backgroundColor: customizations.featuresBgColor || 'transparent' }}
        >
          <div className="grid md:grid-cols-4 gap-12">
            {initialFeatures.map((f, i) => {
              const IconComponent = ICON_MAP[f.icon as keyof typeof ICON_MAP] || Truck;
              return (
                <div key={i} className="group p-10 rounded-[40px] bg-white border border-gray-100 hover:border-indigo-100 transition-all duration-500 hover:shadow-xl hover:shadow-indigo-50/50 relative">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-indigo-600 transition-colors duration-500 relative">
                    <IconComponent className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
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
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">
                      {editMode ? (
                        <input
                          value={f.title}
                          onChange={(e) => onUpdateThemeCustomization?.('features', `feature_${i}_title`, e.target.value)}
                          className="bg-transparent border-none p-0 w-full focus:ring-0 font-black uppercase tracking-widest text-gray-900"
                        />
                      ) : (
                        f.title
                      )}
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">
                      {editMode ? (
                        <textarea
                          value={f.description}
                          onChange={(e) => onUpdateThemeCustomization?.('features', `feature_${i}_desc`, e.target.value)}
                          className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-xs text-gray-500 font-medium"
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
        </section>
      )}

      {/* Modern Product Grid */}
      {!customizations.hideProductGrid && (
        <section className="max-w-screen-2xl mx-auto px-6 lg:px-12 space-y-20">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
            <div className="space-y-4">
              <h2 className="text-5xl font-black tracking-tighter text-gray-900">
                {editMode ? (
                  <input
                    value={customizations.productGridTitle ?? 'Curated Essentials.'}
                    onChange={(e) => onUpdateThemeCustomization?.('productGrid', 'productGridTitle', e.target.value)}
                    className="bg-transparent border-none p-0 w-full focus:ring-0 text-5xl font-black tracking-tighter text-gray-900"
                  />
                ) : (
                  customizations.productGridTitle ?? 'Curated Essentials.'
                )}
              </h2>
              <p className="text-gray-500 font-medium max-w-md">
                {editMode ? (
                  <textarea
                    value={customizations.productGridSubtitle ?? 'Our hand-picked selection of the seasons most sought-after pieces.'}
                    onChange={(e) => onUpdateThemeCustomization?.('productGrid', 'productGridSubtitle', e.target.value)}
                    className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-gray-500 font-medium"
                    rows={2}
                  />
                ) : (
                  customizations.productGridSubtitle ?? 'Our hand-picked selection of the seasons most sought-after pieces.'
                )}
              </p>
            </div>
            <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl">
              {['All', 'Trending', 'New', 'Essentials'].map((cat) => (
                <button 
                  key={cat}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cat === 'All' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-900'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {products.slice(0, 8).map((product) => (
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
                cardBgColor={cardBgColor}
              />
            ))}
          </div>

          <div className="flex justify-center">
            <button 
              onClick={() => setView('shop')}
              className="group px-12 py-5 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:bg-indigo-600 hover:shadow-2xl"
            >
              Explore Full Collection
            </button>
          </div>
        </section>
      )}

      {/* Modern Newsletter */}
      {!customizations.hideNewsletter && (
        <section className="max-w-screen-2xl mx-auto px-6 lg:px-12">
          <div 
            className="relative rounded-[60px] overflow-hidden p-20 lg:p-32 text-center text-white"
            style={{ backgroundColor: customizations.newsletterBgColor || '#4f46e5' }}
          >
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-12">
              <div className="space-y-6">
                <h2 
                  className="text-6xl font-black tracking-tighter leading-none"
                  style={{ color: customizations.newsletterTitleColor || '#ffffff' }}
                >
                  {editMode ? (
                    <input
                      value={customizations.newsletterTitle ?? 'Join the Inner Circle.'}
                      onChange={(e) => onUpdateThemeCustomization?.('newsletter', 'newsletterTitle', e.target.value)}
                      className="bg-transparent border-none p-0 w-full focus:ring-0 text-6xl font-black tracking-tighter text-center"
                      style={{ color: customizations.newsletterTitleColor || '#ffffff' }}
                    />
                  ) : (
                    customizations.newsletterTitle ?? 'Join the Inner Circle.'
                  )}
                </h2>
                <p 
                  className="font-medium text-lg"
                  style={{ color: customizations.newsletterSubtitleColor || '#e0e7ff' }}
                >
                  {editMode ? (
                    <textarea
                      value={customizations.newsletterSubtitle ?? 'Subscribe for exclusive early access to drops and modern lifestyle insights.'}
                      onChange={(e) => onUpdateThemeCustomization?.('newsletter', 'newsletterSubtitle', e.target.value)}
                      className="bg-transparent border-none p-0 w-full focus:ring-0 resize-none text-center font-medium text-lg"
                      rows={2}
                      style={{ color: customizations.newsletterSubtitleColor || '#e0e7ff' }}
                    />
                  ) : (
                    customizations.newsletterSubtitle ?? 'Subscribe for exclusive early access to drops and modern lifestyle insights.'
                  )}
                </p>
              </div>
              <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-8 py-5 text-sm placeholder:text-indigo-200 focus:outline-none focus:bg-white/20 transition-all"
                />
                <button 
                  className="px-10 py-5 bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  style={{ color: customizations.newsletterBgColor || '#4f46e5' }}
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

    </div>
  );

  const renderShop = () => {
    const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
    const filteredProducts = selectedCategory === 'All'
      ? products
      : products.filter(p => p.category === selectedCategory);

    return (
      <section className="py-32 min-h-screen" style={{ backgroundColor: mainBgColor }}>
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 space-y-20">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
            <div className="space-y-4">
              <h2 className="text-5xl font-black tracking-tighter text-gray-900">Explore Collection.</h2>
              <p className="text-gray-500 font-medium max-w-md">Discover our entire range of meticulously crafted modern essentials.</p>
            </div>
            <div className="flex flex-wrap gap-3 bg-gray-50 p-2 rounded-2xl">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    selectedCategory === cat
                      ? 'bg-white shadow-sm text-indigo-600'
                      : 'text-gray-400 hover:text-gray-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
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
                cardBgColor={cardBgColor}
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
      <section className="py-32 min-h-screen" style={{ backgroundColor: mainBgColor }}>
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
          <button
            onClick={() => setView('shop')}
            className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-indigo-600 transition-all mb-20"
          >
            <ArrowRight className="w-4 h-4 rotate-180 transition-transform group-hover:-translate-x-2" />
            Back to Collection
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-start">
            <div className="space-y-8">
              <div className="aspect-[4/5] rounded-[60px] overflow-hidden bg-gray-50 shadow-2xl">
                <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="w-full h-full object-cover" />
              </div>
              <div className="grid grid-cols-4 gap-6">
                {selectedProduct.images.slice(1).map((img, i) => (
                  <div key={i} className="aspect-square rounded-3xl overflow-hidden bg-gray-50 border border-gray-100">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-12 py-10">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                    {selectedProduct.category}
                  </span>
                  <div className="flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star 
                        key={s} 
                        className={`w-3 h-3 ${s <= Math.round(reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)) ? 'fill-current' : 'text-gray-200'}`} 
                      />
                    ))}
                    <span className="text-[10px] font-black text-gray-400 ml-2 uppercase tracking-widest">
                      {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
                    </span>
                  </div>
                </div>
                <h2 className="text-6xl font-black tracking-tighter text-gray-900">{selectedProduct.name}</h2>
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-black text-indigo-600">{formatPrice(selectedProduct.price, seller.currency)}</p>
                  <button
                    onClick={() => handleWriteReview(selectedProduct)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    <Edit3 size={14} />
                    Write a Review
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Description</h4>
                <p className="text-gray-500 leading-relaxed font-medium text-lg">
                  {selectedProduct.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => addToCart(selectedProduct)}
                  className="flex-1 min-w-[200px] py-5 bg-gray-900 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-600 hover:shadow-2xl transition-all active:scale-95"
                >
                  Add to Bag
                </button>
                <button
                  onClick={() => toggleWishlist(selectedProduct)}
                  className={`p-5 rounded-2xl border transition-all ${wishlist.find(p => p.id === selectedProduct.id) ? 'bg-red-50 border-red-100 text-red-500' : 'border-gray-100 text-gray-900 hover:bg-gray-900 hover:text-white group/wish-detail'}`}
                >
                  <Heart className={`w-6 h-6 transition-transform duration-300 group-hover/wish-detail:scale-110 ${wishlist.find(p => p.id === selectedProduct.id) ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Reviews List */}
              {reviews.length > 0 && (
                <div className="pt-12 border-t border-gray-100 space-y-10">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Verified Reviews</h4>
                  <div className="space-y-8">
                    {reviews.map((review, i) => (
                      <div key={review.id || i} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-[10px] font-black uppercase">
                              {review.customerName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-900 uppercase tracking-widest">{review.customerName}</p>
                              <div className="flex items-center gap-1 text-amber-400 mt-0.5">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} className={`w-2.5 h-2.5 ${s <= review.rating ? 'fill-current' : 'text-gray-200'}`} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed pl-11">
                          {review.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-8 pt-12 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Truck className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-900">Free Delivery</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Worldwide Shipping</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-900">Secure Warranty</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">2-Year Protection</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderCart = () => (
    <div className="py-32 min-h-screen" style={{ backgroundColor: mainBgColor }}>
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
        <div className="flex items-end justify-between mb-20">
          <div className="space-y-4">
            <h2 className="text-5xl font-black tracking-tighter text-gray-900">Your Shopping Bag.</h2>
            <p className="text-gray-500 font-medium">{cart.length} items ready for checkout</p>
          </div>
          <button 
            onClick={() => setView('shop')}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 border-b-2 border-indigo-600 pb-1"
          >
            Continue Shopping
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-40 bg-gray-50 rounded-[60px] border-2 border-dashed border-gray-100">
            <div className="w-24 h-24 bg-white rounded-[30px] shadow-xl flex items-center justify-center mx-auto mb-8">
              <ShoppingCart className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">Your bag is currently empty.</h3>
            <p className="text-gray-500 font-medium mb-10">Discover our latest collection and find something special.</p>
            <button 
              onClick={() => setView('shop')}
              className="px-12 py-5 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-24 items-start">
            <div className="lg:col-span-2 space-y-8">
              {cart.map(item => (
                <div key={item.product.id} className="group flex items-center gap-10 p-8 bg-white rounded-[40px] border border-gray-100 hover:border-indigo-100 transition-all hover:shadow-2xl hover:shadow-indigo-50/50">
                  <div className="w-40 h-40 rounded-[30px] overflow-hidden bg-gray-50 flex-shrink-0">
                    <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  </div>
                  <div className="flex-1 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="text-xl font-black text-gray-900">{item.product.name}</h4>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{item.product.category}</p>
                      </div>
                      <span className="text-xl font-black text-gray-900">{formatPrice(item.product.price * item.quantity, seller.currency)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <div className="flex items-center bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                        <button 
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:shadow-sm transition-all"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-12 text-center text-sm font-black text-gray-900">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:shadow-sm transition-all"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-8 lg:sticky lg:top-32">
              <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-2xl shadow-indigo-50/50 space-y-8">
                <h3 className="text-xl font-black text-gray-900">Order Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-medium text-gray-500">
                    <span>Subtotal</span>
                    <span className="text-gray-900 font-black">{formatPrice(cartTotal, seller.currency)}</span>
                  </div>

                  {appliedDiscount && (
                    <div className="flex justify-between text-sm font-black text-green-500 bg-green-50 p-4 rounded-2xl border border-green-100">
                      <div className="flex items-center gap-2">
                        <Tag size={14} />
                        <span className="uppercase tracking-widest text-[10px]">{appliedDiscount.code}</span>
                      </div>
                      <span>-{formatPrice(discountAmount, seller.currency)}</span>
                    </div>
                  )}

                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-sm font-medium text-gray-500">
                      <span>Delivery Fee</span>
                      <span className="text-gray-900 font-black">{formatPrice(deliveryFee, seller.currency)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-medium text-gray-500">
                    <span>Shipping</span>
                    <span className="text-indigo-600 font-black">Free</span>
                  </div>
                  
                  <div className="h-px bg-gray-100 my-6"></div>
                  
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Amount</span>
                    <span className="text-4xl font-black text-gray-900 tracking-tighter">{formatPrice(finalTotal, seller.currency)}</span>
                  </div>
                </div>

                {!appliedDiscount ? (
                  <div className="pt-4 space-y-4">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Promo Code"
                        className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition-all placeholder:text-gray-300"
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={isApplyingCoupon || !couponCode.trim()}
                        className="px-8 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 disabled:opacity-50 transition-all"
                      >
                        {isApplyingCoupon ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Apply'}
                      </button>
                    </div>
                    {couponError && <p className="text-red-500 text-[9px] font-black uppercase tracking-widest ml-2">{couponError}</p>}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-green-50/50 p-4 rounded-2xl border border-green-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-green-600">Promo Applied</span>
                    </div>
                    <button onClick={removeCoupon} className="text-gray-300 hover:text-red-500 transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setView(user ? 'checkout' : 'auth-choice')}
                  className="w-full py-6 bg-gray-900 text-white rounded-[25px] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-600 hover:shadow-2xl transition-all shadow-xl active:scale-95"
                >
                  Checkout Now
                </button>
              </div>
              
              <div className="p-8 bg-indigo-50/50 rounded-[40px] border border-indigo-50 flex items-center gap-6">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                  <ShieldCheck className="w-6 h-6 text-indigo-600" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 leading-relaxed">
                  Every transaction is secured with military-grade encryption.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCheckout = () => {
    return (
      <div className="py-32 min-h-screen" style={{ backgroundColor: mainBgColor }}>
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
          <div className="flex items-end justify-between mb-20">
            <div className="space-y-4">
              <h2 className="text-5xl font-black tracking-tighter text-gray-900">Secure Checkout.</h2>
              <p className="text-gray-500 font-medium">Finalize your order and choose your preferences</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-24 items-start">
            <div className="lg:col-span-2 space-y-16">
              <form onSubmit={handlePlaceOrder} className="space-y-16">
                {/* Personal Section */}
                <div className="space-y-10">
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                      <span className="font-black text-sm">01</span>
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Personal Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Full Name</label>
                      <input
                        required
                        type="text"
                        value={checkoutData.name}
                        onChange={(e) => setCheckoutData({ ...checkoutData, name: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                        placeholder="Enter your name"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
                      <input
                        required
                        type="email"
                        value={checkoutData.email}
                        onChange={(e) => setCheckoutData({ ...checkoutData, email: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Phone Number</label>
                      <input
                        required
                        type="tel"
                        value={checkoutData.phone}
                        onChange={(e) => setCheckoutData({ ...checkoutData, phone: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                        placeholder="+1 (234) 567-890"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Section */}
                <div className="space-y-10">
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                      <span className="font-black text-sm">02</span>
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Delivery Details</h3>
                  </div>
                  
                  <div className="space-y-8">
                    {enabledDeliveryLocations.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Delivery Area</label>
                        <select
                          required
                          value={checkoutData.deliveryLocationId}
                          onChange={(e) => setCheckoutData({ ...checkoutData, deliveryLocationId: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition-all appearance-none cursor-pointer"
                        >
                          <option value="">Select your area</option>
                          {enabledDeliveryLocations.map((loc: DeliveryLocation) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name} {loc.fee ? `(+${formatPrice(loc.fee, seller.currency)})` : '(Complimentary)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Specific Address</label>
                      <textarea
                        required
                        rows={4}
                        value={checkoutData.address}
                        onChange={(e) => setCheckoutData({ ...checkoutData, address: e.target.value })}
                        placeholder="Building, Street, Apartment, Landmark..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-[30px] px-8 py-6 text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition-all resize-none"
                      />
                    </div>
</div>
                   </div>

                  {/* Step 3: Payment Method Selection */}
                  {paymentTerms.methods.length > 1 && (
                    <div className="space-y-10 pt-8">
                      <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                          <span className="font-black text-sm">03</span>
                        </div>
                        <h3 className="text-xl font-black text-gray-900">Payment Method</h3>
                      </div>
                      
                      <div className="space-y-4">
                        {paymentTerms.methods.map((methodId) => {
                          const methodLabels: Record<string, string> = {
                            site: 'Pay on Site (Full Amount)',
                            pod: 'Pay on Delivery',
                            deposit: `Partial Deposit (${paymentTerms.depositPercentage}% upfront)`
                          };
                          const isSelected = checkoutData.paymentMethod === methodId;
                          
                          return (
                            <div
                              key={methodId}
                              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                isSelected ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 hover:border-slate-200'
                              }`}
                              onClick={() => setCheckoutData({ ...checkoutData, paymentMethod: methodId as any })}
                            >
                              <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                  <CreditCard className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <h5 className="font-bold text-slate-900">{methodLabels[methodId]}</h5>
                                  </div>
                                  {methodId === 'deposit' && (
                                    <p className="text-xs font-medium text-slate-500">
                                      Pay {formatPrice(paymentAmount, seller.currency)} now, {formatPrice(remainingBalance, seller.currency)} on delivery
                                    </p>
                                  )}
                                  {methodId === 'pod' && (
                                    <p className="text-xs font-medium text-slate-500">
                                      Pay {formatPrice(cartTotal - discountAmount + deliveryFee, seller.currency)} when you receive your order
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                   <button
                  type="submit"
                  className="w-full py-7 bg-gray-900 text-white rounded-[30px] font-black text-sm uppercase tracking-[0.3em] hover:bg-indigo-600 hover:shadow-2xl transition-all shadow-xl active:scale-95"
                >
                  Confirm & Place Order • {formatPrice(finalTotal, seller.currency)}
                </button>
              </form>
            </div>

            <div className="space-y-8 lg:sticky lg:top-32">
              <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-2xl shadow-indigo-50/50 space-y-10">
                <h3 className="text-xl font-black text-gray-900">Order Summary</h3>
                <div className="space-y-6">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex justify-between items-center gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 p-1 flex-shrink-0">
                          <img src={item.product.images[0]} className="w-full h-full object-cover rounded-xl" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-black text-gray-900 line-clamp-1">{item.product.name}</p>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-gray-900">{formatPrice(item.product.price * item.quantity, seller.currency)}</p>
                    </div>
                  ))}
                  
                  <div className="h-px bg-gray-100 my-8"></div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-gray-400">
                      <span>Subtotal</span>
                      <span className="text-gray-900">{formatPrice(cartTotal, seller.currency)}</span>
                    </div>

                    {appliedDiscount && (
                      <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-green-500">
                        <span>Discount</span>
                        <span>-{formatPrice(discountAmount, seller.currency)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-gray-400">
                      <span>Delivery</span>
                      <span className={deliveryFee > 0 ? "text-gray-900" : "text-indigo-600"}>
                        {deliveryFee > 0 ? formatPrice(deliveryFee, seller.currency) : 'Free'}
                      </span>
                    </div>
                  </div>

<div className="h-px bg-gray-100 my-8"></div>
                   
                   {checkoutData.paymentMethod === 'deposit' && (
                     <div className="space-y-4">
                       <div className="h-px bg-gray-200"></div>
                       <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-emerald-500">
                         <span>Pay Now ({paymentTerms.depositPercentage}%)</span>
                         <span>{formatPrice(paymentAmount, seller.currency)}</span>
                       </div>
                       <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-gray-400">
                         <span>Remaining Balance</span>
                         <span>{formatPrice(remainingBalance, seller.currency)}</span>
                       </div>
                       <div className="h-px bg-gray-200"></div>
                     </div>
                   )}

                   <div className="flex justify-between items-end">
                     {checkoutData.paymentMethod === 'pod' ? (
                       <>
                         <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Pay on Delivery</span>
                         <span className="text-4xl font-black text-gray-900 tracking-tighter">{formatPrice(cartTotal - discountAmount + deliveryFee, seller.currency)}</span>
                       </>
                     ) : (
                       <>
                         <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Due</span>
                         <span className="text-4xl font-black text-gray-900 tracking-tighter">{formatPrice(finalTotal, seller.currency)}</span>
                       </>
                     )}
                   </div>
                </div>
              </div>

              <div className="p-8 bg-gray-900 rounded-[40px] text-white flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <ShieldCheck className="w-7 h-7 text-indigo-400" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest">Encrypted Checkout</h4>
                  <p className="text-[9px] font-medium text-gray-400 uppercase tracking-widest leading-relaxed">
                    Safe and secure processing guaranteed by industry standards.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSuccess = () => {
    return (
      <div className="py-40 min-h-screen flex items-center justify-center text-center px-6" style={{ backgroundColor: mainBgColor }}>
        <div className="max-w-xl space-y-12">
          <div className="relative inline-block">
            <div className="w-32 h-32 bg-green-50 rounded-[40px] flex items-center justify-center mx-auto animate-bounce-slow">
              <Check size={48} className="text-green-600" strokeWidth={3} />
            </div>
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg animate-pulse">
              <Sparkles size={20} />
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-6xl font-black tracking-tighter text-gray-900 leading-none">Order Confirmed.</h2>
            {checkoutData.paymentMethod === 'deposit' && (
              <p className="text-lg text-emerald-600 font-medium leading-relaxed">
                You paid {formatPrice(paymentAmount, seller.currency)}. Remaining balance of {formatPrice(remainingBalance, seller.currency)} due on delivery.
              </p>
            )}
            {checkoutData.paymentMethod === 'pod' && (
              <p className="text-lg text-gray-500 font-medium leading-relaxed">
                Pay on delivery: {formatPrice(cartTotal - discountAmount + deliveryFee, seller.currency)} when you receive your order.
              </p>
            )}
            {checkoutData.paymentMethod !== 'deposit' && checkoutData.paymentMethod !== 'pod' && (
              <p className="text-lg text-gray-500 font-medium leading-relaxed">
                Thank you for choosing us. Your order has been successfully placed and a confirmation email is on its way.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={() => setView('home')}
              className="px-12 py-5 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
            >
              Back to Home
            </button>
            <button
              onClick={() => navigate('/customer/dashboard')}
              className="px-12 py-5 border-2 border-gray-100 text-gray-900 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-gray-50 transition-all"
            >
              Track Order
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderContact = () => (
    <div className="py-32 min-h-screen" style={{ backgroundColor: mainBgColor }}>
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-32 items-start">
          <div className="space-y-20">
            <div className="space-y-6">
              <h2 className="text-7xl font-black tracking-tighter text-gray-900 leading-none">Get in Touch.</h2>
              <p className="text-xl text-gray-500 font-medium leading-relaxed">
                Have a question or want to discuss a custom requirement? Our team of modern lifestyle consultants is here to help.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-12">
              {[
                { icon: Mail, label: 'Email Support', value: seller.contactInfo?.email || seller.ownerEmail },
                { icon: Phone, label: 'Phone Line', value: seller.contactInfo?.phone },
                { icon: MapPin, label: 'Headquarters', value: seller.contactInfo?.address },
                { icon: MessageCircle, label: 'WhatsApp', value: seller.contactInfo?.whatsapp }
              ].map((item, i) => item.value && (
                <div key={i} className="space-y-4 group">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <item.icon size={24} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{item.label}</h4>
                    <p className="text-lg font-black text-gray-900 break-words">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-12 border-t border-gray-100 space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Digital Presence</h4>
              <div className="flex gap-4">
                {[Instagram, Twitter, Facebook, Youtube, Linkedin].map((Icon, i) => (
                  <button key={i} className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                    <Icon size={20} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[60px] p-16 border border-gray-100 shadow-2xl shadow-indigo-50/50">
            <form onSubmit={handleContactSubmit} className="space-y-10">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">How can we help?</label>
                  <textarea
                    required
                    rows={5}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-[30px] px-8 py-6 text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition-all resize-none"
                    placeholder="Describe your inquiry..."
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-6 bg-gray-900 text-white rounded-[30px] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Message <Send size={16} /></>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPricing = () => {
    const pricingConfig = seller.pricingConfig;
    if (!pricingConfig || !pricingConfig.plans) {
      return (
        <div className="py-32 min-h-screen flex items-center justify-center text-center px-6" style={{ backgroundColor: mainBgColor }}>
          <div className="space-y-6">
            <h2 className="text-4xl font-black tracking-tighter text-gray-900">Pricing.</h2>
            <p className="text-gray-500 font-medium">No pricing plans available at this time.</p>
          </div>
        </div>
      );
    }

    const tiers = [
      { id: 'starter', name: 'Starter', ...pricingConfig.plans.starter },
      { id: 'professional', name: 'Professional', ...pricingConfig.plans.professional },
      { id: 'enterprise', name: 'Enterprise', ...pricingConfig.plans.enterprise }
    ];
    const currentPlan = seller.subscription?.plan || 'starter';

    return (
      <div className="py-32 min-h-screen" style={{ backgroundColor: mainBgColor }}>
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 space-y-20">
          <div className="text-center space-y-4">
            <h2 className="text-6xl font-black tracking-tighter text-gray-900">Choose Your Plan.</h2>
            <p className="text-xl text-gray-500 font-medium">Elevate your business with our professional solutions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative p-12 rounded-[50px] border-2 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${
                  currentPlan === tier.id
                    ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-50'
                    : 'border-gray-100 bg-white hover:border-indigo-100'
                }`}
              >
                {currentPlan === tier.id && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">
                    Current Plan
                  </div>
                )}
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{tier.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black text-gray-900">${tier.price}</span>
                      <span className="text-sm font-bold text-gray-400">/mo</span>
                    </div>
                  </div>
                  
                  <ul className="space-y-4 py-8 border-t border-gray-50">
                    {tier.features?.map((feature: string, i: number) => (
                      <li key={i} className="flex items-center gap-4 text-sm font-medium text-gray-500">
                        <div className="w-5 h-5 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                          <Check size={12} strokeWidth={4} />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="pt-8 border-t border-gray-50 flex flex-col items-center gap-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full">
                      {tier.productLimit === Infinity ? 'Unlimited' : tier.productLimit} Products
                    </span>
                    <button className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all ${
                      currentPlan === tier.id ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-900 text-white hover:bg-indigo-600'
                    }`}>
                      {currentPlan === tier.id ? 'Manage Plan' : 'Select Plan'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPolicyPage = () => (
    <div className="py-40 min-h-screen" style={{ backgroundColor: mainBgColor }}>
      <div className="max-w-3xl mx-auto px-6 space-y-16">
        <div className="space-y-6">
          <button
            onClick={() => setView('home')}
            className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-indigo-600 transition-all mb-10"
          >
            <ArrowRight className="w-4 h-4 rotate-180 transition-transform group-hover:-translate-x-2" />
            Back to Home
          </button>
          <h2 className="text-6xl font-black tracking-tighter text-gray-900 leading-none">{policyPageData?.title}</h2>
        </div>
        
        <div className="text-gray-500 leading-relaxed whitespace-pre-wrap font-medium text-lg">
          {policyPageData?.content}
        </div>
      </div>
    </div>
  );

  const renderAuthChoice = () => {
    const redirectUrl = `${location.pathname}?checkout=true`;
    return (
      <div className="py-32 min-h-screen flex items-center justify-center bg-gray-50" style={{ backgroundColor: mainBgColor }}>
        <div className="max-w-4xl w-full px-6 grid md:grid-cols-2 gap-10">
          <div className="bg-white rounded-[50px] p-16 border border-gray-100 shadow-2xl shadow-indigo-50/50 space-y-12 text-center group transition-all hover:-translate-y-2">
            <div className="w-20 h-20 bg-indigo-50 rounded-[30px] flex items-center justify-center mx-auto text-indigo-600 transition-all group-hover:scale-110">
              <LogIn size={32} />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-gray-900">Sign In.</h3>
              <p className="text-gray-500 font-medium">Access your account and track your orders</p>
            </div>
            <button 
              onClick={() => navigate(`/login?shop=${seller.id}&subdomain=${seller.subdomain}&redirect=${encodeURIComponent(redirectUrl)}`)}
              className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
            >
              Login to Account
            </button>
          </div>

          <div className="bg-white rounded-[50px] p-16 border border-gray-100 shadow-2xl shadow-indigo-50/50 space-y-12 text-center group transition-all hover:-translate-y-2">
            <div className="w-20 h-20 bg-indigo-50 rounded-[30px] flex items-center justify-center mx-auto text-indigo-600 transition-all group-hover:scale-110">
              <UserPlus size={32} />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-gray-900">Join Us.</h3>
              <p className="text-gray-500 font-medium">Create an account for a faster experience</p>
            </div>
            <button 
              onClick={() => navigate(`/register?role=customer&shop=${seller.id}&subdomain=${seller.subdomain}&redirect=${encodeURIComponent(redirectUrl)}`)}
              className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
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
    deliveryLocationId: '',
    paymentMethod: 'site' as 'site' | 'pod' | 'deposit'
   });

  const enabledDeliveryLocations = useMemo(() => {
    return (seller.deliveryLocations || []).filter((loc: DeliveryLocation) => loc.enabled);
  }, [seller.deliveryLocations]);

  const selectedDeliveryLocation = useMemo(() => {
    return enabledDeliveryLocations.find((loc: DeliveryLocation) => loc.id === checkoutData.deliveryLocationId);
  }, [enabledDeliveryLocations, checkoutData.deliveryLocationId]);

  const deliveryFee = selectedDeliveryLocation?.fee || 0;

  const paymentTerms = seller.paymentTerms || { methods: ['site'], depositPercentage: 50, rules: 'all' };
  
  const paymentAmount = useMemo(() => {
    if (checkoutData.paymentMethod === 'deposit') {
      return (cartTotal - discountAmount + deliveryFee) * (paymentTerms.depositPercentage / 100);
    }
    return cartTotal - discountAmount + deliveryFee;
  }, [cartTotal, discountAmount, deliveryFee, checkoutData.paymentMethod, paymentTerms.depositPercentage]);

  const remainingBalance = useMemo(() => {
    if (checkoutData.paymentMethod === 'deposit') {
      return (cartTotal - discountAmount + deliveryFee) * ((100 - paymentTerms.depositPercentage) / 100);
    }
    return 0;
  }, [cartTotal, discountAmount, deliveryFee, checkoutData.paymentMethod, paymentTerms.depositPercentage]);

  const finalTotal = useMemo(() => {
    if (checkoutData.paymentMethod === 'pod') {
      return 0;
    }
    return paymentAmount;
  }, [paymentAmount, checkoutData.paymentMethod]);

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-100 selection:text-indigo-900" style={{ backgroundColor: mainBgColor }}>
      {/* Modern Live Editor */}
      {editMode && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-gray-200 px-6 py-3 shadow-lg overflow-x-auto scrollbar-hide">
          <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-8 whitespace-nowrap text-gray-900">
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-indigo-200 shadow-lg">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-tighter block">Modern Editor</span>
                <span className="text-[9px] text-indigo-600 uppercase font-black tracking-widest">Interface Pro</span>
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
                    value={seller.theme?.primaryColor || '#6366f1'}
                    onChange={(e) => onUpdateData?.('theme.primaryColor', e.target.value)}
                    className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <label className="text-[7px] text-gray-400 uppercase font-black">BG</label>
                  <input
                    type="color"
                    value={mainBgColor}
                    onChange={(e) => onUpdateThemeCustomization?.('global', 'mainBgColor', e.target.value)}
                    className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                  />
                </div>
              </div>

              {/* Header Controls */}
              <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100 shrink-0">
                <div className="flex items-center gap-2 border-r border-gray-200 pr-3 mr-1">
                  <Menu className="w-3 h-3 text-indigo-500" />
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
                      value={customizations.headerTextColor || '#0f172a'}
                      onChange={(e) => onUpdateThemeCustomization?.('header', 'headerTextColor', e.target.value)}
                      className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[7px] text-gray-400 uppercase font-black">Sticky</label>
                    <button
                      onClick={() => onUpdateThemeCustomization?.('header', 'stickyHeader', customizations.stickyHeader === false ? true : false)}
                      className={`w-6 h-3.5 rounded-full transition-all relative ${customizations.stickyHeader !== false ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${customizations.stickyHeader !== false ? 'left-3' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Visibility & Toggles */}
              <div className="flex items-center gap-5 bg-gray-50 p-2 rounded-2xl border border-gray-100 shrink-0 text-gray-900 overflow-x-auto">
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Hero</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('hero', 'hideHero', !customizations.hideHero)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideHero ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideHero ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Story</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('story', 'hideStory', !customizations.hideStory)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideStory ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideStory ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Feat</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('features', 'hideFeatures', !customizations.hideFeatures)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideFeatures ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideFeatures ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2 border-r border-gray-200">
                  <label className="text-[7px] uppercase font-black text-gray-400">Grid</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('productGrid', 'hideProductGrid', !customizations.hideProductGrid)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideProductGrid ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${!customizations.hideProductGrid ? 'left-3' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 px-2">
                  <label className="text-[7px] uppercase font-black text-gray-400">News</label>
                  <button
                    onClick={() => onUpdateThemeCustomization?.('newsletter', 'hideNewsletter', !customizations.hideNewsletter)}
                    className={`w-6 h-3.5 rounded-full transition-all relative ${!customizations.hideNewsletter ? 'bg-indigo-600' : 'bg-gray-300'}`}
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
                      value={customizations.newsletterBgColor || '#4f46e5'}
                      onChange={(e) => onUpdateThemeCustomization?.('newsletter', 'newsletterBgColor', e.target.value)}
                      className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[7px] text-gray-400 uppercase font-black">Foot</label>
                    <input
                      type="color"
                      value={customizations.footerBgColor || '#ffffff'}
                      onChange={(e) => onUpdateThemeCustomization?.('footer', 'footerBgColor', e.target.value)}
                      className="w-4 h-4 rounded-full cursor-pointer border-none bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className={`${editMode ? 'pt-24' : ''} transition-all duration-500`}>
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
          className={`${customizations.stickyHeader !== false ? 'fixed' : 'absolute'} ${editMode ? 'top-16' : 'top-0'} left-0 right-0 z-50 transition-all duration-500 border-b border-gray-100/50`}
          style={{ 
            backgroundColor: customizations.headerBgColor || 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(24px)'
          }}
        >
          <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('home')}>
                {seller.logo ? (
                  <img src={seller.logo} alt={seller.storeName} className="h-9 w-auto object-contain transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-indigo-100 shadow-xl rotate-3 group-hover:rotate-0 transition-all duration-500">
                      <span className="text-white font-black text-xl">{seller.storeName.charAt(0)}</span>
                    </div>
                    {editMode && onUpdateData ? (
                      <input
                        type="text"
                        value={seller.storeName}
                        onChange={(e) => onUpdateData('storeName', e.target.value)}
                        className="text-xl font-black tracking-tighter bg-transparent border-b-2 border-indigo-500 focus:outline-none text-gray-900"
                        style={{ color: customizations.headerTextColor || '#0f172a' }}
                      />
                    ) : (
                      <h1 className="text-xl font-black tracking-tighter text-gray-900" style={{ color: customizations.headerTextColor || '#0f172a' }}>
                        {seller.storeName}
                      </h1>
                    )}
                  </div>
                )}
              </div>

              <nav className="hidden lg:flex items-center space-x-10">
                {['home', 'shop', 'contact'].map((v) => (
                  <button 
                    key={v}
                    onClick={() => setView(v as View)} 
                    className="text-[11px] font-black uppercase tracking-[0.2em] transition-all relative px-4 py-2 rounded-xl group"
                    style={{ 
                      color: view === v ? '#ffffff' : (customizations.headerTextColor || '#64748b'),
                      backgroundColor: view === v ? themePrimary : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (view !== v) {
                        e.currentTarget.style.color = themePrimary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (view !== v) {
                        e.currentTarget.style.color = customizations.headerTextColor || '#64748b';
                      }
                    }}
                  >
                    {v === 'shop' ? 'Collection' : v}
                    {view !== v && (
                      <span 
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-1 rounded-full transition-all duration-500 w-0 opacity-0 group-hover:w-4 group-hover:opacity-100" 
                        style={{ backgroundColor: themePrimary }}
                      />
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-2xl">
                <button 
                  className="p-3 rounded-xl transition-all duration-300 relative group/cart-btn" 
                  style={{ color: customizations.headerTextColor || '#64748b' }}
                  onClick={() => setView('cart')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = themePrimary;
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = customizations.headerTextColor || '#64748b';
                  }}
                >
                  <ShoppingCart className="w-5 h-5 transition-transform group-hover/cart-btn:scale-110" />
                  {cart.length > 0 && (
                    <span 
                      className="absolute top-1.5 right-1.5 w-4 h-4 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm group-hover/cart-btn:scale-110 transition-transform"
                      style={{ backgroundColor: themePrimary === '#6366f1' ? '#f43f5e' : '#6366f1' }} // Alternating badge color
                    >
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </button>
                <button 
                  className={`p-3 rounded-xl transition-all duration-300 group/wish-btn ${
                    wishlist.length > 0 
                      ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' 
                      : ''
                  }`}
                  style={wishlist.length === 0 ? { color: customizations.headerTextColor || '#64748b' } : {}}
                  onClick={() => setView('shop')}
                  onMouseEnter={(e) => {
                    if (wishlist.length === 0) {
                      e.currentTarget.style.backgroundColor = themePrimary;
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (wishlist.length === 0) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = customizations.headerTextColor || '#64748b';
                    }
                  }}
                >
                  <Heart className={`w-5 h-5 transition-transform group-hover/wish-btn:scale-110 ${wishlist.length > 0 ? 'fill-current' : ''}`} />
                </button>
              </div>
              
              <button
                onClick={() => navigate(user ? (user.role === 'customer' ? '/customer/dashboard' : '/seller/dashboard') : `/login?shop=${seller.id}`)}
                className="px-8 py-3 bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-600 hover:shadow-indigo-100 hover:shadow-2xl transition-all duration-500 active:scale-95"
              >
                {user ? 'Dashboard' : 'Sign In'}
              </button>
            </div>
          </div>
        </header>
      )}

      {view !== 'checkout' && view !== 'order-success' && (
        <footer 
          className="border-t border-gray-100 pt-32 pb-20 px-6 lg:px-12 mt-32"
          style={{ 
            backgroundColor: customizations.footerBgColor || '#ffffff',
            color: customizations.footerTextColor || '#0f172a'
          }}
        >
          <div className="max-w-screen-2xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-20 pb-20 border-b border-gray-100">
              <div className="space-y-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl rotate-3">
                    <span className="text-white font-black text-2xl">{seller.storeName.charAt(0)}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tighter">{seller.storeName}</h2>
                    <p className="text-[9px] uppercase font-black tracking-[0.3em] text-indigo-600">Interface Pro</p>
                  </div>
                </div>

                {editMode && onUpdateData ? (
                  <textarea
                    value={seller.description || ''}
                    onChange={(e) => onUpdateData('description', e.target.value)}
                    rows={3}
                    className="w-full text-sm font-medium leading-relaxed bg-transparent border-b-2 border-indigo-500 focus:outline-none resize-none text-gray-500"
                  />
                ) : (
                  <p className="text-sm font-medium leading-relaxed text-gray-500 max-w-xs">
                    {seller.description || 'Redefining the digital shopping experience through modern aesthetics and seamless technology.'}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  {(seller.socialLinks && Object.entries(seller.socialLinks).map(([platform, link]) => {
                    if (!link || link.trim() === '') return null;
                    const Icon = platform === 'instagram' ? Instagram : platform === 'facebook' ? Facebook : platform === 'twitter' ? Twitter : platform === 'linkedin' ? Linkedin : platform === 'youtube' ? Youtube : platform === 'tiktok' ? Music2 : null;
                    if (!Icon) return null;
                    return (
                      <a key={platform} href={link} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-gray-100">
                        <Icon size={18} />
                      </a>
                    );
                  }))}
                </div>
              </div>

              <div>
                <h4 
                  className="text-[10px] font-black uppercase tracking-[0.2em] mb-10"
                  style={{ color: customizations.footerTextColor || '#94a3b8' }}
                >
                  Shop
                </h4>
                <ul className="space-y-4">
                  <li>
                    <button 
                      onClick={() => setView('shop')} 
                      className="text-sm font-bold transition-colors"
                      style={{ color: customizations.footerTextColor || '#0f172a' }}
                    >
                      Collection
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => setView('home')} 
                      className="text-sm font-bold transition-colors"
                      style={{ color: customizations.footerTextColor || '#0f172a' }}
                    >
                      Home
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => setView('contact')} 
                      className="text-sm font-bold transition-colors"
                      style={{ color: customizations.footerTextColor || '#0f172a' }}
                    >
                      Contact
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <h4 
                  className="text-[10px] font-black uppercase tracking-[0.2em] mb-10"
                  style={{ color: customizations.footerTextColor || '#94a3b8' }}
                >
                  Policies
                </h4>
                <ul className="space-y-4">
                  {seller.shippingPolicy && (
                    <li>
                      <button
                        onClick={() => { setPolicyPageData({ title: 'Shipping Policy', content: seller.shippingPolicy! }); setView('policy-page'); window.scrollTo(0, 0); }}
                        className="text-sm font-bold transition-colors"
                        style={{ color: customizations.footerTextColor || '#0f172a' }}
                      >
                        Shipping Policy
                      </button>
                    </li>
                  )}
                  {seller.privacyPolicy && (
                    <li>
                      <button
                        onClick={() => { setPolicyPageData({ title: 'Privacy Policy', content: seller.privacyPolicy! }); setView('policy-page'); window.scrollTo(0, 0); }}
                        className="text-sm font-bold transition-colors"
                        style={{ color: customizations.footerTextColor || '#0f172a' }}
                      >
                        Privacy Policy
                      </button>
                    </li>
                  )}
                  {seller.termsOfService && (
                    <li>
                      <button
                        onClick={() => { setPolicyPageData({ title: 'Terms of Service', content: seller.termsOfService! }); setView('policy-page'); window.scrollTo(0, 0); }}
                        className="text-sm font-bold transition-colors"
                        style={{ color: customizations.footerTextColor || '#0f172a' }}
                      >
                        Terms of Service
                      </button>
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <h4 
                  className="text-[10px] font-black uppercase tracking-[0.2em] mb-10"
                  style={{ color: customizations.footerTextColor || '#94a3b8' }}
                >
                  Contact
                </h4>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Mail size={18} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: customizations.footerTextColor || '#0f172a' }}>
                      {seller.contactInfo?.email || `hello@${seller.subdomain}.com`}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Phone size={18} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: customizations.footerTextColor || '#0f172a' }}>
                      {seller.contactInfo?.phone || '+1 (800) 555-0000'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                © {new Date().getFullYear()} {seller.storeName}. All rights reserved.
              </p>
              <div className="flex items-center gap-8">
                {['Visa', 'Mastercard', 'Apple Pay', 'PayPal'].map((p) => (
                  <span key={p} className="text-[10px] font-black uppercase tracking-widest text-gray-400">{p}</span>
                ))}
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Review Modal */}
      <Popup
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setReviewProduct(null);
          setReviewError(null);
        }}
        title={`Review ${reviewProduct?.name || selectedProduct?.name}`}
      >
        <form onSubmit={handleReviewSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                  className="transition-transform active:scale-90"
                >
                  <Star
                    size={24}
                    className={`${
                      star <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Your Name</label>
              <input
                required
                type="text"
                value={reviewForm.customerName}
                onChange={(e) => setReviewForm({ ...reviewForm, customerName: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-600"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</label>
              <div className="relative">
                <input
                  required
                  type="email"
                  value={reviewForm.customerEmail}
                  onChange={(e) => setReviewForm({ ...reviewForm, customerEmail: e.target.value })}
                  className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm focus:outline-none ${
                    reviewVerificationStatus === 'found' ? 'border-green-500' : 
                    reviewVerificationStatus === 'not-found' ? 'border-amber-500' : 'border-gray-100'
                  }`}
                  placeholder="john@example.com"
                />
                {isVerifyingEmail && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={14} className="animate-spin text-indigo-600" />
                  </div>
                )}
              </div>
              {reviewVerificationStatus === 'not-found' && (
                <p className="text-[9px] text-amber-600 font-bold uppercase tracking-widest leading-tight">
                  Note: Reviews are only public for verified purchasers.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Your Experience</label>
            <textarea
              required
              rows={4}
              value={reviewForm.comment}
              onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-600 resize-none"
              placeholder="Tell us what you think about this product..."
            />
          </div>

          {reviewError && (
            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
              <p className="text-xs text-red-600 font-bold leading-relaxed">{reviewError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={reviewSubmitting}
            className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all disabled:opacity-50 active:scale-95"
          >
            {reviewSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Publish Review'}
          </button>
        </form>
      </Popup>
    </div>
  );
};

export default ModernEcommerce;