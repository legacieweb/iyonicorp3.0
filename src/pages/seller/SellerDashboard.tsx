import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { formatPrice } from '../../utils/currency';
import { Card, CardHeader, Button, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Popup, ConfirmPopup, Input, Textarea, Select } from '../../components/ui';
import { MarketingSection } from '../../components/marketing';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Settings,
  LogOut,
  BarChart3,
  Store,
  ExternalLink,
  Briefcase,
  CheckCircle,
  Palette,
  Bot,
  Menu,
  X,
  Shield,
  FileText,
  Truck,
  RefreshCw,
  PlusCircle,
  Trash,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Music2,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  Send,
  MessageCircle,
  Check,
  Star,
  Clock,
  CreditCard as CreditCardIcon,
  Tag,
  Percent,
  Gift,
  Zap, 
  Globe, 
  Wallet, 
  Upload, 
  Image as ImageIcon, 
  Share2,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { Analytics, Seller, Message, Discount, Product, Category, DeliveryLocation, PaymentTerms, discountsAPI, productsAPI, categoriesAPI, uploadAPI, sellersAPI, refundsAPI } from '../../services/api';

const PRODUCT_THEMES = [
  { id: 'modern-ecommerce', name: 'Modern E-commerce', preview: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=400', description: 'Clean and minimal design for product stores. Perfect for fashion and retail.', tags: ['Minimal', 'Clean', 'White'], color: 'from-blue-500 to-cyan-500' },
  { id: 'luxury-boutique', name: 'Luxury Boutique', preview: 'https://images.unsplash.com/photo-1441984908747-5c39bbce50e6?auto=format&fit=crop&q=80&w=400', description: 'Elegant dark theme with gold accents. Sophisticated and premium feel.', tags: ['Dark', 'Luxury', 'Gold'], color: 'from-amber-500 to-yellow-500' },
  { id: 'beauty-store', name: 'Beauty Store', preview: 'https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?auto=format&fit=crop&q=80&w=400', description: 'Soft and modern aesthetics for beauty and skincare brands. Elegant and fresh.', tags: ['Beauty', 'Modern', 'Pink'], color: 'from-pink-400 to-rose-400' },
  { id: 'shoe-store', name: 'Shoe Store', preview: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400', description: 'Bold and urban design for footwear brands. Performance meets lifestyle.', tags: ['Shoes', 'Urban', 'Bold'], color: 'from-orange-500 to-red-600' },
  { id: 'jewelry-store', name: 'Jewelry Store', preview: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=400', description: 'Elegant and modern theme for fine jewelry. Timeless and sophisticated.', tags: ['Luxury', 'Elegant', 'Gold'], color: 'from-yellow-600 to-amber-700' },
  { id: 'bakery-store', name: 'Bakery Store', preview: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400', description: 'Warm and artisanal theme for bakeries and cafes. Cozy and fresh.', tags: ['Artisanal', 'Bakery', 'Warm'], color: 'from-orange-400 to-yellow-600' },
  { id: 'couture-store', name: 'Couture Store', preview: 'https://images.unsplash.com/photo-1539109132314-d4a8c62e41dc?auto=format&fit=crop&q=80&w=400', description: 'High-fashion minimalist theme for couture and designer labels.', tags: ['Fashion', 'Minimalist', 'Couture'], color: 'from-gray-700 to-black' },
];

const SERVICE_THEMES = [
  { id: 'elite-consulting', name: 'Elite Consulting', preview: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=400', description: 'Corporate and professional theme for consulting and business services.', tags: ['Corporate', 'Consulting', 'Blue'], color: 'from-blue-700 to-indigo-900' },
  { id: 'creative-studio', name: 'Creative Studio', preview: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=400', description: 'Bold and minimalist theme for creative agencies and studios.', tags: ['Creative', 'Bold', 'Modern'], color: 'from-pink-500 to-yellow-500' },
  { id: 'modern-wellness', name: 'Modern Wellness', preview: 'https://images.unsplash.com/photo-1545208393-216c7addb00c?auto=format&fit=crop&q=80&w=400', description: 'Serene and holistic theme for wellness and health practices.', tags: ['Wellness', 'Serene', 'Green'], color: 'from-emerald-700 to-teal-900' },
];

const STREAMING_THEMES: any[] = [];

const PAYMENT_THEMES: any[] = [];

type TabType = 'overview' | 'products' | 'orders' | 'customers' | 'analytics' | 'themes' | 'settings' | 'messages' | 'reviews' | 'billing' | 'discounts' | 'refunds' | 'marketing';

const WebPreview = ({ id }: { id: string }) => {
  const url = `${window.location.origin}/#/shop/demo?theme=${id}&preview=true`;
  return (
    <div className="w-full h-full relative group overflow-hidden bg-gray-100">
      <iframe 
        src={url} 
        className="w-[1200px] h-[900px] border-none origin-top-left scale-[0.3333] pointer-events-none absolute top-0 left-0"
        title={id}
        loading="lazy"
      />
      <div className="absolute inset-0 bg-transparent z-10"></div>
    </div>
  );
};

const BillingSection = ({ seller, onUpgrade }: { seller: any, onUpgrade: (plan: string) => void }) => {
  const { sellerManagers, products } = useData();
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number }>({ days: 0, hours: 0, minutes: 0 });
  const subscription = seller?.subscription || { plan: 'starter', status: 'active', endDate: null };
  
  const manager = sellerManagers[0];
  const pricingConfig = manager?.pricingConfig;
  
  useEffect(() => {
    if (!subscription.endDate) return;
    
    const calculateTime = () => {
      const difference = new Date(subscription.endDate).getTime() - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60)
        });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 60000);
    return () => clearInterval(timer);
  }, [subscription.endDate]);

  const isEnterpriseManager = manager?.subscription?.plan === 'enterprise';
  const isProfessionalManager = manager?.subscription?.plan === 'professional';
  
  const hasFreeProfessionalSlot = isEnterpriseManager && (manager?.stats?.totalSellers || 0) < 6;
  const hasFreeBasicSlot = isProfessionalManager && (manager?.stats?.totalSellers || 0) < 4;

  const tiers = pricingConfig ? [
    { id: 'starter', name: 'Starter', price: pricingConfig.plans.starter.price, limit: pricingConfig.plans.starter.productLimit || 20, features: ['20 Products Limit', 'IyonicPay Integration Only', '7% Transaction Commission', 'Basic IyonicBots Access'] },
    { id: 'basic', name: 'Basic', price: hasFreeBasicSlot ? 0 : (pricingConfig.plans.basic?.price || 15), limit: pricingConfig.plans.basic?.productLimit || 100, features: ['100 Products Limit', 'Custom Payment Gateways', 'Advanced AI Analytics', 'Standard Templates', 'Priority Support'] },
    { id: 'professional', name: 'Professional', price: hasFreeProfessionalSlot ? 0 : pricingConfig.plans.professional.price, limit: pricingConfig.plans.professional.productLimit || Infinity, features: pricingConfig.plans.professional.features },
    { id: 'enterprise', name: 'Enterprise', price: pricingConfig.plans.enterprise.price, limit: pricingConfig.plans.enterprise.productLimit || Infinity, features: pricingConfig.plans.enterprise.features }
  ] : [
    { id: 'starter', name: 'Starter', price: 0, limit: 20, features: ['20 Products Limit', 'IyonicPay Integration Only', '7% Transaction Commission', 'Basic IyonicBots Access'] },
    { id: 'basic', name: 'Basic', price: hasFreeBasicSlot ? 0 : 15, limit: 100, features: ['100 Products Limit', 'Custom Payment Gateways', 'Advanced AI Analytics', 'Standard Templates', 'Priority Support'] },
    { id: 'professional', name: 'Professional', price: hasFreeProfessionalSlot ? 0 : 29, limit: Infinity, features: ['Unlimited Products & Services', 'Custom Domain (.com/.net)', 'Advanced AI SEO Tools', 'Zero Transaction Fees', 'IyonicBot Assistant (Basic)'] },
    { id: 'enterprise', name: 'Enterprise', price: 99, limit: Infinity, features: ['Full AI Shop Automation', 'Priority 24/7 Support', 'Custom API Access', 'Multi-staff Accounts', 'Advanced Fraud Protection', 'Dedicated Account Manager'] }
  ];

  const currentTier = tiers.find(t => t.id === subscription.plan) || tiers[0];
  const productCount = products.length;
  const usagePercentage = currentTier.limit === Infinity ? 0 : (productCount / currentTier.limit) * 100;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="flex-1 bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-indigo-100 text-sm font-bold uppercase tracking-wider mb-1">Current Plan</p>
              <h3 className="text-3xl font-black capitalize">{subscription.plan}</h3>
            </div>
            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md">
              {subscription.status.toUpperCase()}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-indigo-100 font-medium">Expires in</p>
                <p className="font-bold">
                  {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
                </p>
              </div>
            </div>
            
            <div className="pt-4">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-indigo-100 font-medium">Usage: {productCount} / {currentTier.limit === Infinity ? '∞' : currentTier.limit} products</span>
                <span className="font-bold">{Math.min(Math.round(usagePercentage), 100)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-white transition-all duration-500 ${usagePercentage >= 90 ? 'bg-red-400' : ''}`} 
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="md:w-1/3">
          <CardHeader title="Quick Actions" />
          <div className="space-y-3">
            <Button className="w-full justify-start" variant="outline" leftIcon={<CreditCardIcon className="w-4 h-4" />}>
              Billing History
            </Button>
            <Button className="w-full justify-start" variant="outline" leftIcon={<Settings className="w-4 h-4" />}>
              Payment Methods
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <Card key={tier.id} className={`relative flex flex-col ${subscription.plan === tier.id ? 'border-indigo-600 ring-1 ring-indigo-600' : ''}`}>
            {subscription.plan === tier.id && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Current Plan
              </div>
            )}
            <div className="mb-6">
              <h4 className="text-xl font-black text-gray-900 mb-1">{tier.name}</h4>
              <div className="flex items-baseline">
                <span className="text-3xl font-black text-gray-900">${tier.price}</span>
                <span className="text-gray-500 text-sm ml-1">/month</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {tier.features.map((f, i) => (
                <li key={i} className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button 
              className="w-full" 
              variant={subscription.plan === tier.id ? 'outline' : 'primary'}
              disabled={subscription.plan === tier.id}
              onClick={() => onUpgrade(tier.id)}
            >
              {subscription.plan === tier.id ? 'Current Plan' : (tier.price === 0 ? 'Downgrade' : 'Upgrade Plan')}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

const DiscountsSection = ({ 
  seller, 
  products, 
  discounts,
  addDiscount,
  updateDiscount,
  deleteDiscount,
  refreshData 
}: { 
  seller: Seller, 
  products: Product[], 
  discounts: Discount[],
  addDiscount: (discount: Partial<Discount>) => Promise<void>,
  updateDiscount: (id: string, updates: Partial<Discount>) => Promise<void>,
  deleteDiscount: (id: string) => Promise<void>,
  refreshData: () => Promise<void> 
}) => {
  const { showToast } = useToast();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);

  const [form, setForm] = useState<Partial<Discount>>({
    name: '',
    description: '',
    type: 'percentage',
    value: 0,
    appliesTo: 'all_products',
    status: 'active',
    startDate: new Date().toISOString().split('T')[0],
    usageCount: 0,
    code: '',
    minSpend: 0,
    minQuantity: 0,
    productIds: [],
    crossDiscount: {
      requiredProductIds: [],
      rewardProductIds: [],
      discountType: 'percentage',
      discountValue: 0
    },
    buyXGetY: {
      buyQuantity: 1,
      buyProductIds: [],
      getQuantity: 1,
      getProductIds: [],
      discountType: 'free'
    }
  });

  const handleOpenPopup = (discount?: Discount) => {
    if (discount) {
      setEditingDiscount(discount);
      setForm({
        ...discount,
        startDate: discount.startDate.split('T')[0],
        endDate: discount.endDate ? discount.endDate.split('T')[0] : '',
      });
    } else {
      setEditingDiscount(null);
      setForm({
        name: '',
        description: '',
        type: 'percentage',
        value: 0,
        appliesTo: 'all_products',
        status: 'active',
        startDate: new Date().toISOString().split('T')[0],
        usageCount: 0,
        code: '',
        minSpend: 0,
        minQuantity: 0,
        productIds: [],
        crossDiscount: {
          requiredProductIds: [],
          rewardProductIds: [],
          discountType: 'percentage',
          discountValue: 0
        },
        buyXGetY: {
          buyQuantity: 1,
          buyProductIds: [],
          getQuantity: 1,
          getProductIds: [],
          discountType: 'free'
        }
      });
    }
    setIsPopupOpen(true);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteDiscount(id);
      await refreshData();
      showToast('Discount deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting discount:', error);
      showToast('Failed to delete discount', 'error');
    } finally {
      setIsDeleting(null);
      setConfirmDeleteId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingDiscount) {
        await updateDiscount(editingDiscount.id, form);
        showToast('Discount updated successfully', 'success');
      } else {
        await addDiscount({ ...form, sellerId: seller.id });
        showToast('Discount created successfully', 'success');
      }
      await refreshData();
      setIsPopupOpen(false);
    } catch (error) {
      console.error('Error saving discount:', error);
      showToast('Failed to save discount', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Discounts & Coupons</h2>
          <p className="text-gray-500 font-medium">Create and manage discounts for your products.</p>
        </div>
        <Button onClick={() => handleOpenPopup()} className="bg-blue-600 hover:bg-blue-700 font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-200 transition-all">
          <Plus className="w-5 h-5 mr-2" />
          Create Discount
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Tag className="w-6 h-6" />
            </div>
            <Badge className="bg-white/20 text-white border-white/30">Total Active</Badge>
          </div>
          <h3 className="text-3xl font-black">{discounts.filter(d => d.status === 'active').length}</h3>
          <p className="text-blue-100 font-medium text-sm">Active discounts & coupons</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <Badge className="bg-white/20 text-white border-white/30">Usage</Badge>
          </div>
          <h3 className="text-3xl font-black">{discounts.reduce((acc, d) => acc + (d.usageCount || 0), 0)}</h3>
          <p className="text-emerald-100 font-medium text-sm">Times discounts applied</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500 to-violet-600 text-white border-none shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <Badge className="bg-white/20 text-white border-white/30">Performance</Badge>
          </div>
          <h3 className="text-3xl font-black">+{discounts.filter(d => d.type === 'percentage').reduce((max, d) => Math.max(max, d.value), 0)}%</h3>
          <p className="text-purple-100 font-medium text-sm">Sales lift from discounts</p>
        </Card>
      </div>

      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Discount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Tag className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-1">No discounts yet</h4>
                    <p className="text-gray-500 max-w-xs mx-auto">Create your first coupon or automatic discount to boost your sales.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              discounts.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-xl ${discount.code ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                        {discount.code ? <Tag className="w-5 h-5" /> : <Percent className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{discount.name}</p>
                        {discount.code && <p className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded-lg text-gray-600 mt-1 inline-block border border-gray-200">{discount.code}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={discount.status === 'active' ? 'success' : discount.status === 'expired' ? 'danger' : 'warning'}>
                      {discount.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold text-gray-700 capitalize">
                      {discount.type.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-gray-900">{discount.usageCount || 0}</span>
                      {discount.usageLimit && <span className="text-gray-400 text-xs">/ {discount.usageLimit} limit</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-gray-700">{new Date(discount.startDate).toLocaleDateString()}</p>
                      {discount.endDate ? (
                        <p className="text-[10px] text-gray-400 uppercase tracking-tighter font-black">Ends {new Date(discount.endDate).toLocaleDateString()}</p>
                      ) : (
                        <p className="text-[10px] text-emerald-500 uppercase tracking-tighter font-black">No expiry</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenPopup(discount)} className="hover:bg-blue-50 hover:text-blue-600">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => setConfirmDeleteId(discount.id)}
                        disabled={isDeleting === discount.id}
                      >
                        {isDeleting === discount.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Popup */}
      <Popup 
        isOpen={isPopupOpen} 
        onClose={() => setIsPopupOpen(false)} 
        title={editingDiscount ? 'Edit Discount' : 'Create New Discount'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-black uppercase tracking-widest text-gray-400 mb-2">Discount Name</label>
              <Input 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="e.g. Summer Flash Sale 20% Off"
                className="text-lg font-bold py-6 rounded-2xl"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-black uppercase tracking-widest text-gray-400">Coupon Code</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input 
                  value={form.code} 
                  onChange={e => setForm({...form, code: e.target.value.toUpperCase().replace(/\s/g, '')})}
                  placeholder="SUMMER20"
                  className="pl-12 font-mono uppercase font-black"
                />
              </div>
              <p className="text-[10px] text-blue-600 font-bold italic">Optional: Leave blank for automatic application.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-black uppercase tracking-widest text-gray-400">Discount Type</label>
              <Select 
                value={form.type} 
                onChange={e => setForm({...form, type: e.target.value as any})}
                className="font-bold"
                options={[
                  { value: 'percentage', label: 'Percentage (%)' },
                  { value: 'fixed_amount', label: `Fixed Amount (${seller.currency})` },
                  { value: 'buy_x_get_y', label: 'Buy X Get Y (BOGO)' },
                  { value: 'free_shipping', label: 'Free Shipping' },
                  { value: 'cross_discount', label: 'Cross Discount (A+B get C)' }
                ]}
              />
            </div>

            {(form.type === 'percentage' || form.type === 'fixed_amount') && (
              <div className="md:col-span-2 p-6 bg-blue-50 rounded-[2rem] border border-blue-100">
                <label className="block text-sm font-black uppercase tracking-widest text-blue-600 mb-4">
                  {form.type === 'percentage' ? 'Percentage Value' : 'Discount Amount'}
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-blue-600 text-xl">
                      {form.type === 'percentage' ? '%' : seller.currency}
                    </span>
                    <Input 
                      type="number"
                      value={form.value} 
                      onChange={e => setForm({...form, value: parseFloat(e.target.value) || 0})}
                      min="0"
                      step="1"
                      className="pl-12 text-2xl font-black rounded-xl border-blue-200 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="text-sm font-bold text-blue-400 max-w-[200px]">
                    {form.type === 'percentage' 
                      ? 'Discount will be calculated based on item price.' 
                      : `A flat ${seller.currency}${form.value} will be deducted from the total.`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {form.type === 'buy_x_get_y' && (
            <div className="p-8 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-[2.5rem] space-y-6 border border-purple-100 shadow-inner">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-200">
                  <Gift className="w-6 h-6" />
                </div>
                <h4 className="font-black text-lg text-purple-900">BOGO Configuration</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="block text-xs font-black uppercase tracking-widest text-purple-400">Customer Buys</label>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="number"
                      value={form.buyXGetY?.buyQuantity}
                      onChange={e => setForm({...form, buyXGetY: {...(form.buyXGetY || {} as any), buyQuantity: parseInt(e.target.value)}})}
                      className="w-24 text-center font-black text-xl rounded-xl"
                    />
                    <span className="font-bold text-purple-900">items from</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 bg-white p-3 rounded-2xl border border-purple-100">
                    {products.map(p => (
                      <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-purple-50 rounded-xl cursor-pointer transition-all group">
                        <input 
                          type="checkbox"
                          checked={form.buyXGetY?.buyProductIds?.includes(p.id)}
                          onChange={e => {
                            const ids = form.buyXGetY?.buyProductIds || [];
                            const nextIds = e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id);
                            setForm({...form, buyXGetY: {...(form.buyXGetY || {} as any), buyProductIds: nextIds}});
                          }}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span className="text-sm font-bold text-gray-700 group-hover:text-purple-600">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-black uppercase tracking-widest text-purple-400">Customer Gets</label>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="number"
                      value={form.buyXGetY?.getQuantity}
                      onChange={e => setForm({...form, buyXGetY: {...(form.buyXGetY || {} as any), getQuantity: parseInt(e.target.value)}})}
                      className="w-24 text-center font-black text-xl rounded-xl"
                    />
                    <span className="font-bold text-purple-900">items at</span>
                    <Select
                      value={form.buyXGetY?.discountType}
                      onChange={e => setForm({...form, buyXGetY: {...(form.buyXGetY || {} as any), discountType: e.target.value as any}})}
                      className="flex-1 font-black"
                      options={[
                        { value: 'free', label: '100% OFF (Free)' },
                        { value: 'percentage', label: 'Percentage Off' }
                      ]}
                    />
                  </div>
                  <p className="text-[10px] text-purple-500 font-bold italic">The reward will be applied to the cheapest item.</p>
                </div>
              </div>
            </div>
          )}

          {form.type === 'cross_discount' && (
            <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2.5rem] space-y-6 border border-blue-100 shadow-inner">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <Zap className="w-6 h-6" />
                </div>
                <h4 className="font-black text-lg text-blue-900">Cross Discount (A+B get C)</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="block text-xs font-black uppercase tracking-widest text-blue-400">Required Bundle (Buy All)</label>
                  <div className="max-h-48 overflow-y-auto space-y-1 bg-white p-3 rounded-2xl border border-blue-100">
                    {products.map(p => (
                      <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded-xl cursor-pointer transition-all group">
                        <input 
                          type="checkbox"
                          checked={form.crossDiscount?.requiredProductIds?.includes(p.id)}
                          onChange={e => {
                            const ids = form.crossDiscount?.requiredProductIds || [];
                            const nextIds = e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id);
                            setForm({...form, crossDiscount: {...(form.crossDiscount || {} as any), requiredProductIds: nextIds}});
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-black uppercase tracking-widest text-blue-400">Reward Product (Get this Discounted)</label>
                  <Select
                    onChange={e => setForm({...form, crossDiscount: {...(form.crossDiscount || {} as any), rewardProductIds: [e.target.value]}})}
                    className="font-black py-4 rounded-xl"
                    options={[
                      { value: '', label: 'Select product...' },
                      ...products.map(p => ({ value: p.id, label: p.name }))
                    ]}
                  />
                  
                  <div className="p-4 bg-white rounded-2xl border border-blue-50">
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Discount for Reward Item</label>
                    <div className="flex items-center gap-3">
                      <Input 
                        type="number"
                        placeholder="Val"
                        value={form.crossDiscount?.discountValue}
                        onChange={e => setForm({...form, crossDiscount: {...(form.crossDiscount || {} as any), discountValue: parseFloat(e.target.value)}})}
                        className="w-20 font-black text-center"
                      />
                      <Select
                        value={form.crossDiscount?.discountType}
                        onChange={e => setForm({...form, crossDiscount: {...(form.crossDiscount || {} as any), discountType: e.target.value as any}})}
                        className="flex-1 font-bold text-sm"
                        options={[
                          { value: 'percentage', label: '% Off' },
                          { value: 'fixed_amount', label: `${seller.currency} Off` },
                          { value: 'free', label: 'Free' }
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-2">Availability & Eligibility</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Applies To</label>
                <Select 
                  value={form.appliesTo} 
                  onChange={e => setForm({...form, appliesTo: e.target.value as any})}
                  className="font-bold"
                  options={[
                    { value: 'all_products', label: 'All Products' },
                    { value: 'specific_products', label: 'Specific Products' },
                    { value: 'specific_categories', label: 'Specific Categories' }
                  ]}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Usage Limit</label>
                <Input 
                  type="number"
                  placeholder="Unlimited"
                  value={form.usageLimit}
                  onChange={e => setForm({...form, usageLimit: parseInt(e.target.value)})}
                  className="font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Minimum Spend ({seller.currency})</label>
                <Input 
                  type="number"
                  placeholder="0.00"
                  value={form.minSpend}
                  onChange={e => setForm({...form, minSpend: parseFloat(e.target.value)})}
                  className="font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Minimum Quantity</label>
                <Input 
                  type="number"
                  placeholder="None"
                  value={form.minQuantity}
                  onChange={e => setForm({...form, minQuantity: parseInt(e.target.value)})}
                  className="font-bold"
                />
              </div>

              {form.appliesTo === 'specific_products' && (
                <div className="md:col-span-2">
                   <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                    {products.map(p => (
                      <label key={p.id} className="flex items-center gap-3 p-2.5 bg-white rounded-xl cursor-pointer hover:border-blue-500 border border-transparent transition-all shadow-sm">
                        <input 
                          type="checkbox"
                          checked={form.productIds?.includes(p.id)}
                          onChange={e => {
                            const ids = form.productIds || [];
                            const nextIds = e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id);
                            setForm({...form, productIds: nextIds});
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-xs font-bold text-gray-700 truncate">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Start Date</label>
                <Input 
                  type="date"
                  value={form.startDate} 
                  onChange={e => setForm({...form, startDate: e.target.value})}
                  className="font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">End Date (Optional)</label>
                <Input 
                  type="date"
                  value={form.endDate} 
                  onChange={e => setForm({...form, endDate: e.target.value})}
                  className="font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-8 border-t border-gray-100">
            <Button variant="ghost" type="button" onClick={() => setIsPopupOpen(false)} disabled={isSaving} className="font-bold px-8 rounded-xl h-14">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-black px-12 rounded-xl shadow-xl shadow-blue-200 h-14 transition-all" disabled={isSaving}>
              {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : (editingDiscount ? 'Update Discount' : 'Launch Discount')}
            </Button>
          </div>
        </form>
      </Popup>

      <ConfirmPopup
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => { if (confirmDeleteId) handleDelete(confirmDeleteId); }}
        title="Delete Discount"
        message="Are you sure you want to delete this discount? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

const RefundsSection = ({ refreshData }: { refreshData: () => Promise<void> }) => {
  const { showToast } = useToast();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const data = await refundsAPI.getAll();
      setRefunds(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch refunds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id);
    try {
      await refundsAPI.updateStatus(id, action);
      await fetchRefunds();
      await refreshData();
      showToast(`Refund request ${action}ed successfully.`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || `Failed to ${action} refund`, 'error');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-10 text-center lg:text-left">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Refund Requests</h2>
        <p className="text-slate-500 font-medium text-lg">Manage and process customer refund requests.</p>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 border-b border-slate-100">
                <TableHead className="py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] pl-8">Order ID</TableHead>
                <TableHead className="py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Customer</TableHead>
                <TableHead className="py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Amount</TableHead>
                <TableHead className="py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Reason</TableHead>
                <TableHead className="py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Status</TableHead>
                <TableHead className="py-5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] pr-8 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-20 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : refunds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-20 text-center">
                    <RotateCcw className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No refund requests found</p>
                  </TableCell>
                </TableRow>
              ) : (
                refunds.map((refund) => (
                  <TableRow key={refund.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0 group">
                    <TableCell className="py-6 pl-8">
                      <p className="font-mono text-sm text-slate-600">#{refund.orderId?.slice(0, 8) || refund.invoiceId?.slice(0, 8)}...</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        {new Date(refund.createdAt).toLocaleDateString()}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {(refund.customerName || 'C').charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{refund.customerName || 'Guest Customer'}</p>
                          <p className="text-xs text-slate-500">{refund.customerEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-black text-slate-900">{formatPrice(refund.amount, refund.currency)}</p>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm text-slate-500 truncate" title={refund.reason}>
                        {refund.reason}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={refund.status === 'pending' ? 'warning' : refund.status === 'approved' ? 'success' : 'danger'}>
                        {refund.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      {refund.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="sm" 
                            variant="primary" 
                            className="bg-slate-900 hover:bg-blue-600"
                            onClick={() => handleAction(refund.id, 'approve')}
                            disabled={processing === refund.id}
                            loading={processing === refund.id}
                          >
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 hover:border-red-100"
                            onClick={() => handleAction(refund.id, 'reject')}
                            disabled={processing === refund.id}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Processed</p>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-sm">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
    </div>
  );
};

export const SellerDashboard: React.FC = () => {
  const { showToast } = useToast();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { 
    products, orders, customers, sellers, 
    addProduct, updateProduct, deleteProduct, 
    updateOrderStatus, getAnalytics, updateSeller, 
    refreshData, messages, markMessageRead, deleteMessage,
    reviews, getSellerReviews, sellerManagers,
    discounts, addDiscount, updateDiscount, deleteDiscount
  } = useData();
  const { refreshTenant } = useTenant();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isPayPopupOpen, setIsPayPopupOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProductPopupOpen, setIsProductPopupOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<string | null>(null);
  const [confirmDeleteMessageId, setConfirmDeleteMessageId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isMessagePopupOpen, setIsMessagePopupOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customCategory, setCustomCategory] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '0',
    status: 'active' as 'active' | 'draft' | 'archived',
    type: 'product' as 'product' | 'service' | 'payment',
    images: '',
    videos: '',
    urls: ''
  });

  const [settingsForm, setSettingsForm] = useState({
    storeName: '',
    description: '',
    logo: '',
    subdomain: '',
    shippingPolicy: '',
    returnPolicy: '',
    privacyPolicy: '',
    termsOfService: '',
    currency: 'USD',
    additionalPages: [] as { title: string; content: string }[],
    socialLinks: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: '',
      tiktok: ''
    },
    contactInfo: {
      email: '',
      phone: '',
      address: '',
      whatsapp: ''
    },
    themeId: '',
    theme: {
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      fontFamily: 'Inter'
    },
    paymentGateways: {
      active: 'iyonicpay',
      iyonicpay: { enabled: true },
      custom: { enabled: false, provider: '', apiKey: '', publicKey: '', link: '' }
    },
    deliveryLocations: [] as DeliveryLocation[],
    paymentTerms: {
      methods: ['site'],
      depositPercentage: 50,
      rules: 'all'
    } as PaymentTerms
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<string | null>(null);
  const [newLocation, setNewLocation] = useState({
    type: 'country' as 'country' | 'state' | 'subcounty' | 'custom',
    name: '',
    fee: 0,
    deliveryPeriod: '',
    parentId: ''
  });

  const seller = sellers.find(s => s.id === user?.sellerId);
  const sellerId = user?.sellerId;
  const isServiceShop = seller?.shopType === 'service';
  const isPaymentShop = seller?.shopType === 'payment';

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-5 h-5" /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'customers', label: 'Customers', icon: <Users className="w-5 h-5" /> },
    { id: 'marketing', label: 'Marketing', icon: <Share2 className="w-5 h-5" /> },
    { id: 'discounts', label: 'Discounts', icon: <Tag className="w-5 h-5" /> },
    { id: 'refunds', label: 'Refunds', icon: <RotateCcw className="w-5 h-5" /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'reviews', label: 'Reviews', icon: <MessageCircle className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'billing', label: 'Billing', icon: <CreditCardIcon className="w-5 h-5" /> },
    { id: 'themes', label: 'Themes', icon: <Palette className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  useEffect(() => {
    if (sellerId) {
      getAnalytics(sellerId).then(setAnalytics);
      fetchCategories();
    }
  }, [sellerId, getAnalytics, products, orders]);

  const fetchCategories = async () => {
    try {
      const data = await categoriesAPI.getAll();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    if (seller) {
      if (productForm.type !== seller.shopType) {
        setProductForm(prev => ({ ...prev, type: seller.shopType }));
      }
      setSettingsForm({
        storeName: seller.storeName || '',
        description: seller.description || '',
        logo: seller.logo || '',
        subdomain: seller.subdomain || '',
        shippingPolicy: seller.shippingPolicy || '',
        returnPolicy: seller.returnPolicy || '',
        privacyPolicy: seller.privacyPolicy || '',
        termsOfService: seller.termsOfService || '',
        currency: seller.currency || 'USD',
        additionalPages: seller.additionalPages || [],
        socialLinks: {
          facebook: seller.socialLinks?.facebook || '',
          instagram: seller.socialLinks?.instagram || '',
          twitter: seller.socialLinks?.twitter || '',
          linkedin: seller.socialLinks?.linkedin || '',
          youtube: seller.socialLinks?.youtube || '',
          tiktok: seller.socialLinks?.tiktok || ''
        },
        contactInfo: {
          email: seller.contactInfo?.email || '',
          phone: seller.contactInfo?.phone || '',
          address: seller.contactInfo?.address || '',
          whatsapp: seller.contactInfo?.whatsapp || ''
        },
        themeId: seller.themeId || '',
        theme: seller.theme || {
          primaryColor: '#3b82f6',
          secondaryColor: '#1e40af',
          fontFamily: 'Inter'
        },
        paymentGateways: {
          active: seller.paymentGateways?.active || 'iyonicpay',
          iyonicpay: { 
            enabled: seller.paymentGateways?.iyonicpay?.enabled ?? true 
          },
          custom: { 
            enabled: seller.paymentGateways?.custom?.enabled ?? false,
            provider: seller.paymentGateways?.custom?.provider || '',
            apiKey: seller.paymentGateways?.custom?.apiKey || '',
            publicKey: seller.paymentGateways?.custom?.publicKey || '',
            link: seller.paymentGateways?.custom?.link || ''
          }
        },
        deliveryLocations: seller.deliveryLocations || [],
        paymentTerms: seller.paymentTerms || {
          methods: ['site'],
          depositPercentage: 50,
          rules: 'all'
        }
      });
    }
  }, [seller]);

  const sellerProducts = products.filter(p => p.sellerId === sellerId);
  const sellerOrders = orders.filter(o => o.sellerId === sellerId);
  const sellerCustomers = customers.filter(c => c.sellerId === sellerId);

  const handleAddProduct = async () => {
    if (!sellerId) return;

    // Feature limiting logic
    const subscription = seller?.subscription || { plan: 'starter', status: 'active', endDate: null };
    const manager = sellerManagers[0];
    const pricingConfig = manager?.pricingConfig;
    
    const tiers = pricingConfig ? [
      { id: 'starter', limit: pricingConfig.plans.starter.productLimit || 20 },
      { id: 'basic', limit: pricingConfig.plans.basic?.productLimit || 100 },
      { id: 'professional', limit: pricingConfig.plans.professional.productLimit || Infinity },
      { id: 'enterprise', limit: pricingConfig.plans.enterprise.productLimit || Infinity }
    ] : [
      { id: 'starter', limit: 20 },
      { id: 'basic', limit: 100 },
      { id: 'professional', limit: Infinity },
      { id: 'enterprise', limit: Infinity }
    ];
    const currentTier = tiers.find(t => t.id === subscription.plan) || tiers[0];
    const productCount = products.filter(p => p.sellerId === sellerId).length;

    // Check expiration
    const isExpired = subscription.endDate && new Date(subscription.endDate) < new Date();
    
    if (isExpired && subscription.plan !== 'starter') {
      showToast('Your subscription has expired. Please renew to add or edit products.', 'error');
      setActiveTab('billing');
      return;
    }

    if (!editingProduct && productCount >= currentTier.limit) {
      showToast(`You have reached the product limit for the ${subscription.plan} plan (${currentTier.limit} products). Please upgrade to add more.`, 'warning');
      setActiveTab('billing');
      return;
    }

    setIsUploading(true);
    try {
      let finalImages = productForm.images ? productForm.images.split(',').map(i => i.trim()) : [];
      let finalVideos = productForm.videos ? productForm.videos.split(',').map(v => v.trim()) : [];

      // Handle file uploads
      if (imageFiles.length > 0) {
        const uploadedImageUrls = await uploadAPI.upload(imageFiles);
        finalImages = [...finalImages, ...uploadedImageUrls];
      }
      if (videoFiles.length > 0) {
        const uploadedVideoUrls = await uploadAPI.upload(videoFiles);
        finalVideos = [...finalVideos, ...uploadedVideoUrls];
      }

      if (finalImages.length === 0) {
        finalImages = ['/placeholder-product.jpg'];
      }

      let finalCategory = productForm.category;
      if (productForm.category === 'custom' && customCategory) {
        const newCat = await categoriesAPI.create(customCategory);
        finalCategory = newCat.name;
        fetchCategories(); // Refresh categories list
      }
      
      const productData = {
        sellerId,
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        category: finalCategory,
        images: finalImages,
        videos: finalVideos,
        urls: productForm.urls ? productForm.urls.split(',').map(u => u.trim()) : [],
        stock: parseInt(productForm.stock),
        status: productForm.status,
        type: productForm.type
      };

      if (editingProduct) {
        await updateProduct(editingProduct, productData);
        showToast('Product updated successfully', 'success');
      } else {
        await addProduct(productData);
        showToast('Product added successfully', 'success');
      }

      setIsProductPopupOpen(false);
      setEditingProduct(null);
      setImageFiles([]);
      setVideoFiles([]);
      setCustomCategory('');
      setProductForm({ 
        name: '', 
        description: '', 
        price: '', 
        category: '', 
        stock: '0', 
        status: 'active',
        type: seller?.shopType || 'product',
        images: '',
        videos: '',
        urls: ''
      });
    } catch (err) {
      console.error('Failed to add product:', err);
      showToast('Failed to save product. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product.id);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      stock: product.stock.toString(),
      status: product.status,
      type: product.type,
      images: product.images.join(', '),
      videos: product.videos.join(', '),
      urls: product.urls.join(', ')
    });
    setIsProductPopupOpen(true);
  };

  const handlePayment = async (planId: string) => {
    if (!sellerId || !planId || !user?.email) return;
    
    setIsProcessingPayment(true);
    
    const manager = sellerManagers[0];
    const pricingConfig = manager?.pricingConfig;

    const pricing = pricingConfig ? [
      { id: 'starter', price: pricingConfig.plans.starter.price },
      { id: 'basic', price: pricingConfig.plans.basic?.price || 15 },
      { id: 'professional', price: pricingConfig.plans.professional.price },
      { id: 'enterprise', price: pricingConfig.plans.enterprise.price }
    ] : [
      { id: 'starter', price: 0 },
      { id: 'basic', price: 15 },
      { id: 'professional', price: 29 },
      { id: 'enterprise', price: 99 }
    ];
    const plan = pricing.find(p => p.id === planId);
    
    if (!plan || plan.price === 0) {
      try {
        await updateSeller(sellerId, {
          subscription: {
            plan: planId as any,
            status: 'active',
            startDate: new Date().toISOString(),
            endDate: null
          }
        });
        await refreshData();
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessingPayment(false);
      }
      return;
    }

    try {
      const handler = (window as any).PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: plan.price * 100, // Amount in USD cents
        currency: 'USD',
        callback: (response: any) => {
          const handleSuccess = async () => {
            const nextMonth = new Date();
            nextMonth.setDate(nextMonth.getDate() + 30);
            
            await updateSeller(sellerId, {
              subscription: {
                plan: planId as any,
                status: 'active',
                startDate: new Date().toISOString(),
                endDate: nextMonth.toISOString()
              }
            });
            
            await refreshData();
            setIsProcessingPayment(false);
            showToast(`Successfully upgraded to ${planId} plan!`, 'success');
          };
          handleSuccess();
        },
        onClose: () => {
          setIsProcessingPayment(false);
        }
      });
      handler.openIframe();
    } catch (error) {
      console.error('Payment initialization failed:', error);
      setIsProcessingPayment(false);
      showToast('Payment system failed to load. Please try again.', 'error');
    }
  };

  const handleApplyTheme = async (themeId: string) => {
    if (!sellerId) return;
    
    // Find theme info to set primary colors etc if needed, though usually we just save the ID
    const themeInfo = [...PRODUCT_THEMES, ...SERVICE_THEMES, ...STREAMING_THEMES, ...PAYMENT_THEMES].find(t => t.id === themeId);
    
    await updateSeller(sellerId, {
      themeId: themeId,
      theme: {
        ...settingsForm.theme,
        selectedTheme: themeId
      } as any
    });
    
    // Refresh local data state
    await refreshData();
    await refreshTenant();
    
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const updateSection = async (section: string, updates: any) => {
    if (!sellerId) return;
    setSavingSection(section);
    try {
      await updateSeller(sellerId, updates);
      await refreshData();
      await refreshTenant();
      setSavedSection(section);
      showToast(`${section} updated successfully`, 'success');
      setTimeout(() => setSavedSection(null), 3000);
    } catch (error) {
      console.error(`Error updating ${section}:`, error);
      showToast(`Failed to update ${section}. Please try again.`, 'error');
    } finally {
      setSavingSection(null);
    }
  };

  const handleUpdateStoreInfo = async () => {
    let finalLogo = settingsForm.logo;
    
    if (logoFile) {
      setSavingSection('storeInfo');
      try {
        const uploadedUrls = await uploadAPI.upload([logoFile]);
        if (uploadedUrls && uploadedUrls.length > 0) {
          finalLogo = uploadedUrls[0];
          setSettingsForm(prev => ({ ...prev, logo: finalLogo }));
          setLogoFile(null);
        }
      } catch (error) {
        console.error('Error uploading logo:', error);
        showToast('Failed to upload logo. Please try again.', 'error');
        setSavingSection(null);
        return;
      }
    }

    const isSubdomainChanging = settingsForm.subdomain !== seller?.subdomain && settingsForm.subdomain !== seller?.requestedSubdomain;
    updateSection('storeInfo', {
      storeName: settingsForm.storeName,
      description: settingsForm.description,
      logo: finalLogo,
      requestedSubdomain: settingsForm.subdomain,
      currency: settingsForm.currency
    });
    if (isSubdomainChanging) {
      showToast('Subdomain request sent to manager for approval!', 'info');
    }
  };

  const handleUpdateShippingPolicy = () => {
    updateSection('shippingPolicy', { shippingPolicy: settingsForm.shippingPolicy });
  };

  const handleUpdateReturnPolicy = () => {
    updateSection('returnPolicy', { returnPolicy: settingsForm.returnPolicy });
  };

  const handleUpdatePrivacyPolicy = () => {
    updateSection('privacyPolicy', { privacyPolicy: settingsForm.privacyPolicy });
  };

  const handleUpdateTermsOfService = () => {
    updateSection('termsOfService', { termsOfService: settingsForm.termsOfService });
  };

  const handleUpdateAdditionalPages = () => {
    updateSection('additionalPages', { additionalPages: settingsForm.additionalPages });
  };

  const handleUpdateSocialLinks = () => {
    updateSection('socialLinks', { socialLinks: settingsForm.socialLinks });
  };

  const handleUpdateContactInfo = () => {
    updateSection('contactInfo', { contactInfo: settingsForm.contactInfo });
  };

  const handleUpdatePaymentGateways = () => {
    // If starter plan, force iyonicpay
    if (seller?.subscription?.plan === 'starter') {
      const starterGateways = {
        active: 'iyonicpay',
        iyonicpay: { enabled: true },
        custom: { ...settingsForm.paymentGateways?.custom, enabled: false }
      };
      updateSection('paymentGateways', { paymentGateways: starterGateways });
    } else {
      updateSection('paymentGateways', { paymentGateways: settingsForm.paymentGateways });
    }
  };

  const handleUpdateDeliveryLocations = () => {
    updateSection('deliveryLocations', { deliveryLocations: settingsForm.deliveryLocations });
  };

  const handleUpdatePaymentTerms = () => {
    updateSection('paymentTerms', { paymentTerms: settingsForm.paymentTerms });
  };

  const handleUpdateSettings = async () => {
    if (!sellerId) return;
    const isSubdomainChanging = settingsForm.subdomain !== seller?.subdomain && settingsForm.subdomain !== seller?.requestedSubdomain;
    
    // Save theme ID both as direct field and inside theme object for compatibility
    await updateSeller(sellerId, {
      storeName: settingsForm.storeName,
      description: settingsForm.description,
      requestedSubdomain: settingsForm.subdomain,
      shippingPolicy: settingsForm.shippingPolicy,
      returnPolicy: settingsForm.returnPolicy,
      privacyPolicy: settingsForm.privacyPolicy,
      termsOfService: settingsForm.termsOfService,
      additionalPages: settingsForm.additionalPages,
      themeId: settingsForm.themeId,
      theme: {
        ...settingsForm.theme,
        selectedTheme: settingsForm.themeId
      } as any,
      deliveryLocations: settingsForm.deliveryLocations,
      paymentTerms: settingsForm.paymentTerms
    });
    
    // Refresh local data state
    await refreshData();
    await refreshTenant();
    
    setSettingsSaved(true);
    showToast('Settings updated successfully', 'success');
    setTimeout(() => setSettingsSaved(false), 5000);
    if (isSubdomainChanging) {
      showToast('Settings updated and subdomain request sent to manager!', 'info');
    }
  };

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleDeleteProduct = (id: string) => {
    deleteProduct(id);
    showToast('Product deleted successfully', 'success');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      active: 'success',
      draft: 'warning',
      archived: 'info',
      pending: 'warning',
      processing: 'info',
      shipped: 'info',
      delivered: 'success',
      cancelled: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const isExpired = seller?.subscription?.endDate && new Date(seller.subscription.endDate) < new Date();
  const isStarter = !seller?.subscription?.plan || seller.subscription.plan === 'starter';
  const needsUpgrade = isExpired && !isStarter;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {needsUpgrade && activeTab !== 'billing' && (
        <div className="fixed inset-0 z-[200] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <Card className="max-w-md w-full text-center p-10 space-y-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
              <Clock className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-gray-900">Subscription Expired</h2>
              <p className="text-gray-500 font-medium">Your subscription has expired. Please renew or upgrade your plan to continue using your dashboard features.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button 
                size="lg" 
                className="w-full bg-blue-600 hover:bg-blue-700 font-bold"
                onClick={() => setActiveTab('billing')}
              >
                Go to Billing
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-gray-500 font-bold"
                onClick={logout}
              >
                Logout
              </Button>
            </div>
          </Card>
        </div>
      )}
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-[60]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <img src="/logo.png" alt="Iyonicorp Logo" className="w-6 h-6 object-contain" />
          </div>
          <span className="font-bold text-gray-900">Dashboard</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[70] md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-[80] transition-transform duration-300 transform md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo.png" alt="Iyonicorp Logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">Iyonicorp</h1>
              <p className="text-[10px] text-gray-500">Seller Dashboard</p>
            </div>
          </Link>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1 text-gray-400 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
          {seller && seller.subdomain && (
            <a
              href={`${window.location.origin}/#/shop/${seller.subdomain}${!seller.isLive ? '?preview=true' : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all mb-4 group border border-indigo-100"
            >
              <ExternalLink className="w-5 h-5" />
              <span className="font-bold">Visit Shopfront</span>
            </a>
          )}

          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.id === 'products' && (isServiceShop || isPaymentShop) ? <Briefcase className="w-5 h-5" /> : tab.icon}
              <span>{tab.id === 'products' && (isServiceShop || isPaymentShop) ? (isPaymentShop ? 'Payments' : 'Services') : tab.label}</span>
            </button>
          ))}

          {seller?.subdomain && (
            <a
              href={`${window.location.origin}/#/shop/${seller.subdomain}${!seller.isLive ? '?preview=true' : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100 mt-2"
            >
              <ExternalLink className="w-5 h-5" />
              <span className="font-semibold">My Store</span>
            </a>
          )}
          
          <div className="my-4 border-t border-gray-100 pt-4">
            <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Platform</p>
            {user?.username && (
              <Link
                to="/iyonicpay"
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-green-600 hover:bg-green-50 transition-all border border-transparent hover:border-green-100"
              >
                <DollarSign className="w-4 h-4" />
                <span className="font-semibold">IyonicPay</span>
              </Link>
            )}

            {user?.username && (
              <Link
                to="/iyonicbots"
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100"
              >
                <Bot className="w-4 h-4" />
                <span className="font-semibold">IyonicBots</span>
              </Link>
            )}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 min-h-screen">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {user?.name}!</h2>
              <p className="text-gray-500">Here's what's happening with your store today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(analytics.totalRevenue || 0, seller?.currency)}</p>
                    <p className="text-sm text-green-600 mt-1">+{analytics.revenueGrowth}% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalOrders}</p>
                    <p className="text-sm text-green-600 mt-1">+{analytics.ordersGrowth}% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{isServiceShop ? 'Total Services' : 'Total Products'}</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalProducts}</p>
                    <p className="text-sm text-gray-500 mt-1">{sellerProducts.filter(p => p.status === 'active').length} active</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    {isServiceShop ? <Briefcase className="w-6 h-6 text-purple-600" /> : <Package className="w-6 h-6 text-purple-600" />}
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalCustomers}</p>
                    <p className="text-sm text-gray-500 mt-1">Growing customer base</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Main Overview Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Orders */}
              <div className="lg:col-span-2">
                <Card padding="none">
                  <CardHeader
                    title="Recent Orders"
                    subtitle="Latest orders from your customers"
                    action={
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('orders')}>
                        View All
                      </Button>
                    }
                  />
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.recentOrders.length > 0 ? (
                        analytics.recentOrders.map(order => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.id}</TableCell>
                            <TableCell>{order.customerName}</TableCell>
                            <TableCell>{formatPrice(order.total || 0, seller?.currency)}</TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                            No orders found yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </div>

              {/* Delivery Locations Summary */}
              <div className="lg:col-span-1">
                <Card padding="none">
                  <CardHeader
                    title="Delivery Locations"
                    subtitle="Active delivery zones & fees"
                    action={
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('settings')}>
                        Manage
                      </Button>
                    }
                  />
                  <div className="p-6">
                    {seller?.deliveryLocations && seller.deliveryLocations.length > 0 ? (
                      <div className="space-y-4">
                        {seller.deliveryLocations.filter(loc => loc.enabled).slice(0, 6).map(location => (
                          <div key={location.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                <Truck className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{location.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{location.type}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-blue-600">{formatPrice(location.fee, seller?.currency)}</p>
                              <p className="text-[10px] text-slate-400">{location.deliveryPeriod || 'N/A'}</p>
                            </div>
                          </div>
                        ))}
                        {seller.deliveryLocations.filter(loc => loc.enabled).length > 6 && (
                          <p className="text-center text-xs text-slate-500 font-medium">
                            + {seller.deliveryLocations.filter(loc => loc.enabled).length - 6} more locations
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                          <Truck className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 mb-4">No delivery locations set</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setActiveTab('settings')}
                        >
                          Setup Delivery
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Quick Info Card */}
                <Card className="mt-8 bg-blue-600 border-none">
                  <div className="p-2">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Pick-up Address</h4>
                        <p className="text-xs text-blue-100 opacity-80">Customer collection point</p>
                      </div>
                    </div>
                    <p className="text-sm text-white font-medium leading-relaxed bg-white/10 p-3 rounded-lg border border-white/10">
                      {seller?.contactInfo?.address || 'No address set yet'}
                    </p>
                    <Button 
                      fullWidth 
                      variant="outline" 
                      className="mt-4 border-white/20 text-white hover:bg-white/10"
                      onClick={() => setActiveTab('settings')}
                    >
                      Update Address
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{isServiceShop ? 'Services' : 'Products'}</h2>
                <p className="text-gray-500">{isServiceShop ? 'Manage your service catalog' : 'Manage your product catalog'}</p>
              </div>
              <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => setIsProductPopupOpen(true)}>
                Add {isServiceShop ? 'Service' : 'Product'}
              </Button>
            </div>

            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isServiceShop ? 'Service' : (isPaymentShop ? 'Payment Item' : 'Product')}</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>{(isServiceShop || isPaymentShop) ? 'Type' : 'Stock'}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellerProducts.map(product => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                            {product.images && product.images.length > 0 ? (
                              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              product.type === 'service' ? <Briefcase className="w-6 h-6 text-gray-400" /> : (product.type === 'payment' ? <DollarSign className="w-6 h-6 text-gray-400" /> : <Package className="w-6 h-6 text-gray-400" />)
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.description.substring(0, 50)}...</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell className="font-medium">{formatPrice(product.price, seller?.currency)}</TableCell>
                      <TableCell>{(isServiceShop || isPaymentShop) ? (product.type.charAt(0).toUpperCase() + product.type.slice(1)) : product.stock}</TableCell>
                      <TableCell>{getStatusBadge(product.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => window.open(`${window.location.origin}/#/shop/${seller?.subdomain}?product=${product.id}&preview=true`, '_blank')}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEditProduct(product)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Orders</h2>
              <p className="text-gray-500">Manage and track your orders</p>
            </div>

            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellerOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customerName}</p>
                          <p className="text-sm text-gray-500">{order.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{order.items.length} items</TableCell>
                      <TableCell className="font-medium">{formatPrice(order.total || 0, seller?.currency)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Select
                          options={[
                            { value: 'pending', label: 'Pending' },
                            { value: 'processing', label: 'Processing' },
                            { value: 'shipped', label: 'Shipped' },
                            { value: 'delivered', label: 'Delivered' },
                            { value: 'cancelled', label: 'Cancelled' },
                          ]}
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                          className="w-32"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Customers</h2>
              <p className="text-gray-500">View and manage your customer base</p>
            </div>

            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellerCustomers.map(customer => {
                    const customerOrders = sellerOrders.filter(o => 
                      o.customerEmail.toLowerCase() === customer.email.toLowerCase() && 
                      o.status !== 'cancelled'
                    );
                    const totalOrders = customerOrders.length;
                    const totalSpent = customerOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
                    
                    return (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
                        <TableCell>{totalOrders}</TableCell>
                        <TableCell className="font-medium">{formatPrice(totalSpent || 0, seller?.currency)}</TableCell>
                        <TableCell>{new Date(customer.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Discounts Tab */}
        {activeTab === 'discounts' && seller && (
          <DiscountsSection 
            seller={seller} 
            products={sellerProducts} 
            discounts={discounts}
            addDiscount={addDiscount}
            updateDiscount={updateDiscount}
            deleteDiscount={deleteDiscount}
            refreshData={refreshData} 
          />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 leading-tight">Analytics Overview</h2>
                <p className="text-gray-500">Deep dive into your store's performance metrics</p>
              </div>
              <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg">Last 30 Days</button>
                <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-lg">Last 90 Days</button>
              </div>
            </div>

            {/* Enhanced Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Revenue', value: formatPrice(analytics.totalRevenue || 0, seller?.currency), growth: `+${analytics.revenueGrowth}%`, icon: <DollarSign className="w-6 h-6 text-emerald-600" />, color: 'bg-emerald-50' },
                { label: 'Total Orders', value: analytics.totalOrders, growth: '+5.2%', icon: <ShoppingCart className="w-6 h-6 text-blue-600" />, color: 'bg-blue-50' },
                { label: 'Active Products', value: sellerProducts.length, growth: 'Stable', icon: <Package className="w-6 h-6 text-purple-600" />, color: 'bg-purple-50' },
                { label: 'Total Customers', value: sellerCustomers.length, growth: '+2.4%', icon: <Users className="w-6 h-6 text-orange-600" />, color: 'bg-orange-50' },
              ].map((stat, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center`}>
                      {stat.icon}
                    </div>
                    <Badge variant={stat.growth.startsWith('+') ? 'success' : 'default'}>{stat.growth}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight">{stat.value}</p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Sales Chart Area */}
              <Card className="lg:col-span-2">
                <CardHeader 
                  title="Revenue Growth" 
                  subtitle="Monthly performance tracking"
                />
                <div className="mt-6 h-[300px] flex items-end justify-between space-x-2">
                  {analytics.salesByMonth.map((month, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center group">
                      <div className="relative w-full flex items-end justify-center h-[240px]">
                        <div 
                          className="w-full max-w-[40px] bg-blue-500 rounded-t-lg transition-all duration-500 group-hover:bg-blue-600 relative"
                          style={{ height: `${(month.revenue / (Math.max(...analytics.salesByMonth.map(m => m.revenue)) || 1)) * 100}%` }}
                        >
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            ${formatPrice(month.revenue, seller?.currency)}
                          </div>
                        </div>
                      </div>
                      <span className="mt-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{month.month.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Best Sellers */}
              <Card>
                <CardHeader 
                  title="Top Products" 
                  subtitle="Performance by volume"
                />
                <div className="mt-6 space-y-6">
                  {analytics.topProducts.length > 0 ? (
                    analytics.topProducts.map((product, index) => {
                      const actualProduct = sellerProducts.find(p => p.name === product.name);
                      return (
                        <div key={index} className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                              {actualProduct?.images?.[0] ? (
                                <img src={actualProduct.images[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-6 h-6 text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                              )}
                            </div>
                            <div className="absolute -top-2 -left-2 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
                            <div className="flex items-center text-[10px] text-gray-500 font-medium">
                              <span className="text-blue-600 font-bold">{product.sales} sales</span>
                              <span className="mx-1">•</span>
                              <span>{formatPrice((actualProduct?.price || 0) * product.sales, seller?.currency)} total</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center">
                      <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No sales data yet</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Themes Tab */}
        {activeTab === 'themes' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 mb-10 border border-slate-800 shadow-2xl">
              <div className="absolute inset-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -mr-48 -mt-48"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] -ml-32 -mb-32"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
              </div>
              
              <div className="relative z-10 p-8 md:p-16 flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
                    <Palette className="w-4 h-4" />
                    Premium Store Templates
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
                    Transform Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Digital Presence</span>
                  </h2>
                  <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
                    Choose from our high-performance, conversion-optimized themes. 
                    Switch styles instantly with a single click.
                  </p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    <button 
                      onClick={() => {
                        const demoTheme = seller?.themeId || (isServiceShop ? SERVICE_THEMES[0].id : PRODUCT_THEMES[0].id);
                        window.open(`${window.location.origin}/#/shop/demo?theme=${demoTheme}`, '_blank');
                      }}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black transition-all hover:bg-blue-500 shadow-xl shadow-blue-500/20 hover:-translate-y-1"
                    >
                      <Eye className="w-5 h-5" />
                      View Full Demo
                    </button>
                    {seller?.subdomain && (
                      <Link
                        to={`/shop/${seller.subdomain}${!seller.isLive ? '?preview=true' : ''}`}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl font-black transition-all hover:bg-white/20 shadow-xl hover:-translate-y-1"
                      >
                        <ExternalLink className="w-5 h-5" />
                        Live Store
                      </Link>
                    )}
                  </div>
                </div>
                
                <div className="w-full md:w-1/3 aspect-video md:aspect-square rounded-3xl overflow-hidden border border-slate-800 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-700 bg-slate-900 group">
                  <img 
                    src={([...PRODUCT_THEMES, ...SERVICE_THEMES, ...STREAMING_THEMES, ...PAYMENT_THEMES].find(t => t.id === seller?.themeId) || PRODUCT_THEMES[0]).preview} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    alt="active-theme"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                  <div className="absolute bottom-6 left-6 right-6">
                    <p className="text-blue-400 text-xs font-bold uppercase tracking-tighter mb-1">Active Theme</p>
                    <p className="text-white font-black text-xl truncate">
                      {([...PRODUCT_THEMES, ...SERVICE_THEMES, ...STREAMING_THEMES, ...PAYMENT_THEMES].find(t => t.id === seller?.themeId) || PRODUCT_THEMES[0]).name}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Theme Categories */}
            <div className="space-y-16 pb-20">
              {[
                { title: 'E-commerce & Retail', description: 'Optimized for physical and digital product sales', themes: PRODUCT_THEMES, type: 'product' },
                { title: 'Professional Services', description: 'Designed for agencies, consultants, and experts', themes: SERVICE_THEMES, type: 'service' },
                { title: 'Entertainment & Streaming', description: 'Premium platforms for content creators and media businesses', themes: STREAMING_THEMES, type: 'streaming' },
                { title: 'Payment & Checkout', description: 'Streamlined conversion focused interfaces', themes: PAYMENT_THEMES, type: 'payment' }
              ].map((category) => (
                <div key={category.title}>
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-black text-slate-900">{category.title}</h3>
                        <Badge variant="outline" className="rounded-md border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                          {category.themes.length} Styles
                        </Badge>
                      </div>
                      <p className="text-slate-500 font-medium">{category.description}</p>
                    </div>
                    {seller?.shopType === category.type && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-100">
                        <CheckCircle className="w-4 h-4" />
                        Recommended for your business
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {category.themes.map(theme => {
                      const isActive = seller?.themeId === theme.id;
                      const isPending = settingsForm.themeId === theme.id && !isActive;
                      
                      return (
                        <div 
                          key={theme.id}
                          className={`group relative bg-white rounded-[2rem] border transition-all duration-500 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] ${
                            isActive 
                              ? 'border-blue-600 ring-2 ring-blue-600/10' 
                              : 'border-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="relative aspect-[4/3] m-3 overflow-hidden rounded-[1.5rem]">
                            <WebPreview id={theme.id} />
                            <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-colors duration-500 z-20"></div>
                            
                            {/* Theme Tags */}
                            <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-30">
                              {theme.tags?.map((tag: string) => (
                                <span key={tag} className="px-2 py-1 bg-white/90 backdrop-blur-md rounded-md text-[10px] font-black text-slate-900 uppercase">
                                  {tag}
                                </span>
                              ))}
                            </div>

                            {/* Hover Actions Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 gap-3 px-6 z-40">
                              <button 
                                onClick={() => handleApplyTheme(theme.id)}
                                disabled={isActive}
                                className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-black text-sm transition-all shadow-xl ${
                                  isActive 
                                    ? 'bg-green-500 text-white cursor-default'
                                    : 'bg-white text-slate-950 hover:bg-slate-50'
                                }`}
                              >
                                {isActive ? (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <Palette className="w-4 h-4" />
                                    Apply Theme
                                  </>
                                )}
                              </button>
                              <button 
                                onClick={() => window.open(`${window.location.origin}/#/shop/demo?theme=${theme.id}`, '_blank')}
                                className="w-12 h-12 flex items-center justify-center bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl hover:bg-white/40 transition-all"
                                title="View Demo"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          <div className="p-6 pt-2">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-black text-lg text-slate-900">{theme.name}</h4>
                              {isActive && (
                                <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                              )}
                            </div>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-2 mb-6">
                              {theme.description}
                            </p>
                            
                            {/* Color Palette Preview */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                              <div className="flex gap-1.5">
                                <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${theme.color}`}></div>
                                <div className="w-4 h-4 rounded-full bg-slate-100"></div>
                                <div className="w-4 h-4 rounded-full bg-slate-50"></div>
                              </div>
                              {isActive && (
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                  Live Preview Ready
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Status Sticky Bar (Optional enhancement) */}
            {settingsSaved && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom duration-500">
                <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-tight">Success!</p>
                    <p className="text-slate-400 text-xs font-medium">Your store theme has been updated.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Refunds Tab */}
        {activeTab === 'refunds' && (
          <RefundsSection refreshData={refreshData} />
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Store Inquiries</h2>
                <p className="text-slate-500 font-medium text-lg">Manage messages and feedback from your storefront customers.</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <div className="px-4 py-2 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
                    {messages.filter(m => !m.isRead).length} Unread Messages
                  </span>
                </div>
              </div>
            </div>

            <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-none">
                      <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-6">Status</TableHead>
                      <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-6">Customer</TableHead>
                      <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-6">Subject</TableHead>
                      <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-6 text-right">Date</TableHead>
                      <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.length > 0 ? (
                      messages.map((msg) => (
                        <TableRow key={msg.id} className={`group hover:bg-slate-50/50 border-slate-100 ${!msg.isRead ? 'bg-blue-50/20' : ''}`}>
                          <TableCell className="py-6">
                            {!msg.isRead ? (
                              <Badge variant="info" className="rounded-md">New</Badge>
                            ) : (
                              <Badge variant="outline" className="rounded-md text-slate-400 border-slate-200">Read</Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold uppercase">
                                {msg.name.charAt(0)}
                              </div>
                              <div>
                                <p className={`font-bold text-sm ${!msg.isRead ? 'text-slate-900' : 'text-slate-600'}`}>{msg.name}</p>
                                <p className="text-xs text-slate-400 font-medium">{msg.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-6">
                            <p className={`text-sm truncate max-w-[200px] ${!msg.isRead ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                              {msg.subject || 'No Subject'}
                            </p>
                          </TableCell>
                          <TableCell className="py-6 text-right text-xs text-slate-400 font-bold">
                            {new Date(msg.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setSelectedMessage(msg);
                                  setIsMessagePopupOpen(true);
                                  if (!msg.isRead) markMessageRead(msg.id);
                                }}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="View Message"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => {
                                  setConfirmDeleteMessageId(msg.id);
                                }}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete Message"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-20 text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                            <MessageSquare className="w-8 h-8" />
                          </div>
                          <p className="text-slate-900 font-bold">No inquiries yet</p>
                          <p className="text-slate-500 text-sm">Customer contact form messages will appear here.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Message Detail Popup */}
            <Popup
              isOpen={isMessagePopupOpen}
              onClose={() => {
                setIsMessagePopupOpen(false);
                setSelectedMessage(null);
              }}
              title="Message Detail"
            >
              {selectedMessage && (
                <div className="space-y-8 p-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 text-2xl font-black uppercase">
                        {selectedMessage.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-slate-900">{selectedMessage.name}</h4>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-300" />
                          {selectedMessage.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Received On</p>
                      <p className="font-bold text-slate-900">{new Date(selectedMessage.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Subject</p>
                    <p className="text-lg font-bold text-slate-900">{selectedMessage.subject || 'No Subject'}</p>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Message Content</p>
                    <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                      {selectedMessage.message}
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsMessagePopupOpen(false)}
                    >
                      Close View
                    </Button>
                    <a 
                      href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject || 'Your Inquiry'}`}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100"
                    >
                      <Send className="w-4 h-4" />
                      Reply via Email
                    </a>
                  </div>
                </div>
              )}
            </Popup>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Product Reviews</h2>
                <p className="text-slate-500 font-medium text-lg">See what your customers are saying about your products.</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <div className="px-4 py-2 bg-yellow-50 rounded-xl border border-yellow-100 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs font-black text-yellow-700 uppercase tracking-widest">
                    {reviews.length} Total Reviews
                  </span>
                </div>
              </div>
            </div>

            <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-none">
                      <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-6">Customer</TableHead>
                      <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-6">Product</TableHead>
                      <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-6">Rating</TableHead>
                      <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-6">Comment</TableHead>
                      <TableHead className="font-black text-slate-400 uppercase tracking-widest text-[10px] py-6 text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.length > 0 ? (
                      reviews.map((review) => (
                        <TableRow key={review.id} className="group hover:bg-slate-50/50 border-slate-100">
                          <TableCell className="py-6">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{review.customerName}</p>
                              {review.isVerified && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                  <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Verified Purchase</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-6 font-bold text-slate-600 text-sm">
                            {review.productName || 'Product'}
                          </TableCell>
                          <TableCell className="py-6">
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'}`} 
                                />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="py-6 max-w-md">
                            <p className="text-sm text-slate-500 line-clamp-2 italic">"{review.comment}"</p>
                          </TableCell>
                          <TableCell className="py-6 text-right text-xs text-slate-400 font-bold">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-20 text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                            <Star className="w-8 h-8" />
                          </div>
                          <p className="text-slate-900 font-bold">No reviews yet</p>
                          <p className="text-slate-500 text-sm">When customers rate your products, they will appear here.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Billing & Subscription</h2>
              <p className="text-slate-500 font-medium text-lg">Manage your store's plan, usage limits, and billing history.</p>
            </div>
            <BillingSection 
              seller={seller} 
              onUpgrade={(plan) => handlePayment(plan)} 
            />
          </div>
        )}

        {/* Marketing Tab */}
        {activeTab === 'marketing' && (
          <MarketingSection />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Store Settings</h2>
              <p className="text-slate-500 font-medium text-lg">Manage your store's identity, policies, and custom pages.</p>
            </div>

            <div className="space-y-12">
              {/* Store Identity Section */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                    <Store className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wider text-sm">Store Identity</h3>
                </div>
                
                <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
                  <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">Store Logo</label>
                          <div className="flex items-center gap-6">
                            <div className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group relative">
                              {logoFile ? (
                                <img src={URL.createObjectURL(logoFile)} alt="Logo Preview" className="w-full h-full object-cover" />
                              ) : settingsForm.logo ? (
                                <img src={settingsForm.logo} alt="Store Logo" className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-slate-400 group-hover:text-blue-500 transition-colors">
                                  <ImageIcon className="w-8 h-8" />
                                </div>
                              )}
                              <input 
                                type="file" 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setLogoFile(e.target.files[0]);
                                  }
                                }}
                              />
                            </div>
                            <div className="flex-1 space-y-2">
                              <p className="text-xs font-bold text-slate-500">
                                Upload your store logo. Recommended size: 512x512px.
                              </p>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="relative"
                                leftIcon={<Upload className="w-4 h-4" />}
                              >
                                {logoFile ? 'Change Logo' : 'Upload Logo'}
                                <input 
                                  type="file" 
                                  className="absolute inset-0 opacity-0 cursor-pointer" 
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      setLogoFile(e.target.files[0]);
                                    }
                                  }}
                                />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <Input 
                          label="Store Name" 
                          placeholder="Your Amazing Shop"
                          value={settingsForm.storeName} 
                          onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                        />
                        <Select
                          label="Store Currency"
                          value={settingsForm.currency}
                          onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                          options={[
                            { value: 'USD', label: 'US Dollar (USD)' },
                            { value: 'KES', label: 'Kenyan Shilling (KES)' },
                          ]}
                          helperText="Ensure your payment gateways support this currency."
                        />
                        <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Store URL Status</span>
                            <Badge variant={seller?.isLive ? 'success' : 'warning'}>
                              {seller?.isLive ? 'Live' : 'Pending Approval'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                              <ExternalLink className="w-4 h-4" />
                            </div>
                            <p className="text-sm font-bold text-slate-900">{seller?.subdomain}.iyonicorp.com</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <Textarea 
                          label="Store Description" 
                          placeholder="Tell your customers what makes your store special..."
                          value={settingsForm.description} 
                          onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                          rows={4} 
                        />
                        <Input 
                          label="Request New Subdomain" 
                          placeholder="new-store-name"
                          value={settingsForm.subdomain} 
                          onChange={(e) => setSettingsForm({ ...settingsForm, subdomain: e.target.value })}
                          helperText="Changing your subdomain requires manager approval." 
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-6 border-t border-slate-100">
                      <Button 
                        onClick={handleUpdateStoreInfo}
                        loading={savingSection === 'storeInfo'}
                        variant={savedSection === 'storeInfo' ? 'success' : 'primary'}
                        leftIcon={savedSection === 'storeInfo' ? <CheckCircle className="w-4 h-4" /> : null}
                      >
                        {savedSection === 'storeInfo' ? 'Store Info Saved' : 'Save Identity Changes'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </section>

              {/* Legal & Policies Section */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wider text-sm">Store Policies</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Shipping Policy */}
                  <Card className="border-none shadow-xl shadow-slate-200/50">
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                          <Truck className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-slate-900">Shipping Policy</h4>
                      </div>
                      <Textarea 
                        placeholder="Define your shipping timelines, costs, and methods..."
                        value={settingsForm.shippingPolicy} 
                        onChange={(e) => setSettingsForm({ ...settingsForm, shippingPolicy: e.target.value })}
                        rows={6} 
                        className="mb-4"
                      />
                      <Button 
                        fullWidth 
                        size="sm"
                        onClick={handleUpdateShippingPolicy}
                        loading={savingSection === 'shippingPolicy'}
                        variant={savedSection === 'shippingPolicy' ? 'success' : 'outline'}
                      >
                        {savedSection === 'shippingPolicy' ? 'Saved Successfully' : 'Save Shipping Policy'}
                      </Button>
                    </div>
                  </Card>

                  {/* Return Policy */}
                  <Card className="border-none shadow-xl shadow-slate-200/50">
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                          <RefreshCw className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-slate-900">Return Policy</h4>
                      </div>
                      <Textarea 
                        placeholder="Details about refunds, exchanges, and return windows..."
                        value={settingsForm.returnPolicy} 
                        onChange={(e) => setSettingsForm({ ...settingsForm, returnPolicy: e.target.value })}
                        rows={6} 
                        className="mb-4"
                      />
                      <Button 
                        fullWidth 
                        size="sm"
                        onClick={handleUpdateReturnPolicy}
                        loading={savingSection === 'returnPolicy'}
                        variant={savedSection === 'returnPolicy' ? 'success' : 'outline'}
                      >
                        {savedSection === 'returnPolicy' ? 'Saved Successfully' : 'Save Return Policy'}
                      </Button>
                    </div>
                  </Card>

                  {/* Privacy Policy */}
                  <Card className="border-none shadow-xl shadow-slate-200/50">
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                          <Shield className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-slate-900">Privacy Policy</h4>
                      </div>
                      <Textarea 
                        placeholder="Explain how you handle and protect customer data..."
                        value={settingsForm.privacyPolicy} 
                        onChange={(e) => setSettingsForm({ ...settingsForm, privacyPolicy: e.target.value })}
                        rows={6} 
                        className="mb-4"
                      />
                      <Button 
                        fullWidth 
                        size="sm"
                        onClick={handleUpdatePrivacyPolicy}
                        loading={savingSection === 'privacyPolicy'}
                        variant={savedSection === 'privacyPolicy' ? 'success' : 'outline'}
                      >
                        {savedSection === 'privacyPolicy' ? 'Saved Successfully' : 'Save Privacy Policy'}
                      </Button>
                    </div>
                  </Card>

                  {/* Terms of Service */}
                  <Card className="border-none shadow-xl shadow-slate-200/50">
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                          <FileText className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-slate-900">Terms of Service</h4>
                      </div>
                      <Textarea 
                        placeholder="General rules and legal conditions for your shop..."
                        value={settingsForm.termsOfService} 
                        onChange={(e) => setSettingsForm({ ...settingsForm, termsOfService: e.target.value })}
                        rows={6} 
                        className="mb-4"
                      />
                      <Button 
                        fullWidth 
                        size="sm"
                        onClick={handleUpdateTermsOfService}
                        loading={savingSection === 'termsOfService'}
                        variant={savedSection === 'termsOfService' ? 'success' : 'outline'}
                      >
                        {savedSection === 'termsOfService' ? 'Saved Successfully' : 'Save Terms of Service'}
                      </Button>
                    </div>
                  </Card>
                </div>
              </section>

              {/* Contact Information Section */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                    <Phone className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wider text-sm">Contact Information</h3>
                </div>

                <Card className="border-none shadow-xl shadow-slate-200/50">
                  <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <Input 
                        label="Customer Support Email" 
                        placeholder="support@yourstore.com"
                        value={settingsForm.contactInfo.email} 
                        onChange={(e) => setSettingsForm({ 
                          ...settingsForm, 
                          contactInfo: { ...settingsForm.contactInfo, email: e.target.value } 
                        })}
                        leftIcon={<Mail className="w-4 h-4" />}
                      />
                      <Input 
                        label="Phone Number" 
                        placeholder="+1 (555) 000-0000"
                        value={settingsForm.contactInfo.phone} 
                        onChange={(e) => setSettingsForm({ 
                          ...settingsForm, 
                          contactInfo: { ...settingsForm.contactInfo, phone: e.target.value } 
                        })}
                        leftIcon={<Phone className="w-4 h-4" />}
                      />
                      <Input 
                        label="WhatsApp Number" 
                        placeholder="+1 (555) 000-0000"
                        value={settingsForm.contactInfo.whatsapp} 
                        onChange={(e) => setSettingsForm({ 
                          ...settingsForm, 
                          contactInfo: { ...settingsForm.contactInfo, whatsapp: e.target.value } 
                        })}
                        leftIcon={<MessageCircle className="w-4 h-4" />}
                        helperText="Used for direct chat button on storefront."
                      />
                      <Input 
                        label="Business Address" 
                        placeholder="123 Street, City, Country"
                        value={settingsForm.contactInfo.address} 
                        onChange={(e) => setSettingsForm({ 
                          ...settingsForm, 
                          contactInfo: { ...settingsForm.contactInfo, address: e.target.value } 
                        })}
                        leftIcon={<MapPin className="w-4 h-4" />}
                      />
                    </div>
                    <div className="flex justify-end pt-6 border-t border-slate-100">
                      <Button 
                        onClick={handleUpdateContactInfo}
                        loading={savingSection === 'contactInfo'}
                        variant={savedSection === 'contactInfo' ? 'success' : 'primary'}
                      >
                        {savedSection === 'contactInfo' ? 'Contact Info Saved' : 'Save Contact Information'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </section>

              {/* Social Media Section */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                    <Facebook className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wider text-sm">Social Media Profiles</h3>
                </div>

                <Card className="border-none shadow-xl shadow-slate-200/50">
                  <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                      <Input 
                        label="Instagram" 
                        placeholder="https://instagram.com/yourstore"
                        value={settingsForm.socialLinks.instagram} 
                        onChange={(e) => setSettingsForm({ 
                          ...settingsForm, 
                          socialLinks: { ...settingsForm.socialLinks, instagram: e.target.value } 
                        })}
                        leftIcon={<Instagram className="w-4 h-4 text-pink-600" />}
                      />
                      <Input 
                        label="Facebook" 
                        placeholder="https://facebook.com/yourstore"
                        value={settingsForm.socialLinks.facebook} 
                        onChange={(e) => setSettingsForm({ 
                          ...settingsForm, 
                          socialLinks: { ...settingsForm.socialLinks, facebook: e.target.value } 
                        })}
                        leftIcon={<Facebook className="w-4 h-4 text-blue-700" />}
                      />
                      <Input 
                        label="Twitter / X" 
                        placeholder="https://twitter.com/yourstore"
                        value={settingsForm.socialLinks.twitter} 
                        onChange={(e) => setSettingsForm({ 
                          ...settingsForm, 
                          socialLinks: { ...settingsForm.socialLinks, twitter: e.target.value } 
                        })}
                        leftIcon={<Twitter className="w-4 h-4 text-black" />}
                      />
                      <Input 
                        label="TikTok" 
                        placeholder="https://tiktok.com/@yourstore"
                        value={settingsForm.socialLinks.tiktok} 
                        onChange={(e) => setSettingsForm({ 
                          ...settingsForm, 
                          socialLinks: { ...settingsForm.socialLinks, tiktok: e.target.value } 
                        })}
                        leftIcon={<Music2 className="w-4 h-4 text-black" />}
                      />
                      <Input 
                        label="LinkedIn" 
                        placeholder="https://linkedin.com/company/yourstore"
                        value={settingsForm.socialLinks.linkedin} 
                        onChange={(e) => setSettingsForm({ 
                          ...settingsForm, 
                          socialLinks: { ...settingsForm.socialLinks, linkedin: e.target.value } 
                        })}
                        leftIcon={<Linkedin className="w-4 h-4 text-blue-800" />}
                      />
                      <Input 
                        label="YouTube" 
                        placeholder="https://youtube.com/@yourstore"
                        value={settingsForm.socialLinks.youtube} 
                        onChange={(e) => setSettingsForm({ 
                          ...settingsForm, 
                          socialLinks: { ...settingsForm.socialLinks, youtube: e.target.value } 
                        })}
                        leftIcon={<Youtube className="w-4 h-4 text-red-600" />}
                      />
                    </div>
                    <div className="flex justify-end pt-6 border-t border-slate-100">
                      <Button 
                        onClick={handleUpdateSocialLinks}
                        loading={savingSection === 'socialLinks'}
                        variant={savedSection === 'socialLinks' ? 'success' : 'primary'}
                      >
                        {savedSection === 'socialLinks' ? 'Social Links Saved' : 'Save Social Media'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </section>

              {/* Payment Gateways Section */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wider text-sm">Payment Gateways</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* IyonicPay (Default) */}
                  <Card className={`border-2 transition-all duration-300 ${settingsForm.paymentGateways?.active === 'iyonicpay' ? 'border-indigo-600 shadow-xl shadow-indigo-100' : 'border-transparent shadow-md'}`}>
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <DollarSign className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-slate-900">IyonicPay</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Platform Default</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={settingsForm.paymentGateways.iyonicpay?.enabled ? 'success' : 'default'}>
                            {settingsForm.paymentGateways.iyonicpay?.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={settingsForm.paymentGateways.iyonicpay?.enabled}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setSettingsForm({
                                  ...settingsForm,
                                  paymentGateways: {
                                    ...settingsForm.paymentGateways,
                                    active: isChecked ? 'iyonicpay' : (settingsForm.paymentGateways?.custom?.enabled ? 'custom' : 'iyonicpay'),
                                    iyonicpay: { enabled: isChecked },
                                    custom: { ...settingsForm.paymentGateways?.custom, enabled: isChecked ? false : !!settingsForm.paymentGateways?.custom?.enabled }
                                  }
                                });
                              }}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-4 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 mb-8">
                        <div className="flex items-start gap-3">
                          <Check className="w-4 h-4 text-indigo-600 mt-1 shrink-0" />
                          <p className="text-sm font-medium text-slate-600">Instant settlements to your Iyonic Wallet.</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <Check className="w-4 h-4 text-indigo-600 mt-1 shrink-0" />
                          <p className="text-sm font-medium text-slate-600">Low transaction fees (2.5% + $0.30).</p>
                        </div>
                      </div>

                      <Button 
                        fullWidth
                        variant={settingsForm.paymentGateways?.active === 'iyonicpay' ? 'primary' : 'outline'}
                        onClick={() => setSettingsForm({
                          ...settingsForm,
                          paymentGateways: { ...settingsForm.paymentGateways, active: 'iyonicpay' }
                        })}
                      >
                        {settingsForm.paymentGateways?.active === 'iyonicpay' ? 'Currently Active Gateway' : 'Set as Active Gateway'}
                      </Button>
                    </div>
                  </Card>

                  {/* Custom Provider */}
                  <Card className={`border-2 transition-all duration-300 ${settingsForm.paymentGateways?.active === 'custom' ? 'border-emerald-600 shadow-xl shadow-emerald-100' : 'border-transparent shadow-md'} ${seller?.subscription?.plan === 'starter' ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                    <div className="p-8 relative">
                      {seller?.subscription?.plan === 'starter' && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center">
                          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-2xl border border-slate-100 max-w-[280px]">
                            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <Zap className="w-6 h-6" />
                            </div>
                            <h5 className="text-lg font-black text-slate-900 mb-2">Basic & Pro Feature</h5>
                            <p className="text-xs font-bold text-slate-500 mb-4 leading-relaxed">Upgrade to Basic or Professional to connect your own payment gateways.</p>
                            <Button size="sm" fullWidth variant="primary" onClick={() => setActiveTab('billing')}>View Plans</Button>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                            <Briefcase className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-slate-900">Custom Provider</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Connect Your Own</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={settingsForm.paymentGateways.custom?.enabled ? 'success' : 'default'}>
                            {settingsForm.paymentGateways.custom?.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={settingsForm.paymentGateways.custom?.enabled}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setSettingsForm({
                                  ...settingsForm,
                                  paymentGateways: {
                                    ...settingsForm.paymentGateways,
                                    active: isChecked ? 'custom' : (settingsForm.paymentGateways.iyonicpay?.enabled ? 'iyonicpay' : 'custom'),
                                    custom: { ...settingsForm.paymentGateways?.custom, enabled: isChecked },
                                    iyonicpay: { enabled: isChecked ? false : !!settingsForm.paymentGateways.iyonicpay?.enabled }
                                  }
                                });
                              }}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-6 mb-8">
                        <Select 
                          label="Payment Provider"
                          options={[
                            { value: 'paystack', label: 'Paystack' },
                            { value: 'flutterwave', label: 'Flutterwave' },
                            { value: 'stripe', label: 'Stripe' },
                            { value: 'paypal', label: 'PayPal' },
                          ]}
                          value={settingsForm.paymentGateways.custom?.provider}
                          onChange={(e) => setSettingsForm({
                            ...settingsForm,
                            paymentGateways: {
                              ...settingsForm.paymentGateways,
                              custom: { ...settingsForm.paymentGateways?.custom, provider: e.target.value }
                            }
                          })}
                        />
                        <Input 
                          label="API Secret Key"
                          placeholder="sk_live_..."
                          type="password"
                          value={settingsForm.paymentGateways.custom?.apiKey}
                          onChange={(e) => setSettingsForm({
                            ...settingsForm,
                            paymentGateways: {
                              ...settingsForm.paymentGateways,
                              custom: { ...settingsForm.paymentGateways?.custom, apiKey: e.target.value }
                            }
                          })}
                          helperText="Required for server-side initialization (e.g., sk_live_...)"
                        />
                        <Input 
                          label="API Public Key"
                          placeholder="pk_live_..."
                          value={settingsForm.paymentGateways.custom?.publicKey || ''}
                          onChange={(e) => setSettingsForm({
                            ...settingsForm,
                            paymentGateways: {
                              ...settingsForm.paymentGateways,
                              custom: { ...settingsForm.paymentGateways?.custom, publicKey: e.target.value }
                            }
                          })}
                          helperText="Required for frontend payment popup (e.g., pk_live_...)"
                        />
                        <Input 
                          label="Direct Payment Link (Optional)"
                          placeholder="https://paystack.com/pay/..."
                          value={settingsForm.paymentGateways.custom?.link}
                          onChange={(e) => setSettingsForm({
                            ...settingsForm,
                            paymentGateways: {
                              ...settingsForm.paymentGateways,
                              custom: { ...settingsForm.paymentGateways?.custom, link: e.target.value }
                            }
                          })}
                        />
                      </div>

                      <Button 
                        fullWidth
                        variant={settingsForm.paymentGateways.active === 'custom' ? 'success' : 'outline'}
                        disabled={!settingsForm.paymentGateways.custom.enabled}
                        onClick={() => setSettingsForm({
                          ...settingsForm,
                          paymentGateways: { ...settingsForm.paymentGateways, active: 'custom' }
                        })}
                      >
                        {settingsForm.paymentGateways.active === 'custom' ? 'Currently Active Gateway' : 'Set as Active Gateway'}
                      </Button>
                    </div>
                  </Card>
                </div>

                <div className="flex justify-end pt-8 mt-8 border-t border-slate-100">
                  <Button 
                    onClick={handleUpdatePaymentGateways}
                    loading={savingSection === 'paymentGateways'}
                    variant={savedSection === 'paymentGateways' ? 'success' : 'primary'}
                    leftIcon={savedSection === 'paymentGateways' ? <CheckCircle className="w-4 h-4" /> : null}
                  >
                    {savedSection === 'paymentGateways' ? 'Payment Settings Saved' : 'Save All Payment Settings'}
                  </Button>
                </div>
              </section>

              {/* Delivery Locations Section */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                    <Globe className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wider text-sm">Delivery Locations & Fees</h3>
                </div>

                <Card className="border-none shadow-xl shadow-slate-200/50">
                  <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
                      <div className="lg:col-span-1">
                        <Select 
                          label="Location Type"
                          options={[
                            { value: 'country', label: 'Country' },
                            { value: 'state', label: 'County/State' },
                            { value: 'subcounty', label: 'Sub-County/Area' },
                            { value: 'custom', label: 'Custom Location' },
                          ]}
                          value={newLocation.type}
                          onChange={(e) => setNewLocation({ ...newLocation, type: e.target.value as any })}
                        />
                      </div>
                      <div className="lg:col-span-1">
                        <Input 
                          label="Location Name"
                          placeholder="e.g. Nairobi, Texas, Downtown"
                          value={newLocation.name}
                          onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                        />
                      </div>
                      <div className="lg:col-span-1">
                        <Input 
                          label={`Fee (${settingsForm.currency})`}
                          type="number"
                          placeholder="0.00"
                          value={newLocation.fee}
                          onChange={(e) => setNewLocation({ ...newLocation, fee: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="lg:col-span-1">
                        <Input 
                          label="Period"
                          placeholder="e.g. 2-3 Days"
                          value={newLocation.deliveryPeriod}
                          onChange={(e) => setNewLocation({ ...newLocation, deliveryPeriod: e.target.value })}
                        />
                      </div>
                      <div className="lg:col-span-1 flex items-end">
                        <Button 
                          fullWidth 
                          onClick={() => {
                            if (!newLocation.name) return;
                            const loc: DeliveryLocation = {
                              id: Math.random().toString(36).substr(2, 9),
                              ...newLocation,
                              enabled: true
                            };
                            setSettingsForm({
                              ...settingsForm,
                              deliveryLocations: [...settingsForm.deliveryLocations, loc]
                            });
                            setNewLocation({ type: 'country', name: '', fee: 0, deliveryPeriod: '', parentId: '' });
                          }}
                          leftIcon={<Plus className="w-4 h-4" />}
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    {settingsForm.deliveryLocations.length > 1 && (
                      <div className="mb-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-blue-900">Bulk Delivery Period</p>
                          <p className="text-xs text-blue-600">Apply the same delivery time to all your locations.</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                          <Input 
                            placeholder="e.g. 3-5 Working Days"
                            className="bg-white"
                            id="bulk-delivery-period"
                          />
                          <Button 
                            size="sm"
                            onClick={() => {
                              const input = document.getElementById('bulk-delivery-period') as HTMLInputElement;
                              if (!input?.value) return;
                              setSettingsForm({
                                ...settingsForm,
                                deliveryLocations: settingsForm.deliveryLocations.map(l => ({ ...l, deliveryPeriod: input.value }))
                              });
                            }}
                          >
                            Apply to All
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Location Name</TableHead>
                            <TableHead>Delivery Fee</TableHead>
                            <TableHead>Delivery Period</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settingsForm.deliveryLocations.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                                No delivery locations added yet.
                              </TableCell>
                            </TableRow>
                          ) : (
                            settingsForm.deliveryLocations.map((loc) => (
                              <TableRow key={loc.id}>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize">{loc.type}</Badge>
                                </TableCell>
                                <TableCell className="font-bold text-slate-900">{loc.name}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400">{settingsForm.currency}</span>
                                    <input 
                                      type="number"
                                      className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                      value={loc.fee}
                                      onChange={(e) => {
                                        const newFee = parseFloat(e.target.value) || 0;
                                        setSettingsForm({
                                          ...settingsForm,
                                          deliveryLocations: settingsForm.deliveryLocations.map(l => 
                                            l.id === loc.id ? { ...l, fee: newFee } : l
                                          )
                                        });
                                      }}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <input 
                                    type="text"
                                    placeholder="Period"
                                    className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={loc.deliveryPeriod || ''}
                                    onChange={(e) => {
                                      setSettingsForm({
                                        ...settingsForm,
                                        deliveryLocations: settingsForm.deliveryLocations.map(l => 
                                          l.id === loc.id ? { ...l, deliveryPeriod: e.target.value } : l
                                        )
                                      });
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Badge variant={loc.enabled ? 'success' : 'default'}>
                                    {loc.enabled ? 'Active' : 'Disabled'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => {
                                        setSettingsForm({
                                          ...settingsForm,
                                          deliveryLocations: settingsForm.deliveryLocations.map(l => 
                                            l.id === loc.id ? { ...l, enabled: !l.enabled } : l
                                          )
                                        });
                                      }}
                                    >
                                      {loc.enabled ? 'Disable' : 'Enable'}
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-red-600 hover:bg-red-50 border-red-100"
                                      onClick={() => {
                                        setSettingsForm({
                                          ...settingsForm,
                                          deliveryLocations: settingsForm.deliveryLocations.filter(l => l.id !== loc.id)
                                        });
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-end pt-8 mt-8 border-t border-slate-100">
                      <Button 
                        onClick={handleUpdateDeliveryLocations}
                        loading={savingSection === 'deliveryLocations'}
                        variant={savedSection === 'deliveryLocations' ? 'success' : 'primary'}
                      >
                        {savedSection === 'deliveryLocations' ? 'Locations Saved' : 'Save Delivery Settings'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </section>

              {/* Payment Terms Section */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wider text-sm">Payment Terms & Rules</h3>
                </div>

                <Card className="border-none shadow-xl shadow-slate-200/50">
                  <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-lg font-black text-slate-900 mb-4">Accepted Payment Methods</h4>
                          <p className="text-sm text-slate-500 mb-6">Select which methods you want to offer at checkout.</p>
                          
                          <div className="space-y-4">
                            {[
                              { id: 'site', label: 'Pay on Site (Secure)', icon: <CreditCardIcon className="w-5 h-5" />, description: 'Customers pay immediately via IyonicPay or your custom gateway.' },
                              { id: 'pod', label: 'Pay on Delivery (POD)', icon: <Truck className="w-5 h-5" />, description: 'Customers pay when they receive the item.' },
                              { id: 'deposit', label: 'Partial Deposit', icon: <Percent className="w-5 h-5" />, description: 'Customers pay a percentage now and the balance on delivery.' },
                            ].map((method) => {
                              const isSelected = settingsForm.paymentTerms.methods.includes(method.id as any);
                              const isStarter = seller?.subscription?.plan === 'starter';
                              const isDisabled = isStarter && method.id !== 'site';

                              return (
                                <div 
                                  key={method.id}
                                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                                    isSelected ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 hover:border-slate-200'
                                  } ${isDisabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                  onClick={() => {
                                    if (isDisabled) return;
                                    const currentMethods = settingsForm.paymentTerms.methods;
                                    let newMethods: ('pod' | 'site' | 'deposit')[];
                                    if (isSelected) {
                                      // Don't allow deselecting everything
                                      if (currentMethods.length <= 1) return;
                                      newMethods = currentMethods.filter(m => m !== method.id);
                                    } else {
                                      newMethods = [...currentMethods, method.id as any];
                                    }
                                    setSettingsForm({
                                      ...settingsForm,
                                      paymentTerms: { ...settingsForm.paymentTerms, methods: newMethods }
                                    });
                                  }}
                                >
                                  <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                      {method.icon}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <h5 className="font-bold text-slate-900">{method.label}</h5>
                                        {isDisabled && (
                                          <Badge variant="warning" size="sm">Pro Feature</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs font-medium text-slate-500">{method.description}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {settingsForm.paymentTerms.methods.includes('deposit') && (
                          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                            <h5 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                              <Percent className="w-4 h-4 text-emerald-600" />
                              Deposit Settings
                            </h5>
                            <Input 
                              label="Deposit Percentage (%)"
                              type="number"
                              min="1"
                              max="99"
                              value={settingsForm.paymentTerms.depositPercentage}
                              onChange={(e) => setSettingsForm({
                                ...settingsForm,
                                paymentTerms: { ...settingsForm.paymentTerms, depositPercentage: parseInt(e.target.value) || 50 }
                              })}
                              helperText={`Customers will pay ${settingsForm.paymentTerms.depositPercentage}% upfront.`}
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-8">
                        {(settingsForm.paymentTerms.methods.includes('pod') || settingsForm.paymentTerms.methods.includes('deposit')) && (
                          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <h4 className="text-lg font-black text-slate-900 mb-4">Availability Rules</h4>
                            <p className="text-sm text-slate-500 mb-6">Choose who can use POD or Deposit methods.</p>

                            <div className="grid grid-cols-1 gap-4">
                              {[
                                { id: 'all', label: 'All Customers', description: 'Available to everyone who visits your store.' },
                                { id: 'returning', label: 'Returning Customers Only', description: 'Only customers who have made a successful payment before.' },
                              ].map((rule) => {
                                const isSelected = settingsForm.paymentTerms.rules === rule.id;
                                return (
                                  <div 
                                    key={rule.id}
                                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                                      isSelected ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 hover:border-slate-200'
                                    }`}
                                    onClick={() => setSettingsForm({
                                      ...settingsForm,
                                      paymentTerms: { ...settingsForm.paymentTerms, rules: rule.id as any }
                                    })}
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                      <div>
                                        <h5 className="font-bold text-slate-900">{rule.label}</h5>
                                        <p className="text-xs font-medium text-slate-500">{rule.description}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shrink-0">
                              <Shield className="w-5 h-5" />
                            </div>
                            <div>
                              <h5 className="font-bold text-blue-900 mb-1">Security Note</h5>
                              <p className="text-xs font-medium text-blue-700 leading-relaxed">
                                Pay on Delivery and Partial Deposit carry higher risks of cancellations. We recommend "Returning Customers Only" for these methods to minimize losses.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-8 mt-12 border-t border-slate-100">
                      <Button 
                        onClick={handleUpdatePaymentTerms}
                        loading={savingSection === 'paymentTerms'}
                        variant={savedSection === 'paymentTerms' ? 'success' : 'primary'}
                      >
                        {savedSection === 'paymentTerms' ? 'Terms Saved' : 'Save Payment Rules'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </section>

              {/* Custom Pages Section */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wider text-sm">Custom Pages</h3>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setSettingsForm({
                      ...settingsForm,
                      additionalPages: [...settingsForm.additionalPages, { title: '', content: '' }]
                    })}
                    leftIcon={<PlusCircle className="w-4 h-4" />}
                  >
                    Add New Page
                  </Button>
                </div>

                <Card className="border-none shadow-xl shadow-slate-200/50">
                  <div className="p-8">
                    <div className="space-y-6">
                      {settingsForm.additionalPages.map((page, index) => (
                        <div key={index} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative group transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-100 hover:border-blue-100">
                          <button 
                            onClick={() => {
                              const newPages = [...settingsForm.additionalPages];
                              newPages.splice(index, 1);
                              setSettingsForm({ ...settingsForm, additionalPages: newPages });
                            }}
                            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1">
                              <Input
                                label="Page Title"
                                value={page.title}
                                onChange={(e) => {
                                  const newPages = [...settingsForm.additionalPages];
                                  newPages[index].title = e.target.value;
                                  setSettingsForm({ ...settingsForm, additionalPages: newPages });
                                }}
                                placeholder="e.g. FAQ, About Us"
                              />
                            </div>
                            <div className="lg:col-span-2">
                              <Textarea
                                label="Page Content"
                                value={page.content}
                                onChange={(e) => {
                                  const newPages = [...settingsForm.additionalPages];
                                  newPages[index].content = e.target.value;
                                  setSettingsForm({ ...settingsForm, additionalPages: newPages });
                                }}
                                placeholder="Write your custom page content here using markdown or plain text..."
                                rows={4}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {settingsForm.additionalPages.length === 0 && (
                        <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <FileText className="w-8 h-8" />
                          </div>
                          <p className="text-slate-900 font-bold mb-1">No custom pages yet</p>
                          <p className="text-slate-500 text-sm mb-6">Add FAQs, About Us, or any other custom content.</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSettingsForm({
                              ...settingsForm,
                              additionalPages: [...settingsForm.additionalPages, { title: '', content: '' }]
                            })}
                          >
                            Create Your First Page
                          </Button>
                        </div>
                      )}
                    </div>

                    {settingsForm.additionalPages.length > 0 && (
                      <div className="flex justify-end pt-8 mt-8 border-t border-slate-100">
                        <Button 
                          onClick={handleUpdateAdditionalPages}
                          loading={savingSection === 'additionalPages'}
                          variant={savedSection === 'additionalPages' ? 'success' : 'primary'}
                        >
                          {savedSection === 'additionalPages' ? 'All Pages Saved' : 'Save All Custom Pages'}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </section>

              {/* Account Details Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-none shadow-xl shadow-slate-200/50">
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        <Users className="w-5 h-5" />
                      </div>
                      <h3 className="font-black text-slate-900 uppercase tracking-wider text-xs">Personal Profile</h3>
                    </div>
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">First Name</p>
                          <p className="font-bold text-slate-900">{user?.firstName || 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Name</p>
                          <p className="font-bold text-slate-900">{user?.lastName || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                        <p className="font-bold text-slate-900">{user?.email}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Store Owner ID</p>
                        <p className="font-mono text-xs text-slate-500 break-all">{user?.id}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="border-none shadow-xl shadow-slate-200/50 bg-blue-600 text-white">
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <h3 className="font-black uppercase tracking-wider text-xs">Platform Status</h3>
                      </div>
                      <Badge className="bg-white text-blue-600 font-black border-none px-3 py-1 text-[10px] uppercase">
                        {seller?.subscription?.plan || 'Starter'} Plan
                      </Badge>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="p-5 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                        <div className="flex justify-between items-center mb-4">
                          <p className="text-blue-100 text-xs font-bold uppercase tracking-tight">Billing Status</p>
                          <p className="font-black text-sm uppercase">{seller?.subscription?.status || 'Active'}</p>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-white w-full"></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                          <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-1">Shop Type</p>
                          <p className="font-black text-sm uppercase">{seller?.shopType || 'Retail'}</p>
                        </div>
                        <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                          <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-1">Join Date</p>
                          <p className="font-black text-sm">
                            {seller?.createdAt ? new Date(seller.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="pt-4 flex justify-center">
                        <p className="text-xs text-blue-100 font-medium">Your account is in good standing.</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Product Popup */}
      <Popup
        isOpen={isProductPopupOpen}
        onClose={() => {
          setIsProductPopupOpen(false);
          setEditingProduct(null);
          setProductForm({ 
            name: '', 
            description: '', 
            price: '', 
            category: '', 
            stock: '0', 
            status: 'active',
            type: seller?.shopType || 'product',
            images: '',
            videos: '',
            urls: ''
          });
        }}
        title={editingProduct ? (isServiceShop ? "Edit Service" : (isPaymentShop ? "Edit Payment Item" : "Edit Product")) : (isServiceShop ? "Add New Service" : (isPaymentShop ? "Add New Payment Item" : "Add New Product"))}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label={isServiceShop ? "Service Name" : (isPaymentShop ? "Payment Item Name" : "Product Name")}
            placeholder={isServiceShop ? "Enter service name" : (isPaymentShop ? "Enter item name" : "Enter product name")}
            value={productForm.name}
            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
          />
          <Textarea
            label="Description"
            placeholder={isServiceShop ? "Enter service description" : (isPaymentShop ? "Enter payment item description" : "Enter product description")}
            rows={3}
            value={productForm.description}
            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price"
              type="number"
              placeholder="0.00"
              value={productForm.price}
              onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
            />
            {(!isServiceShop && !isPaymentShop) && (
              <Input
                label="Stock"
                type="number"
                placeholder="0"
                value={productForm.stock}
                onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
              />
            )}
            {(isServiceShop || isPaymentShop) && (
              <Select
                label="Type"
                options={[
                  { value: 'service', label: 'Service' },
                  { value: 'product', label: 'Product' },
                  { value: 'payment', label: 'Payment' },
                ]}
                value={productForm.type}
                onChange={(e) => setProductForm({ ...productForm, type: e.target.value as any })}
              />
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Upload Product Images</label>
              <input
                type="file"
                multiple
                accept="image/*"
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={(e) => {
                  if (e.target.files) {
                    setImageFiles(Array.from(e.target.files));
                  }
                }}
              />
              {imageFiles.length > 0 && <p className="text-xs text-blue-600">{imageFiles.length} images selected</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Upload Product Videos</label>
              <input
                type="file"
                multiple
                accept="video/*"
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={(e) => {
                  if (e.target.files) {
                    setVideoFiles(Array.from(e.target.files));
                  }
                }}
              />
              {videoFiles.length > 0 && <p className="text-xs text-blue-600">{videoFiles.length} videos selected</p>}
            </div>
          </div>
          <Input
            label="Image URLs (comma separated)"
            placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
            value={productForm.images}
            onChange={(e) => setProductForm({ ...productForm, images: e.target.value })}
          />
          <Input
            label="Video URLs (comma separated)"
            placeholder="https://example.com/video1.mp4"
            value={productForm.videos}
            onChange={(e) => setProductForm({ ...productForm, videos: e.target.value })}
          />
          <Input
            label="External Links/URLs (comma separated)"
            placeholder="https://example.com/docs"
            value={productForm.urls}
            onChange={(e) => setProductForm({ ...productForm, urls: e.target.value })}
          />
          <div className="space-y-4">
            <Select
              label="Category"
              options={[
                ...(isServiceShop ? [
                  { value: 'Consulting', label: 'Consulting' },
                  { value: 'Marketing', label: 'Marketing' },
                  { value: 'Design', label: 'Design' },
                  { value: 'IT Support', label: 'IT Support' },
                  { value: 'Health & Wellness', label: 'Health & Wellness' },
                  { value: 'Education', label: 'Education' },
                  { value: 'Maintenance', label: 'Maintenance' },
                ] : (isPaymentShop ? [
                  { value: 'Checkout', label: 'Checkout' },
                  { value: 'Subscription', label: 'Subscription' },
                  { value: 'Donation', label: 'Donation' },
                  { value: 'Service Fee', label: 'Service Fee' },
                  { value: 'Digital Product', label: 'Digital Product' },
                  { value: 'Membership', label: 'Membership' },
                ] : [
                  { value: 'Electronics', label: 'Electronics' },
                  { value: 'Fashion', label: 'Fashion' },
                  { value: 'Accessories', label: 'Accessories' },
                  { value: 'Clothing', label: 'Clothing' },
                  { value: 'Home & Garden', label: 'Home & Garden' },
                  { value: 'Beauty', label: 'Beauty' },
                  { value: 'Health', label: 'Health' },
                  { value: 'Food & Drink', label: 'Food & Drink' },
                  { value: 'Sports', label: 'Sports' },
                  { value: 'Toys', label: 'Toys' },
                ])),
                ...categories.map(cat => ({ value: cat.name, label: cat.name })),
                { value: 'custom', label: '+ Add Custom Category' },
                { value: 'Other', label: 'Other' }
              ]}
              value={productForm.category}
              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
            />
            
            {productForm.category === 'custom' && (
              <Input
                label="Custom Category Name"
                placeholder="Enter new category name"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            )}
          </div>
          <Select
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'draft', label: 'Draft' },
              { value: 'archived', label: 'Archived' },
            ]}
            value={productForm.status}
            onChange={(e) => setProductForm({ ...productForm, status: e.target.value as any })}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => {
              setIsProductPopupOpen(false);
              setEditingProduct(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct} disabled={isUploading}>
              {isUploading ? 'Uploading...' : (editingProduct ? 'Save Changes' : (isServiceShop ? 'Add Service' : 'Add Product'))}
            </Button>
          </div>
        </div>
      </Popup>

      <ConfirmPopup
        isOpen={!!confirmDeleteProductId}
        onClose={() => setConfirmDeleteProductId(null)}
        onConfirm={() => { if (confirmDeleteProductId) handleDeleteProduct(confirmDeleteProductId); }}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmPopup
        isOpen={!!confirmDeleteMessageId}
        onClose={() => setConfirmDeleteMessageId(null)}
        onConfirm={() => { if (confirmDeleteMessageId) deleteMessage(confirmDeleteMessageId); }}
        title="Delete Message"
        message="Are you sure you want to delete this message permanently? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
