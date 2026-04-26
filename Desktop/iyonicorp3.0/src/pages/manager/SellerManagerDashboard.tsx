import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, Button, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Popup, ConfirmPopup, Input, Select, Textarea } from '../../components/ui';
import { 
  Users, Store, DollarSign, TrendingUp, Plus, Eye, Settings, LogOut, BarChart3, Shield,
  AlertCircle, CheckCircle, Search, ExternalLink, Copy, Link as LinkIcon, UserPlus, UserMinus,
  CreditCard, Package, ShoppingCart, Edit3, Save, X, Clock
} from 'lucide-react';

type TabType = 'overview' | 'sellers' | 'customers' | 'orders' | 'pricing' | 'settings' | 'billing';

const BillingSection = ({ manager, sellersCount, onUpgrade }: { manager: any, sellersCount: number, onUpgrade: (plan: string) => void }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number }>({ days: 0, hours: 0, minutes: 0 });
  const subscription = manager?.subscription || { plan: 'standard', status: 'active', endDate: null };
  const isActive = manager?.isActive;
  
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

  const tiers = [
    { id: 'starter', name: 'Starter', price: 0, limit: 5, features: ['$0/month', 'Manage up to 5 sellers', 'Charge sellers $0 (Starter)', 'Keep 100% of profits'] },
    { id: 'basic', name: 'Basic', price: 25, limit: 10, features: ['$25/month', 'Manage up to 10 sellers', '40% Subscription Commission'] },
    { id: 'professional', name: 'Professional', price: 49, limit: 17, features: ['$49/month', 'Manage up to 17 sellers', '4 Free Basic Sellers'] },
    { id: 'enterprise', name: 'Enterprise', price: 149, limit: Infinity, features: ['$149/month', 'Unlimited Sellers', '6 Free Professional Sellers', 'Custom Pricing Models'] }
  ];

  const currentTier = tiers.find(t => t.id === subscription.plan) || tiers[0];
  const usagePercentage = currentTier.limit === Infinity ? 0 : (sellersCount / currentTier.limit) * 100;

  return (
    <div className="space-y-8">
      {!isActive && (
        <Card className="bg-amber-50 border-amber-200">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-amber-900">Account Activation Required</h4>
              <p className="text-sm text-amber-700">Choose a plan below to pay your activation fee and start managing sellers.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <Card className="flex-1 bg-gradient-to-br from-purple-600 to-indigo-700 text-white border-none">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-purple-100 text-sm font-bold uppercase tracking-wider mb-1">Manager Plan</p>
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
                <p className="text-xs text-purple-100 font-medium">Expires in</p>
                <p className="font-bold">
                  {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
                </p>
              </div>
            </div>
            
            <div className="pt-4">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-purple-100 font-medium">Sellers: {sellersCount} / {currentTier.limit === Infinity ? '∞' : currentTier.limit}</span>
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
          <CardHeader title="Manager Tools" />
          <div className="space-y-3">
            <Button className="w-full justify-start" variant="outline" leftIcon={<CreditCard className="w-4 h-4" />}>
              Payment History
            </Button>
            <Button className="w-full justify-start" variant="outline" leftIcon={<Shield className="w-4 h-4" />}>
              Security Settings
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {tiers.map((tier) => (
          <Card key={tier.id} className={`relative flex flex-col ${subscription.plan === tier.id ? 'border-purple-600 ring-1 ring-purple-600' : ''}`}>
            {subscription.plan === tier.id && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
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
              {subscription.plan === tier.id ? 'Current Plan' : 'Upgrade to ' + tier.name}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const SellerManagerDashboard: React.FC = () => {
  const { showToast } = useToast();
  const { user, logout } = useAuth();
  const { 
    sellers, sellerManagers, refreshData,
    managerOrders, managerCustomers, managerAnalytics, availableSellers,
    assignSeller, unassignSeller, updateManagerPricing
  } = useData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [approvingSeller, setApprovingSeller] = useState<any>(null);
  const [approvalSubdomain, setApprovalSubdomain] = useState('');
  const [showAssignPopup, setShowAssignPopup] = useState(false);
  const [showPricingEditor, setShowPricingEditor] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [pricingForm, setPricingForm] = useState<any>(null);
  const [confirmUnassignId, setConfirmUnassignId] = useState<string | null>(null);

  const manager = sellerManagers.find(m => m.userId === user?.id);
  const managedSellers = sellers;

  // Fixed default seller pricing - only Enterprise can modify
  const defaultSellerPlans = {
    starter: { 
      price: 0, 
      status: 'active', 
      productLimit: 20,
      sellerLimit: 5,
      features: [
        'Up to 20 Products', 
        'IyonicPay Integration Only',
        '7% Transaction Commission',
        'Basic IyonicBots Access'
      ] 
    },
    basic: { 
      price: 15, 
      status: 'active', 
      productLimit: 100,
      sellerLimit: 10,
      features: [
        'Up to 100 Products', 
        'Custom Payment Gateways', 
        'Advanced AI Analytics',
        'Priority Support'
      ] 
    },
    professional: { 
      price: 29, 
      status: 'active', 
      productLimit: Infinity,
      sellerLimit: 17,
      features: [
        'Unlimited Products & Services', 
        'Custom Domain (.com/.net)', 
        'Advanced AI SEO Tools', 
        'Zero Transaction Fees',
        'IyonicBot Assistant (Basic)'
      ] 
    },
    enterprise: { 
      price: 99, 
      status: 'active', 
      productLimit: Infinity,
      sellerLimit: Infinity,
      features: [
        'Full AI Shop Automation', 
        'Priority 24/7 Support', 
        'Custom API Access', 
        'Multi-staff Accounts',
        'Advanced Fraud Protection',
        'Dedicated Account Manager'
      ] 
    }
  };

  useEffect(() => {
    if (manager) {
      setNewSlug(manager.slug || '');
      
      if (manager.pricingConfig) {
        // Merge existing config with defaults to ensure all plans exist
        const merged = {
          ...manager.pricingConfig,
          plans: {
            ...defaultSellerPlans,
            ...(manager.pricingConfig.plans || {})
          }
        };
        setPricingForm(merged);
      } else {
        // Set default Iyonicorp pricing config
        setPricingForm({
          plans: defaultSellerPlans,
          currency: 'USD',
          billingCycle: 'monthly'
        });
      }
    }
  }, [manager]);

  const handleApproveSubdomain = async () => {
    if (!approvingSeller) return;
    
    // Check expiration
    if (isExpired && manager.subscription?.plan !== 'starter') {
      showToast('Your subscription has expired. Please renew to manage sellers.', 'error');
      setActiveTab('billing');
      return;
    }

    try {
      const { sellersAPI } = await import('../../services/api');
      await sellersAPI.approveSubdomain(approvingSeller.id, approvalSubdomain);
      setApprovingSeller(null);
      showToast('Subdomain approved successfully', 'success');
      refreshData();
    } catch (err) {
      console.error(err);
      showToast('Failed to approve subdomain', 'error');
    }
  };

  const handleAssignSeller = async (sellerId: string) => {
    // Check expiration
    if (isExpired && manager.subscription?.plan !== 'starter') {
      showToast('Your subscription has expired. Please renew to manage sellers.', 'error');
      setActiveTab('billing');
      return;
    }

    // Check limits
    const subscription = manager?.subscription || { plan: 'starter' };
    
    // Get limits from pricingConfig if available, otherwise use defaults
    const currentPlanConfig = manager?.pricingConfig?.plans?.[subscription.plan];
    const sellerLimit = currentPlanConfig?.sellerLimit !== undefined 
      ? currentPlanConfig.sellerLimit 
      : (subscription.plan === 'starter' ? 5 : (subscription.plan === 'basic' ? 10 : (subscription.plan === 'professional' ? 17 : Infinity)));
    
    if (managedSellers.length >= sellerLimit) {
      showToast(`You have reached the seller limit for the ${subscription.plan} plan (${sellerLimit} sellers). Please upgrade to add more.`, 'warning');
      setActiveTab('billing');
      return;
    }

    try {
      await assignSeller(sellerId);
      setShowAssignPopup(false);
      showToast('Seller assigned successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to assign seller', 'error');
    }
  };

  const handleUnassignSeller = async (sellerId: string) => {
    try {
      await unassignSeller(sellerId);
      setConfirmUnassignId(null);
      showToast('Seller unassigned successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to unassign seller', 'error');
    }
  };

  const handleSavePricing = async () => {
    try {
      if (pricingForm.commissionRate) {
        const { sellerManagersAPI } = await import('../../services/api');
        await sellerManagersAPI.updateProfile({ commissionRate: pricingForm.commissionRate / 100 });
      }
      await updateManagerPricing(pricingForm);
      setShowPricingEditor(false);
      showToast('Pricing configuration saved', 'success');
      refreshData();
    } catch (err) {
      console.error(err);
      showToast('Failed to save pricing', 'error');
    }
  };

  const handleSaveSlug = async () => {
    try {
      const { sellerManagersAPI } = await import('../../services/api');
      await sellerManagersAPI.updateSlug(newSlug);
      setEditingSlug(false);
      showToast('Manager URL updated successfully', 'success');
      refreshData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update slug', 'error');
    }
  };

  const copyManagerUrl = () => {
    const url = `${window.location.origin}${window.location.pathname}#/m/${manager?.slug}`;
    navigator.clipboard.writeText(url);
  };

  if (!manager) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
        <p className="text-gray-500 font-medium">Loading your manager dashboard...</p>
      </div>
    );
  }

  const filteredSellers = managedSellers.filter(seller => {
    const matchesSearch = seller.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.subdomain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || seller.subscription?.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredCustomers = managerCustomers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      active: 'success', suspended: 'danger', cancelled: 'warning',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, 'info' | 'purple' | 'success'> = {
      starter: 'info', professional: 'purple', enterprise: 'success',
    };
    return <Badge variant={variants[plan] || 'default'}>{plan}</Badge>;
  };

  const isPricingEditable = manager?.subscription?.plan === 'enterprise';

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'sellers', label: 'My Sellers', icon: <Store className="w-5 h-5" /> },
    { id: 'customers', label: 'Customers', icon: <Users className="w-5 h-5" /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'pricing', label: 'Pricing', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'billing', label: 'Billing', icon: <DollarSign className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const handleUpgrade = async (planId: string) => {
    if (!user?.email) return;

    const pricing = [
      { id: 'starter', price: 0 },
      { id: 'basic', price: 25 },
      { id: 'professional', price: 49 },
      { id: 'enterprise', price: 149 }
    ];
    const plan = pricing.find(p => p.id === planId);
    
    if (!plan || plan.price === 0) {
      try {
        const { sellerManagersAPI } = await import('../../services/api');
        await sellerManagersAPI.update(manager.id, {
          isActive: true,
          subscription: {
            plan: planId as any,
            status: 'active',
            startDate: new Date().toISOString(),
            endDate: null
          }
        });
        refreshData();
      } catch (err) {
        console.error(err);
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
            
            const { sellerManagersAPI } = await import('../../services/api');
            await sellerManagersAPI.update(manager.id, {
              isActive: true,
              subscription: {
                plan: planId as any,
                status: 'active',
                startDate: new Date().toISOString(),
                endDate: nextMonth.toISOString()
              }
            });
            
            refreshData();
            showToast(`Successfully upgraded to ${planId} plan!`, 'success');
          };
          handleSuccess();
        },
        onClose: () => {
          // Handled by user closing
        }
      });
      handler.openIframe();
    } catch (error) {
      console.error('Upgrade failed:', error);
      showToast('Upgrade failed. Please try again.', 'error');
    }
  };

  const isStarter = !manager?.subscription?.plan || manager.subscription.plan === 'starter';
  const isExpired = manager?.subscription?.endDate && new Date(manager.subscription.endDate) < new Date();
  const needsActivation = !manager?.isActive;
  const needsUpgrade = (isExpired && !isStarter) || needsActivation;

  return (
    <div className="min-h-screen bg-gray-50">
      {needsUpgrade && activeTab !== 'billing' && (
        <div className="fixed inset-0 z-[200] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
          <Card className="max-w-md w-full p-10 space-y-6">
            <div className={`w-20 h-20 ${needsActivation ? 'bg-purple-100' : 'bg-red-100 text-red-600'} rounded-full flex items-center justify-center mx-auto`}>
              {needsActivation ? (
                <img src="/logo.png" alt="Iyonicorp" className="w-12 h-12 object-contain" />
              ) : <Clock className="w-10 h-10" />}
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-gray-900">{needsActivation ? 'Account Inactive' : 'Subscription Expired'}</h2>
              <p className="text-gray-500 font-medium">
                {needsActivation 
                  ? 'Your manager account needs to be activated. Please pay the activation fee to start managing sellers.' 
                  : 'Your manager subscription has expired. Please renew to continue managing your sellers.'}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button 
                size="lg" 
                className="w-full bg-purple-600 hover:bg-purple-700 font-bold"
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
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm">
              <img src="/iyonicorp logo.png" alt="Iyonicorp" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Iyonicorp</h1>
              <p className="text-xs text-gray-500">Manager Dashboard</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-50 text-purple-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="ml-64 p-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {user?.name}!</h2>
              <p className="text-gray-500">Here's an overview of your managed sellers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Sellers</p>
                    <p className="text-2xl font-bold text-gray-900">{managerAnalytics?.totalSellers || manager.stats?.totalSellers || 0}</p>
                    <p className="text-sm text-green-600 mt-1">{managerAnalytics?.activeSellers || manager.stats?.activeSellers || 0} active</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Store className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">${(managerAnalytics?.totalRevenue || manager.stats?.totalRevenue || 0).toFixed(2)}</p>
                    <p className="text-sm text-gray-500 mt-1">From all sellers</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Your Commission</p>
                    <p className="text-2xl font-bold text-gray-900">${(managerAnalytics?.totalCommission || manager.stats?.totalCommission || 0).toFixed(2)}</p>
                    <p className="text-sm text-gray-500 mt-1">{((managerAnalytics?.commissionRate || manager.commission || 0) * 100).toFixed(0)}% rate</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{managerAnalytics?.totalCustomers || 0}</p>
                    <p className="text-sm text-gray-500 mt-1">Across all sellers</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader title="Your Manager URL" subtitle="Share this link with sellers to join your team" />
                <div className="flex items-center space-x-3">
                  <div className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-sm font-mono text-gray-700 truncate">
                      {window.location.origin}{window.location.pathname}#/m/{manager.slug}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={copyManagerUrl}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </Card>

              <Card>
                <CardHeader title="Recent Sellers" subtitle="Your seller portfolio" />
                <div className="space-y-3">
                  {managedSellers.slice(0, 5).map(seller => (
                    <div key={seller.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">{seller.storeName}</p>
                        <p className="text-xs text-gray-500">{seller.subdomain}.iyonicorp.com</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getPlanBadge(seller.subscription?.plan || 'starter')}
                        {getStatusBadge(seller.subscription?.status || 'active')}
                      </div>
                    </div>
                  ))}
                  {managedSellers.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No sellers assigned yet</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Sellers Tab */}
        {activeTab === 'sellers' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">My Sellers</h2>
                <p className="text-gray-500">Manage your assigned sellers</p>
              </div>
              <div className="flex space-x-3">
                <Button leftIcon={<UserPlus className="w-5 h-5" />} onClick={() => setShowAssignPopup(true)}>
                  Assign Seller
                </Button>
              </div>
            </div>

            <Card className="mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search sellers..."
                    leftIcon={<Search className="w-5 h-5" />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'suspended', label: 'Suspended' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-40"
                />
              </div>
            </Card>

            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSellers.map(seller => (
                    <TableRow key={seller.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{seller.storeName}</p>
                          <p className="text-sm text-gray-500">{seller.subdomain}.iyonicorp.com</p>
                          {seller.requestedSubdomain && !seller.isLive && (
                            <Badge variant="warning" className="mt-1">
                              Pending: {seller.requestedSubdomain}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(seller.subscription?.plan || 'starter')}</TableCell>
                      <TableCell>{seller.stats?.totalProducts || 0}</TableCell>
                      <TableCell>{seller.stats?.totalOrders || 0}</TableCell>
                      <TableCell className="font-medium">${(seller.stats?.totalRevenue || 0).toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(seller.subscription?.status || 'active')}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {seller.requestedSubdomain && !seller.isLive && (
                            <button 
                              onClick={() => { setApprovingSeller(seller); setApprovalSubdomain(seller.requestedSubdomain || ''); }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve Domain"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <a 
                            href={`#/shop/${seller.subdomain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Preview Shop"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button 
                            onClick={() => setConfirmUnassignId(seller.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Unassign Seller"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSellers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No sellers found. Assign sellers to get started.
                      </TableCell>
                    </TableRow>
                  )}
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
              <p className="text-gray-500">Aggregated customers from all your sellers</p>
            </div>

            <Card className="mb-6">
              <Input
                placeholder="Search customers..."
                leftIcon={<Search className="w-5 h-5" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Card>

            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Stores</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Total Spent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map(customer => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {customer.stores?.slice(0, 2).map((store, i) => (
                            <Badge key={i} variant="info" className="text-xs">{store}</Badge>
                          ))}
                          {(customer.stores?.length || 0) > 2 && (
                            <Badge variant="default" className="text-xs">+{(customer.stores?.length || 0) - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{customer.totalOrders}</TableCell>
                      <TableCell className="font-medium">${(customer.totalSpent || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No customers found across your sellers
                      </TableCell>
                    </TableRow>
                  )}
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
              <p className="text-gray-500">All orders from your managed sellers</p>
            </div>

            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managerOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-sm">{order.id.slice(0, 8)}...</TableCell>
                      <TableCell>{order.sellerStoreName || 'Unknown'}</TableCell>
                      <TableCell>
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-xs text-gray-500">{order.customerEmail}</p>
                      </TableCell>
                      <TableCell className="font-medium">${Number(order.total || 0).toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {managerOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No orders from your sellers yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Pricing Configuration</h2>
                <p className="text-gray-500">Configure the plans and prices for your sellers</p>
              </div>
              {!showPricingEditor && (
                <Button leftIcon={<Edit3 className="w-5 h-5" />} onClick={() => setShowPricingEditor(true)}>
                  Edit Pricing
                </Button>
              )}
            </div>

            {showPricingEditor && pricingForm ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader title="General Settings" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {manager.subscription?.plan === 'enterprise' && (
                      <Input
                        label="Manager Commission Rate (%)"
                        type="number"
                        step="0.01"
                        value={(pricingForm.commissionRate || (manager.commissionRate * 100)) || 5}
                        onChange={(e) => {
                          const updated = { ...pricingForm };
                          updated.commissionRate = parseFloat(e.target.value);
                          setPricingForm(updated);
                        }}
                        helperText="Percentage you earn from every sale made by your sellers"
                      />
                    )}
                    <Select
                      label="Currency"
                      options={[
                        { value: 'USD', label: 'USD - US Dollar' },
                      ]}
                      value={pricingForm.currency || 'USD'}
                      onChange={(e) => {
                        const updated = { ...pricingForm };
                        updated.currency = e.target.value;
                        setPricingForm(updated);
                      }}
                    />
                  </div>
                </Card>

                {Object.entries(pricingForm.plans || {}).map(([key, plan]: [string, any]) => (
                  <Card key={key} className={!isPricingEditable ? 'opacity-75 grayscale-[0.5]' : ''}>
                    <div className="flex justify-between items-center mb-4">
                      <CardHeader title={`${key.charAt(0).toUpperCase() + key.slice(1)} Plan`} />
                      {!isPricingEditable && (
                        <Badge variant="warning">Enterprise Only</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Price ($/month)"
                        type="number"
                        value={plan.price}
                        disabled={!isPricingEditable}
                        onChange={(e) => {
                          const updated = { ...pricingForm };
                          updated.plans[key].price = parseFloat(e.target.value);
                          setPricingForm(updated);
                        }}
                      />
                      <Select
                        label="Status"
                        disabled={!isPricingEditable}
                        options={[
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' },
                        ]}
                        value={plan.status}
                        onChange={(e) => {
                          const updated = { ...pricingForm };
                          updated.plans[key].status = e.target.value;
                          setPricingForm(updated);
                        }}
                      />
                      <Input
                        label="Product Limit"
                        type="number"
                        disabled={!isPricingEditable}
                        value={plan.productLimit === Infinity ? '' : plan.productLimit}
                        placeholder="Infinity"
                        onChange={(e) => {
                          const updated = { ...pricingForm };
                          updated.plans[key].productLimit = e.target.value === '' ? Infinity : parseInt(e.target.value);
                          setPricingForm(updated);
                        }}
                        helperText="Maximum products a seller on this plan can add (leave empty for unlimited)"
                      />
                      <Input
                        label="Seller Limit (Managers only)"
                        type="number"
                        disabled={!isPricingEditable}
                        value={plan.sellerLimit === Infinity ? '' : plan.sellerLimit}
                        placeholder="Infinity"
                        onChange={(e) => {
                          const updated = { ...pricingForm };
                          updated.plans[key].sellerLimit = e.target.value === '' ? Infinity : parseInt(e.target.value);
                          setPricingForm(updated);
                        }}
                        helperText="Maximum sellers a manager on this plan can manage"
                      />
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Features (one per line)</label>
                      <Textarea
                        rows={4}
                        disabled={!isPricingEditable}
                        value={plan.features?.join('\n') || ''}
                        onChange={(e) => {
                          const updated = { ...pricingForm };
                          updated.plans[key].features = e.target.value.split('\n').filter(f => f.trim());
                          setPricingForm(updated);
                        }}
                      />
                    </div>
                  </Card>
                ))}
                <div className="flex justify-end space-x-3">
                  <Button variant="outline" leftIcon={<X className="w-4 h-4" />} onClick={() => setShowPricingEditor(false)}>
                    Cancel
                  </Button>
                  <Button leftIcon={<Save className="w-4 h-4" />} onClick={handleSavePricing}>
                    Save Pricing
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {manager.pricingConfig && (
                  <Card>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {manager.subscription?.plan === 'enterprise' && (
                        <div>
                          <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">Your Commission Rate</p>
                          <p className="text-3xl font-black text-purple-600">{(manager.commissionRate * 100).toFixed(2)}%</p>
                          <p className="text-sm text-gray-500 mt-1">Earning from every seller sale</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">Default Currency</p>
                        <p className="text-3xl font-black text-gray-900">{manager.pricingConfig.currency || 'USD'}</p>
                        <p className="text-sm text-gray-500 mt-1">Applied to all seller plans</p>
                      </div>
                    </div>
                  </Card>
                )}
                
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   {['starter', 'basic', 'professional', 'enterprise'].map((key) => {
                      // Always use default plans for the display to ensure correct base values
                      const plan = (defaultSellerPlans as any)[key];
                    
                    return (
                      <Card key={key} className={key === 'professional' ? 'border-2 border-purple-200' : ''}>
                        <div className="text-center">
                          <Badge variant={key === 'professional' ? 'purple' : key === 'enterprise' ? 'success' : key === 'basic' ? 'info' : 'default'} className="mb-4 capitalize">
                            {key}
                          </Badge>
                          <p className="text-4xl font-black text-gray-900 mb-2">${plan.price}<span className="text-lg text-gray-500 font-normal">/month</span></p>
                          <ul className="text-left space-y-2 mt-4 mb-6">
                            {plan.features?.map((f: string, i: number) => (
                              <li key={i} className="flex items-center text-sm text-gray-600">
                                <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                          
                          <div className="space-y-2 mt-auto">
                            {key === 'starter' && (
                              <Button className="w-full" variant="outline">Downgrade</Button>
                            )}
                            {key === 'basic' && (
                              <Button className="w-full">Upgrade Plan</Button>
                            )}
                            {key === 'professional' && (
                              <div className="space-y-2">
                                <Button className="w-full">Upgrade Plan</Button>
                                <Button className="w-full" variant="outline" disabled>Current Plan</Button>
                              </div>
                            )}
                            {key === 'enterprise' && (
                              <div className="space-y-2">
                                <Button className="w-full">Upgrade Plan</Button>
                                <Button className="w-full" variant="outline" disabled>Current Plan</Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
            </div>
          )}
        </div>
      )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscription</h2>
              <p className="text-gray-500">Manage your subscription and usage</p>
            </div>
            <BillingSection 
              manager={manager} 
              sellersCount={managedSellers.length} 
              onUpgrade={handleUpgrade} 
            />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Manager Settings</h2>
              <p className="text-gray-500">Configure your manager profile and preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader title="Profile Settings" subtitle="Your account information" />
                <div className="space-y-4">
                  <Input label="Full Name" defaultValue={user?.name} disabled />
                  <Input label="Email" defaultValue={user?.email} disabled />
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Your Unique URL Slug</label>
                    {editingSlug ? (
                      <div className="flex space-x-2">
                        <Input
                          value={newSlug}
                          onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          helperText="Used in: #/m/your-slug"
                        />
                        <Button size="sm" onClick={handleSaveSlug}>Save</Button>
                        <Button variant="outline" size="sm" onClick={() => { setEditingSlug(false); setNewSlug(manager.slug || ''); }}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <p className="text-sm font-mono text-gray-700">/m/{manager.slug}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setEditingSlug(true)}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <Input label="Commission Rate" defaultValue={`${(manager.commission * 100).toFixed(0)}%`} disabled />
                </div>
              </Card>

              <Card>
                <CardHeader title="Your Manager Page" subtitle="Share this with sellers to join your team" />
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <LinkIcon className="w-5 h-5 text-purple-600" />
                      <p className="text-sm font-bold text-purple-900">Manager Public Page</p>
                    </div>
                    <p className="text-sm text-purple-700 mb-3">Sellers can visit this page to see your plans and join your team.</p>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 p-2 bg-white rounded-lg border border-purple-200">
                        <p className="text-xs font-mono text-gray-700 truncate">
                          {window.location.origin}{window.location.pathname}#/m/{manager.slug}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={copyManagerUrl}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">Notification Preferences</h4>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">New Seller Signup</p>
                        <p className="text-xs text-gray-500">Get notified when a seller joins</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 text-purple-600 rounded" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">Payment Alerts</p>
                        <p className="text-xs text-gray-500">Commission payment notifications</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 text-purple-600 rounded" />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Approve Subdomain Popup */}
      <Popup isOpen={!!approvingSeller} onClose={() => setApprovingSeller(null)} title="Approve Subdomain Request" size="md">
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
            <p className="text-sm font-medium text-purple-900 mb-1">Store Name</p>
            <p className="font-bold text-purple-900">{approvingSeller?.storeName}</p>
          </div>
          <Input
            label="Assign Subdomain"
            value={approvalSubdomain}
            onChange={(e) => setApprovalSubdomain(e.target.value)}
            helperText="The subdomain requested by the seller is shown above."
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setApprovingSeller(null)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApproveSubdomain}>
              Approve & Go Live
            </Button>
          </div>
        </div>
      </Popup>

      {/* Assign Seller Popup */}
      <Popup isOpen={showAssignPopup} onClose={() => setShowAssignPopup(false)} title="Assign Seller" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Select a seller to assign to your management.</p>
          {availableSellers.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No unassigned sellers available.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableSellers.map(seller => (
                <div key={seller.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900">{seller.storeName}</p>
                    <p className="text-xs text-gray-500">{seller.subdomain}.iyonicorp.com</p>
                  </div>
                  <Button size="sm" onClick={() => handleAssignSeller(seller.id)}>
                    <UserPlus className="w-4 h-4 mr-1" /> Assign
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setShowAssignPopup(false)}>Close</Button>
          </div>
        </div>
      </Popup>

      <ConfirmPopup
        isOpen={!!confirmUnassignId}
        onClose={() => setConfirmUnassignId(null)}
        onConfirm={() => confirmUnassignId && handleUnassignSeller(confirmUnassignId)}
        title="Unassign Seller"
        message="Are you sure you want to remove this seller from your management? This will disconnect your management relationship."
        confirmText="Unassign"
        variant="danger"
      />
    </div>
  );
};
