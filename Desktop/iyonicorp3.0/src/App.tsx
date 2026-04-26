import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { TenantProvider, useTenant } from './context/TenantContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import { Homepage } from './pages/Homepage';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { SellerDashboard } from './pages/seller/SellerDashboard';
import { SellerManagerDashboard } from './pages/manager/SellerManagerDashboard';
import { ManagerAdminDashboard } from './pages/admin/ManagerAdminDashboard';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import Storefront from './pages/Storefront';
import IyonicPay from './pages/IyonicPay';
import IyonicBots from './pages/IyonicBots';
import InvoicePage from './pages/InvoicePage';
import IyonicShop from './pages/IyonicShop';
import Refunds from './pages/Refunds';
import { About, Careers, Blog, Press, Documentation, APIReference, HelpCenter, Status, Privacy, Terms, Cookies, Licenses } from './pages/static';
// Removed Themes import

const getUserRedirectPath = (user: any, shopSubdomain?: string | null) => {
  if (!user) return '/login';
  
  switch (user.role) {
    case 'seller': return '/seller/dashboard';
    case 'seller_manager': return '/manager/dashboard';
    case 'manager_admin': return '/admin/dashboard';
    case 'customer': 
      if (shopSubdomain) {
        return `/shop/${shopSubdomain}`;
      }
      if (user.email.toLowerCase().includes('bot')) {
        return '/iyonicbots';
      }
      return '/customer/dashboard';
    default: return '/login';
  }
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const shopSubdomain = searchParams.get('subdomain');
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading...</p>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to={getUserRedirectPath(user, shopSubdomain)} replace />;
  }
  
  return <>{children}</>;
};

const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const shopSubdomain = searchParams.get('subdomain');
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading...</p>
      </div>
    );
  }
  
  if (isAuthenticated && user) {
    // If user is already on IyonicPay, don't redirect them away
    if (location.pathname.startsWith('/iyonicpay') || location.pathname.startsWith('/iyonicbots')) {
      return <>{children}</>;
    }

    const redirect = searchParams.get('redirect');
    if (redirect) {
      return <Navigate to={redirect} replace />;
    }

    return <Navigate to={getUserRedirectPath(user, shopSubdomain)} replace />;
  }
  
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { tenant, isMainPlatform, isLoading: tenantLoading } = useTenant();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (tenantLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading...</p>
      </div>
    );
  }

  const isPlatformRoute = 
    location.pathname.startsWith('/iyonicpay') || 
    location.pathname.startsWith('/customer') ||
    location.pathname.startsWith('/seller') ||
    location.pathname.startsWith('/manager') ||
    location.pathname.startsWith('/admin') ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/refunds';

  if (!isMainPlatform && tenant && !isPlatformRoute) {
    return <Storefront />;
  }

  const handleGetStarted = (role: 'seller' | 'seller_manager') => {
    const searchParams = new URLSearchParams(location.search);
    const managerSlug = searchParams.get('manager');
    const registerPath = managerSlug ? `/register?manager=${managerSlug}` : '/register';
    navigate(`${registerPath}?role=${role}`);
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleBackToHomepage = () => {
    navigate('/');
  };

  const handleOpenIyonicPay = () => {
    navigate('/iyonicpay');
  };

  const handleOpenIyonicBots = () => {
    navigate('/iyonicbots');
  };

  return (
    <Routes location={location}>
      <Route path="/" element={
        isAuthenticated && user ? (
          location.pathname.startsWith('/iyonicpay') || 
          location.pathname.startsWith('/iyonicbots') ||
          location.pathname.includes('/shop/') ? null : (
            <Navigate to={getUserRedirectPath(user)} replace />
          )
        ) : (
          <Homepage 
            onGetStarted={handleGetStarted} 
            onSignIn={handleSignIn} 
            onOpenIyonicPay={handleOpenIyonicPay}
            onOpenIyonicBots={handleOpenIyonicBots}
          />
        )
      } />
      
      <Route path="/login" element={
        <AuthRoute>
          <LoginWrapper onSwitchToRegister={() => navigate('/register')} onBackToHomepage={handleBackToHomepage} />
        </AuthRoute>
      } />
      
      <Route path="/register" element={
        <AuthRoute>
          <RegisterWrapper />
        </AuthRoute>
      } />

      <Route path="/customer/*" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/seller/*" element={
        <ProtectedRoute allowedRoles={['seller']}>
          <SellerDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/manager/*" element={
        <ProtectedRoute allowedRoles={['seller_manager']}>
          <SellerManagerDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['manager_admin']}>
          <ManagerAdminDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/iyonicpay/invoice/:token" element={<InvoicePage />} />
      <Route path="/iyonicpay/*" element={<IyonicPay />} />
      <Route path="/refunds" element={<Refunds />} />
      <Route path="/iyonicbots/*" element={<IyonicBots />} />
      <Route path="/iyonicshop" element={
        isAuthenticated && user ? (
          <Navigate to={getUserRedirectPath(user)} replace />
        ) : (
          <IyonicShop 
            onGetStarted={handleGetStarted} 
            onSignIn={handleSignIn} 
          />
        )
      } />
      
      <Route path="/about" element={<About />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/press" element={<Press />} />
      <Route path="/documentation" element={<Documentation />} />
      <Route path="/api-reference" element={<APIReference />} />
      <Route path="/help-center" element={<HelpCenter />} />
      <Route path="/status" element={<Status />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/cookies" element={<Cookies />} />
      <Route path="/licenses" element={<Licenses />} />
      
      <Route path="/shop/demo" element={<Storefront />} />
      <Route path="/shop/:subdomain" element={<Storefront />} />
      <Route path="/m/:slug" element={<ManagerPublicPage />} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const LoginWrapper: React.FC<{ onSwitchToRegister: () => void; onBackToHomepage: () => void }> = ({ onSwitchToRegister, onBackToHomepage }) => {
  const [searchParams] = useSearchParams();
  const sellerId = searchParams.get('shop');
  const subdomain = searchParams.get('subdomain');
  const navigate = useNavigate();
  
  return (
    <Login 
      onSwitchToRegister={() => {
        const params = new URLSearchParams(searchParams.toString());
        navigate(`/register?${params.toString()}`);
      }}
      onBackToHomepage={onBackToHomepage}
      sellerId={sellerId}
    />
  );
};

const RegisterWrapper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const roleParam = searchParams.get('role') as 'seller' | 'seller_manager' | 'customer' | null;
  const managerSlug = searchParams.get('manager');
  const sellerId = searchParams.get('shop');
  
  return (
    <Register 
      onSwitchToLogin={() => {
        const params = new URLSearchParams(searchParams.toString());
        navigate(`/login?${params.toString()}`);
      }}
      onBackToHomepage={() => navigate('/')}
      preselectedRole={roleParam}
      managerSlug={managerSlug}
      sellerId={sellerId}
    />
  );
};

const ManagerPublicPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [manager, setManager] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const navigate = useNavigate();
  
  React.useEffect(() => {
    if (!slug) return;
    const fetchManager = async () => {
      try {
        const { sellerManagersAPI } = await import('./services/api');
        const data = await sellerManagersAPI.getBySlug(slug!);
        setManager(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Manager not found');
      } finally {
        setLoading(false);
      }
    };
    fetchManager();
  }, [slug]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  if (error || !manager) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Manager Not Found</h1>
        <p className="text-gray-500 mb-6">{error || 'The manager page you are looking for does not exist.'}</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700">
          Go to Homepage
        </button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
            <span className="text-4xl font-black text-white">{(manager.displayName || manager.name).charAt(0).toUpperCase()}</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-4">{manager.displayName || manager.name}</h1>
          {manager.description && <p className="text-xl text-gray-500 mb-8 max-w-2xl mx-auto">{manager.description}</p>}
          
          <div className="grid grid-cols-3 gap-8 mb-12 max-w-lg mx-auto">
            <div>
              <p className="text-3xl font-black text-purple-600">{manager.sellerCount || 0}</p>
              <p className="text-sm text-gray-500 font-semibold uppercase">Sellers</p>
            </div>
            <div>
              <p className="text-3xl font-black text-purple-600">{((manager.commission || 0) * 100).toFixed(0)}%</p>
              <p className="text-sm text-gray-500 font-semibold uppercase">Commission</p>
            </div>
            <div>
              <p className="text-3xl font-black text-purple-600">Active</p>
              <p className="text-sm text-gray-500 font-semibold uppercase">Status</p>
            </div>
          </div>
          
          {manager.pricingConfig && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Seller Plans</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {Object.entries(manager.pricingConfig.plans || {}).map(([key, plan]: [string, any]) => (
                  <div key={key} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 capitalize mb-2">{key}</h3>
                    <p className="text-3xl font-black text-purple-600 mb-4">${plan.price}<span className="text-sm text-gray-500 font-normal">/mo</span></p>
                    <ul className="text-left space-y-2">
                      {plan.features?.map((f: string, i: number) => (
                        <li key={i} className="text-sm text-gray-600 flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate(`/register?role=seller&manager=${manager.slug}`)}
              className="px-8 py-4 bg-purple-600 text-white rounded-2xl font-bold text-lg hover:bg-purple-700 shadow-xl shadow-purple-200 transition-all hover:-translate-y-0.5"
            >
              Join as Seller
            </button>
            <button 
              onClick={() => navigate('/')}
              className="px-8 py-4 bg-white text-gray-700 rounded-2xl font-bold text-lg border-2 border-gray-200 hover:bg-gray-50 transition-all"
            >
              Explore Platform
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <TenantProvider>
      <AuthProvider>
        <ToastProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
        </ToastProvider>
      </AuthProvider>
    </TenantProvider>
  );
}

export default App;
