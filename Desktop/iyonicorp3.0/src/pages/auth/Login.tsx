import React, { useState } from 'react';
import { useAuth, UserRole } from '../../context/AuthContext';
import { Button, Input, Card } from '../../components/ui';
import { Store, Shield, Users, Eye, EyeOff, ArrowLeft } from 'lucide-react';

interface LoginProps {
  onSwitchToRegister: () => void;
  onBackToHomepage?: () => void;
  sellerId?: string | null;
}

export const Login: React.FC<LoginProps> = ({ onSwitchToRegister, onBackToHomepage, sellerId: initialSellerId }) => {
  const { login, selectStore, user, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showStoreSelection, setShowStoreSelection] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>(null);

  React.useEffect(() => {
    if (initialSellerId) {
      import('../../services/api').then(async ({ sellersAPI }) => {
        try {
          const store = await sellersAPI.getPublicById(initialSellerId);
          setStoreInfo(store);
        } catch (err) {
          console.error('Failed to load store info:', err);
        }
      });
    }
  }, [initialSellerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email.trim(), password.trim());
    } catch (err: any) {
      if (err.message === 'Network Error') {
        setError('Connection to backend failed. Make sure the server is running on port 5000.');
      } else {
        setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
      }
    }
  };

  // If user is logged in and is a customer, check if we need store selection
  React.useEffect(() => {
    if (user && user.role === 'customer') {
      if (initialSellerId) {
        // If coming from a specific store, auto-select it if registered
        const isRegistered = user.stores?.some(s => s.id === initialSellerId);
        if (isRegistered) {
          selectStore(initialSellerId);
        } else {
          setShowStoreSelection(true);
        }
      } else if (user.stores && user.stores.length > 1 && !user.sellerId) {
        setShowStoreSelection(true);
      }
    }
  }, [user, initialSellerId, selectStore]);

  const themePrimary = storeInfo?.theme?.primaryColor || '#2563eb'; // Default blue-600

  if (showStoreSelection && user && user.stores) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Select a Store</h1>
            <p className="text-gray-500">Choose the store you want to shop with today</p>
          </div>
          <div className="space-y-4">
            {user.stores.map((store) => (
              <button
                key={store.id}
                onClick={() => selectStore(store.id)}
                className="w-full flex items-center p-4 bg-white border border-gray-200 rounded-2xl transition-all group"
                style={{ ['--hover-border' as any]: themePrimary }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = themePrimary}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mr-4 transition-colors"
                  style={{ backgroundColor: `${themePrimary}10`, color: themePrimary }}
                >
                  {store.logo ? (
                    <img src={store.logo} alt={store.storeName} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Store className="w-6 h-6" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900">{store.storeName}</p>
                  <p className="text-sm text-gray-500">{store.subdomain}.iyonicorp.com</p>
                </div>
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            className="w-full mt-8 rounded-2xl transition-all"
            style={{ borderColor: themePrimary, color: themePrimary }}
            onClick={() => {
              // logout or handle differently
            }}
          >
            Sign in with a different account
          </Button>
        </Card>
      </div>
    );
  }

  const getThemeStyles = () => {
    if (!storeInfo?.theme?.primaryColor) return {};
    return {
      '--theme-primary': storeInfo.theme.primaryColor,
      '--theme-primary-hover': storeInfo.theme.secondaryColor || storeInfo.theme.primaryColor,
    } as React.CSSProperties;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white" style={getThemeStyles()}>
      {/* Left Side - Branding & Illustration */}
      <div 
        className="hidden md:flex md:w-1/2 p-12 text-white flex-col justify-between relative overflow-hidden"
        style={{ background: `linear-gradient(to bottom right, ${themePrimary}, ${storeInfo?.theme?.secondaryColor || '#1e1b4b'})` }}
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
          
          <h2 className="text-5xl font-extrabold leading-tight mb-6">
            {storeInfo ? `Welcome to ${storeInfo.storeName}` : 'The future of e-commerce is here.'}
          </h2>
          <p className="text-xl text-blue-100 max-w-lg mb-8">
            {storeInfo 
              ? `Sign in to access your account at ${storeInfo.storeName}, track orders, and manage your profile.`
              : 'Empowering thousands of businesses to grow, manage, and scale their online presence with ease.'}
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <div className="w-10 h-10 bg-blue-500/30 rounded-xl flex items-center justify-center text-blue-200">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-white">Enterprise Security</p>
                <p className="text-sm text-blue-200">Bank-grade protection for your data</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <div className="w-10 h-10 bg-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-200">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-white">Multi-vendor Support</p>
                <p className="text-sm text-blue-200">Manage everything from one dashboard</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          <p className="text-blue-200 text-sm">© 2026 Iyonicorp</p>
          <div className="flex space-x-4 text-sm text-blue-200">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50/50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="md:hidden flex items-center justify-center space-x-2 mb-8" style={{ color: themePrimary }}>
            {storeInfo?.logo ? (
              <img src={storeInfo.logo} alt={storeInfo.storeName} className="w-10 h-10 object-cover rounded-xl" />
            ) : (
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/logo.png" alt="Iyonicorp Logo" className="w-8 h-8 object-contain" />
              </div>
            )}
            <span className="text-2xl font-bold">{storeInfo?.storeName || 'Iyonicorp'}</span>
          </div>

          <div className="mb-10 text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-500">Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white border-gray-200 focus:border-blue-500"
              />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">Password</label>
                  <a href="#" className="text-xs font-semibold hover:opacity-80 transition-colors" style={{ color: themePrimary }}>
                    Forgot Password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white border-gray-200 focus:border-blue-500"
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    }
                  />
                </div>
              </div>
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
              Sign In to Your Dashboard
            </Button>

            <div className="pt-6 text-center border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="font-bold hover:opacity-80 transition-colors"
                  style={{ color: themePrimary }}
                >
                  Create Account
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
