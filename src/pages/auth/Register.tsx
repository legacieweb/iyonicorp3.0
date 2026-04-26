import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Card } from '../../components/ui';
import { Store, Users, Eye, EyeOff, CheckCircle, ArrowLeft, Package, Briefcase, Link as LinkIcon } from 'lucide-react';

interface RegisterProps {
  onSwitchToLogin: () => void;
  onBackToHomepage?: () => void;
  preselectedRole?: 'seller' | 'seller_manager' | 'customer' | null;
  managerSlug?: string | null;
  sellerId?: string | null;
}

export const Register: React.FC<RegisterProps> = ({ 
  onSwitchToLogin, 
  onBackToHomepage,
  preselectedRole,
  managerSlug,
  sellerId: initialSellerId
}) => {
  const { register, linkStore, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: (initialSellerId ? 'customer' : (managerSlug ? 'seller' : (preselectedRole || 'seller'))) as 'seller' | 'seller_manager' | 'customer',
    storeName: '',
    subdomain: '',
    shopType: 'product' as 'product' | 'service',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [managerInfo, setManagerInfo] = useState<any>(null);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [managerLoading, setManagerLoading] = useState(false);
  const [mergeRequired, setMergeRequired] = useState(false);
  const [mergeMessage, setMergeMessage] = useState('');

  useEffect(() => {
    if (managerSlug && formData.role === 'seller') {
      setManagerLoading(true);
      import('../../services/api').then(async ({ sellerManagersAPI }) => {
        try {
          const manager = await sellerManagersAPI.getBySlug(managerSlug);
          setManagerInfo(manager);
        } catch (err) {
          console.error('Failed to load manager info:', err);
        } finally {
          setManagerLoading(false);
        }
      });
    }

    if (initialSellerId) {
      import('../../services/api').then(async ({ sellersAPI }) => {
        try {
          const store = await sellersAPI.getPublicById(initialSellerId);
          setStoreInfo(store);
          setFormData(prev => ({ ...prev, role: 'customer' }));
        } catch (err) {
          console.error('Failed to load store info:', err);
        }
      });
    }
  }, [managerSlug, formData.role, initialSellerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await register({
        name: `${formData.firstName} ${formData.lastName}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        password: formData.password,
        role: formData.role as any,
        sellerId: initialSellerId || undefined,
        ...(formData.role === 'seller' ? {
          storeName: formData.storeName,
          subdomain: formData.subdomain,
          shopType: formData.shopType,
          managerId: managerInfo?.id,
        } : {}),
      });
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.mergeRequired) {
        setMergeRequired(true);
        setMergeMessage(err.response.data.message);
      } else if (err.message === 'Network Error') {
        setError('Connection to backend failed. Make sure the server is running on port 5000.');
      } else {
        setError(err.response?.data?.message || 'Registration failed. Please try again.');
      }
    }
  };

  const handleLinkStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await linkStore({
        email: formData.email,
        password: formData.password,
        sellerId: initialSellerId
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to link account. Please check your password.');
    }
  };

  if (mergeRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Found!</h1>
            <p className="text-gray-600 mb-4">{mergeMessage}</p>
          </div>
          
          <form onSubmit={handleLinkStore} className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-6">
              <p className="text-sm text-gray-700">
                To link your existing <strong>{formData.email}</strong> account to this store, please confirm your password.
              </p>
            </div>
            
            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="bg-white border-gray-200 rounded-xl"
            />
            
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl shadow-lg"
              isLoading={isLoading}
            >
              Confirm & Continue to Store
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-2xl"
              onClick={() => setMergeRequired(false)}
            >
              Go Back
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const benefits = {
    seller: [
      'AI-Powered Shop Management',
      'Instant IyonicPay Integration',
      'Advanced AI Sales Analytics',
      'Custom Branded Domains (.com/.net)',
      'Zero Platform Transaction Fees',
    ],
    seller_manager: [
      'Multi-Seller AI Command Center',
      'Real-time Revenue & Performance Tracking',
      'Customizable Pricing Plans for Sellers',
      'Priority 24/7 Manager Support',
      'Automated Commission Payout System',
    ],
    customer: initialSellerId ? [
      'Shop from our store',
      'Track your orders in real-time',
      'Securely pay with IyonicPay',
      'Manage your favorite products',
      'Get personalized recommendations',
    ] : [
      'Shop from thousands of stores',
      'Track your orders in real-time',
      'Securely pay with IyonicPay',
      'Manage your favorite products',
      'Get personalized recommendations',
    ],
  };

  const getThemeStyles = () => {
    if (!storeInfo?.theme?.primaryColor) return {};
    return {
      '--theme-primary': storeInfo.theme.primaryColor,
      '--theme-primary-hover': storeInfo.theme.secondaryColor || storeInfo.theme.primaryColor,
    } as React.CSSProperties;
  };

  const themePrimary = storeInfo?.theme?.primaryColor || '#4f46e5'; // Default indigo-600

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white" style={getThemeStyles()}>
      {/* Left Side - Information & Benefits */}
      <div 
        className="hidden md:flex md:w-2/5 p-12 text-white flex-col justify-between relative overflow-hidden"
        style={{ background: `linear-gradient(to bottom right, ${themePrimary}, ${storeInfo?.theme?.secondaryColor || '#581c87'})` }}
      >
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-12">
            {storeInfo?.logo ? (
              <img src={storeInfo.logo} alt={storeInfo.storeName} className="w-10 h-10 object-cover rounded-xl" />
            ) : (
              <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl">
                <img src="/logo.png" alt="Iyonicorp Logo" className="w-8 h-8 object-contain" />
              </div>
            )}
            <span className="text-2xl font-bold tracking-tight">{storeInfo?.storeName || 'Iyonicorp'}</span>
          </div>
          
          <h2 className="text-4xl font-extrabold leading-tight mb-6">
            {storeInfo ? `Join ${storeInfo.storeName}` : 'Start your journey'} <br />
            <span className="text-purple-300">with us today.</span>
          </h2>
          <p className="text-lg text-purple-100 max-w-md mb-8">
            {storeInfo 
              ? `Become a member of ${storeInfo.storeName} and enjoy exclusive benefits, track your orders, and more.`
              : 'Join the fastest growing platform for sellers and managers. Everything you need to succeed in one place.'}
          </p>
          
          <div className="space-y-6">
            <div className={`p-6 rounded-2xl backdrop-blur-md border transition-all duration-500 ${
              formData.role === 'seller' 
                ? 'bg-blue-500/10 border-blue-400/30' 
                : formData.role === 'customer'
                ? 'bg-green-500/10 border-green-400/30'
                : 'bg-purple-500/10 border-purple-400/30'
            }`}>
              <h3 className="text-xl font-bold mb-4 flex items-center">
                {formData.role === 'seller' ? (
                  <><Store className="w-6 h-6 mr-2 text-blue-300" /> Seller Benefits</>
                ) : formData.role === 'customer' ? (
                  <><Package className="w-6 h-6 mr-2 text-green-300" /> Customer Benefits</>
                ) : (
                  <><Users className="w-6 h-6 mr-2 text-purple-300" /> Manager Benefits</>
                )}
              </h3>
              <ul className="space-y-3">
                {benefits[formData.role].map((benefit, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-400" />
                    <span className="text-sm text-gray-100 leading-relaxed">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                <p className="text-2xl font-bold text-white">{initialSellerId ? 'Verified' : '10K+'}</p>
                <p className="text-xs text-purple-200 uppercase tracking-wider">{initialSellerId ? 'Shop' : 'Active Sellers'}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                <p className="text-2xl font-bold text-white">24/7</p>
                <p className="text-xs text-purple-200 uppercase tracking-wider">Expert Support</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-1/4 -right-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 text-purple-200 text-sm">
          © 2026 Iyonicorp.
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50/50 overflow-y-auto">
        <div className="w-full max-w-xl py-12">
          {/* Mobile Logo */}
          <div className="md:hidden flex items-center justify-center space-x-2 mb-8" style={{ color: themePrimary }}>
            {storeInfo?.logo ? (
              <img src={storeInfo.logo} alt={storeInfo.storeName} className="w-8 h-8 object-cover rounded-xl" />
            ) : (
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/logo.png" alt="Iyonicorp" className="w-8 h-8 object-contain" />
              </div>
            )}
            <span className="text-2xl font-bold">{storeInfo?.storeName || 'Iyonicorp'}</span>
          </div>

          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h1>
            <p className="text-gray-500">Fill in the details below to get started</p>
          </div>

          {managerLoading && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-100 rounded-2xl flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
              <p className="text-sm text-purple-700 font-medium">Loading manager info...</p>
            </div>
          )}

          {managerInfo && formData.role === 'seller' && (
            <div className="mb-6 p-5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl">
              <div className="flex items-center space-x-3 mb-2">
                <LinkIcon className="w-5 h-5 text-purple-600" />
                <p className="text-sm font-bold text-purple-900 uppercase tracking-wide">Joining via Manager</p>
              </div>
              <p className="text-lg font-bold text-gray-900">{managerInfo.displayName || managerInfo.name}</p>
              {managerInfo.description && <p className="text-sm text-gray-600 mt-1">{managerInfo.description}</p>}
              {managerInfo.pricingConfig && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(managerInfo.pricingConfig.plans || {}).map(([key, plan]: [string, any]) => (
                    <span key={key} className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-purple-700 border border-purple-100 capitalize">
                      {key}: ${plan.price}/mo
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection Tabs */}
            {!initialSellerId && !managerSlug && (
              <div className="bg-gray-100 p-1 rounded-2xl flex max-w-lg mx-auto md:mx-0">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'seller' })}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center space-x-1 ${
                    formData.role === 'seller'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Seller</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'seller_manager' })}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center space-x-1 ${
                    formData.role === 'seller_manager'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Manager</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'customer' })}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center space-x-1 ${
                    formData.role === 'customer'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Customer</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="First Name"
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="bg-white border-gray-200 rounded-xl"
              />
              <Input
                label="Last Name"
                type="text"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="bg-white border-gray-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-white border-gray-200 rounded-xl"
              />
              <Input
                label="Phone Number"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                required
                className="bg-white border-gray-200 rounded-xl"
              />
            </div>

            {formData.role === 'seller' && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <p className="text-sm font-semibold text-blue-900 mb-3">Shop Type</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, shopType: 'product' })}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        formData.shopType === 'product'
                          ? 'border-blue-500 bg-white shadow-sm'
                          : 'border-transparent bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <Package className={`w-5 h-5 mb-1 ${formData.shopType === 'product' ? 'text-blue-600' : 'text-gray-500'}`} />
                      <p className={`text-sm font-bold ${formData.shopType === 'product' ? 'text-blue-900' : 'text-gray-700'}`}>Product Shop</p>
                      <p className="text-xs text-gray-500">Physical goods, inventory</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, shopType: 'service' })}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        formData.shopType === 'service'
                          ? 'border-blue-500 bg-white shadow-sm'
                          : 'border-transparent bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <Briefcase className={`w-5 h-5 mb-1 ${formData.shopType === 'service' ? 'text-blue-600' : 'text-gray-500'}`} />
                      <p className={`text-sm font-bold ${formData.shopType === 'service' ? 'text-blue-900' : 'text-gray-700'}`}>Service Shop</p>
                      <p className="text-xs text-gray-500">Consulting, repairs, help</p>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <Input
                  label="Store Name"
                  type="text"
                  placeholder="My Awesome Store"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  required
                  className="bg-white border-gray-200 rounded-xl"
                />
                <Input
                  label="Subdomain"
                  type="text"
                  placeholder="mystore"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                  helperText={`URL: ${formData.subdomain || 'mystore'}.iyonicorp.com`}
                  className="bg-white border-gray-200 rounded-xl"
                />
              </div>
            </div>
          )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
                className="bg-white border-gray-200 rounded-xl"
              />
              <Input
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="bg-white border-gray-200 rounded-xl"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-3 text-red-600">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full text-white shadow-lg py-4 rounded-2xl transition-all hover:-translate-y-0.5"
              style={{ backgroundColor: themePrimary, boxShadow: `0 10px 15px -3px ${themePrimary}40` }}
              size="lg"
              isLoading={isLoading}
            >
              Create My Account
            </Button>

            <div className="pt-6 text-center border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="font-bold hover:opacity-80 transition-colors"
                  style={{ color: themePrimary }}
                >
                  Sign in
                </button>
              </p>
            </div>
          </form>

          {onBackToHomepage && (
            <button
              onClick={onBackToHomepage}
              className="w-full mt-6 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Homepage
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
