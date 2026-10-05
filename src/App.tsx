import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { TenantProvider, useTenant } from './context/TenantContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import { Homepage } from './pages/Homepage';
import { sellersAPI } from './services/api';
import { normalizeThemeId } from './utils/themeDashboard';

const Login = lazy(() => import('./pages/auth/Login').then(({ Login }) => ({ default: Login })));
const Register = lazy(() => import('./pages/auth/Register').then(({ Register }) => ({ default: Register })));
const Themes = lazy(() => import('./pages/Themes'));
const SellerDashboard = lazy(() => import('./pages/seller/SellerDashboard').then(({ SellerDashboard }) => ({ default: SellerDashboard })));
const SellerManagerDashboard = lazy(() => import('./pages/manager/SellerManagerDashboard').then(({ SellerManagerDashboard }) => ({ default: SellerManagerDashboard })));
const ManagerAdminDashboard = lazy(() => import('./pages/admin/ManagerAdminDashboard').then(({ ManagerAdminDashboard }) => ({ default: ManagerAdminDashboard })));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const Storefront = lazy(() => import('./pages/Storefront'));
const PulseFitAdmin = lazy(() => import('./platforms/services/fitness/pulse-fit/PulseFitAdmin'));
const PulseFitClient = lazy(() => import('./platforms/services/fitness/pulse-fit/PulseFitClient'));
const PulseFitServicePage = lazy(() => import('./platforms/services/fitness/pulse-fit/PulseFitServicePage'));
const AuraSalonAdmin = lazy(() => import('./platforms/services/beauty/salon/aura-salon/AuraSalonAdmin'));
const AuraSalonClient = lazy(() => import('./platforms/services/beauty/salon/aura-salon/AuraSalonClient'));
const AuraSalonServicePage = lazy(() => import('./platforms/services/beauty/salon/aura-salon/AuraSalonServicePage'));
const CraftCollectiveSite = lazy(() => import('./platforms/marketplace/craft-collective/CraftCollectiveSite'));
const CraftCollectiveAdmin = lazy(() => import('./platforms/marketplace/craft-collective/CraftCollectiveAdmin'));
const CraftCollectiveVendor = lazy(() => import('./platforms/marketplace/craft-collective/CraftCollectiveVendor'));
const PosSite = lazy(() => import('./platforms/services/pos/point-of-sale/PosSite'));
const ApexPosSite = lazy(() => import('./platforms/services/pos/apex-pos/ApexPosSite'));
const ApexPosAdmin = lazy(() => import('./platforms/services/pos/apex-pos/ApexPosAdmin'));
const KitchenDisplay = lazy(() => import('./platforms/services/pos/apex-pos/pages/KitchenDisplay'));
const PosAdmin = lazy(() => import('./platforms/services/pos/point-of-sale/PosAdmin'));
const EventPlannerAdmin = lazy(() => import('./platforms/services/events/event-planner/EventPlannerAdmin'));
const EventPlannerClient = lazy(() => import('./platforms/services/events/event-planner/EventPlannerClient'));
const EventPlannerDetail = lazy(() => import('./platforms/services/events/event-planner/EventPlannerDetail'));
const EventoAdmin = lazy(() => import('./platforms/services/events/evento/EventoAdmin'));
const EventoClient = lazy(() => import('./platforms/services/events/evento/EventoClient'));
const EventoServicePage = lazy(() => import('./platforms/services/events/evento/EventoServicePage'));
const NLMSongs = lazy(() => import('./platforms/streaming/nlmsongs/NLMSongs'));
const NLMSongsSite = lazy(() => import('./platforms/streaming/nlmsongs/NLMSongsSite'));
const NLMSongsAdmin = lazy(() => import('./platforms/streaming/nlmsongs/NLMSongsAdmin'));
const IxStreamSite = lazy(() => import('./platforms/streaming/ixstream/IxStreamSite'));
const IxStreamAdmin = lazy(() => import('./platforms/streaming/ixstream/IxStreamAdmin'));
const EssayMeLanding = lazy(() => import('./platforms/services/education/essayme/EssayMeLanding'));
const TutorMeStudent = lazy(() => import('./platforms/services/education/essayme/TutorMeStudent'));
const HomeworkerStudent = lazy(() => import('./platforms/services/education/homeworker/HomeworkerStudent'));
const HomeworkerWorker = lazy(() => import('./platforms/services/education/homeworker/HomeworkerWorker'));
const IyonicPay = lazy(() => import('./pages/IyonicPay'));
const IyonicBots = lazy(() => import('./pages/IyonicBots'));
const InvoicePage = lazy(() => import('./pages/InvoicePage'));
const IyonicShop = lazy(() => import('./pages/IyonicShop'));
const Refunds = lazy(() => import('./pages/Refunds'));
const TsppLandingPage = lazy(() => import('./platforms/services/education/tspp/TsppLandingPage'));
const TsppAdmin = lazy(() => import('./platforms/services/education/tspp/TsppAdmin'));
const TsppClient = lazy(() => import('./platforms/services/education/tspp/TsppClient'));
const About = lazy(() => import('./pages/static').then(({ About }) => ({ default: About })));
const Careers = lazy(() => import('./pages/static').then(({ Careers }) => ({ default: Careers })));
const Blog = lazy(() => import('./pages/static').then(({ Blog }) => ({ default: Blog })));
const Press = lazy(() => import('./pages/static').then(({ Press }) => ({ default: Press })));
const Documentation = lazy(() => import('./pages/static').then(({ Documentation }) => ({ default: Documentation })));
const APIReference = lazy(() => import('./pages/static').then(({ APIReference }) => ({ default: APIReference })));
const HelpCenter = lazy(() => import('./pages/static').then(({ HelpCenter }) => ({ default: HelpCenter })));
const Status = lazy(() => import('./pages/static').then(({ Status }) => ({ default: Status })));
const Privacy = lazy(() => import('./pages/static').then(({ Privacy }) => ({ default: Privacy })));
const Terms = lazy(() => import('./pages/static').then(({ Terms }) => ({ default: Terms })));
const Cookies = lazy(() => import('./pages/static').then(({ Cookies }) => ({ default: Cookies })));
const Licenses = lazy(() => import('./pages/static').then(({ Licenses }) => ({ default: Licenses })));

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

const LicensedPlatformRoute: React.FC<{ children: React.ReactNode; themeId: string }> = ({ children, themeId }) => {
  const location = useLocation();
  const [access, setAccess] = React.useState<'checking' | 'allowed' | 'denied'>('checking');

  React.useEffect(() => {
    let active = true;
    sellersAPI.getMe().then((seller) => {
      if (!active) return;
      const currentTheme = normalizeThemeId(seller.themeId || seller.theme?.selectedTheme);
      const acquired = (seller.acquiredThemes || []).map(normalizeThemeId);
      setAccess(acquired.includes(normalizeThemeId(themeId)) || currentTheme === normalizeThemeId(themeId) ? 'allowed' : 'denied');
    }).catch(() => {
      if (active) setAccess('denied');
    });
    return () => { active = false; };
  }, [themeId]);

  if (access === 'checking') {
    return <div className="flex min-h-screen items-center justify-center bg-[#f4f1e9] text-sm font-semibold text-[#536457]" role="status">Checking your platform license…</div>;
  }
  if (access === 'denied') return <Navigate to="/themes" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <>{children}</>;
};

const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const shopSubdomain = searchParams.get('subdomain');
  
  if (isInitializing) {
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
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const hostname = window.location.hostname.toLowerCase();
  const hasStoreQuery = new URLSearchParams(window.location.search).has('store')
    || new URLSearchParams(location.search).has('store');
  const isMainPlatformHomepage = location.pathname === '/'
    && !hasStoreQuery
    && (
      ['localhost', '127.0.0.1', 'iyonicorp.com', 'www.iyonicorp.com', 'api.iyonicorp.com'].includes(hostname)
      || hostname === 'iyonicorp.com'
      || hostname === 'www.iyonicorp.com'
      || hostname.endsWith('.iyonicorp.com')
    );

  if (tenantLoading && !isMainPlatformHomepage) {
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
    location.pathname.startsWith('/fit/pulse-fit') ||
    location.pathname.startsWith('/salon/aura-salon') ||
    location.pathname.startsWith('/pos/point-of-sale') ||
    location.pathname.startsWith('/pos/apex-pos') ||
    location.pathname.startsWith('/marketplace/craft-collective') ||
    location.pathname.startsWith('/evento') ||
    location.pathname.startsWith('/nlmsongs') ||
    location.pathname.startsWith('/ixstream') ||
    location.pathname.startsWith('/utorme') ||
    location.pathname.startsWith('/homeworker') ||
    location.pathname.startsWith('/events/event-planner') ||
    location.pathname.startsWith('/events/carnovga') ||
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
        <Homepage
          onGetStarted={handleGetStarted}
          onSignIn={handleSignIn}
          onOpenIyonicPay={handleOpenIyonicPay}
          onOpenIyonicBots={handleOpenIyonicBots}
        />
      } />
      
      <Route path="/login" element={
        <AuthRoute>
          <LoginWrapper />
        </AuthRoute>
      } />
      
      <Route path="/register" element={
        <AuthRoute>
          <RegisterWrapper />
        </AuthRoute>
      } />

      <Route path="/themes" element={<Themes />} />
      <Route path="/tspp" element={<TsppLandingPage />} />
      <Route path="/tspp/admin" element={
        <ProtectedRoute allowedRoles={['seller']}>
          <LicensedPlatformRoute themeId="tspp"><TsppAdmin /></LicensedPlatformRoute>
        </ProtectedRoute>
      } />
      <Route path="/tspp/client" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <TsppClient />
        </ProtectedRoute>
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

      <Route path="/fit/pulse-fit/admin" element={
        <ProtectedRoute allowedRoles={['seller']}>
          <LicensedPlatformRoute themeId="pulse-fit"><PulseFitAdmin /></LicensedPlatformRoute>
        </ProtectedRoute>
      } />
      <Route path="/fit/pulse-fit/client" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <PulseFitClient />
        </ProtectedRoute>
      } />
      <Route path="/fit/pulse-fit/class/:serviceId" element={<PulseFitServicePage />} />
      
      <Route path="/salon/aura-salon/admin" element={
        <ProtectedRoute allowedRoles={['seller']}>
          <LicensedPlatformRoute themeId="aura-salon"><AuraSalonAdmin /></LicensedPlatformRoute>
        </ProtectedRoute>
      } />
      <Route path="/salon/aura-salon/client" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <AuraSalonClient />
        </ProtectedRoute>
      } />
      <Route path="/salon/aura-salon/service/:serviceId" element={<AuraSalonServicePage />} />
      <Route path="/marketplace/craft-collective/admin" element={
        <ProtectedRoute allowedRoles={['seller']}>
          <LicensedPlatformRoute themeId="craft-collective"><CraftCollectiveAdmin /></LicensedPlatformRoute>
        </ProtectedRoute>
      } />
      <Route path="/marketplace/craft-collective/vendor" element={
        <ProtectedRoute allowedRoles={['seller']}>
          <LicensedPlatformRoute themeId="craft-collective"><CraftCollectiveVendor /></LicensedPlatformRoute>
        </ProtectedRoute>
      } />
      <Route path="/marketplace/craft-collective" element={<CraftCollectiveSite />} />
      <Route path="/pos/point-of-sale/admin" element={
        <ProtectedRoute allowedRoles={['seller']}>
          <LicensedPlatformRoute themeId="point-of-sale"><PosAdmin /></LicensedPlatformRoute>
        </ProtectedRoute>
      } />
      <Route path="/pos/point-of-sale" element={<PosSite />} />
      <Route path="/pos/apex-pos/admin" element={
        <ProtectedRoute allowedRoles={['seller']}>
          <LicensedPlatformRoute themeId="apex-pos"><ApexPosAdmin /></LicensedPlatformRoute>
        </ProtectedRoute>
      } />
      <Route path="/pos/apex-pos/kitchen" element={
        <ProtectedRoute allowedRoles={['seller']}>
          <LicensedPlatformRoute themeId="apex-pos"><KitchenDisplay /></LicensedPlatformRoute>
        </ProtectedRoute>
      } />
      <Route path="/pos/apex-pos" element={<ApexPosSite />} />

      <Route path="/evento/admin" element={
        <ProtectedRoute allowedRoles={['seller']}>
          <LicensedPlatformRoute themeId="evento"><EventoAdmin /></LicensedPlatformRoute>
        </ProtectedRoute>
      } />
      <Route path="/evento/client" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <EventoClient />
        </ProtectedRoute>
      } />
      <Route path="/evento/event/:eventId" element={<EventoServicePage />} />

      <Route path="/nlmsongs/dashboard" element={
        <ProtectedRoute allowedRoles={['seller']}>
          <LicensedPlatformRoute themeId="nlmsongs"><NLMSongsAdmin /></LicensedPlatformRoute>
        </ProtectedRoute>
      } />
      <Route path="/nlmsongs/track/:trackId/*" element={<NLMSongs />} />
      <Route path="/nlmsongs/*" element={<NLMSongsSite />} />

      <Route path="/ixstream/dashboard" element={
        <ProtectedRoute allowedRoles={['seller']}>
          <LicensedPlatformRoute themeId="ixstream"><IxStreamAdmin /></LicensedPlatformRoute>
        </ProtectedRoute>
      } />
      <Route path="/ixstream" element={<IxStreamSite />} />

      <Route path="/utorme/student" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <TutorMeStudent />
        </ProtectedRoute>
      } />
      <Route path="/utorme/tutor" element={
        <ProtectedRoute allowedRoles={['seller']}>
          <LicensedPlatformRoute themeId="utorme"><SellerDashboard /></LicensedPlatformRoute>
        </ProtectedRoute>
      } />
      <Route path="/utorme" element={<EssayMeLanding />} />
      <Route path="/homeworker/student" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <HomeworkerStudent />
        </ProtectedRoute>
      } />
      <Route path="/homeworker/worker" element={
        <ProtectedRoute allowedRoles={['seller']}>
          <LicensedPlatformRoute themeId="homeworker"><HomeworkerWorker /></LicensedPlatformRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/events/event-planner/admin" element={
        <ProtectedRoute allowedRoles={['seller']}>
          <LicensedPlatformRoute themeId="event-planner"><EventPlannerAdmin /></LicensedPlatformRoute>
        </ProtectedRoute>
      } />
      <Route path="/events/carnovga/admin" element={
        <ProtectedRoute allowedRoles={['seller']}>
          <LicensedPlatformRoute themeId="carnovga"><EventPlannerAdmin /></LicensedPlatformRoute>
        </ProtectedRoute>
      } />
      <Route path="/events/event-planner/client" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <EventPlannerClient />
        </ProtectedRoute>
      } />
      <Route path="/events/carnovga/client" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <EventPlannerClient />
        </ProtectedRoute>
      } />
      <Route path="/events/event-planner/event/:serviceId" element={<EventPlannerDetail />} />
      <Route path="/events/carnovga/event/:serviceId" element={<EventPlannerDetail />} />

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

const LoginWrapper: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sellerId = searchParams.get('shop');
  const subdomain = searchParams.get('subdomain');
  const redirectParam = searchParams.get('redirect');

  return (
    <Login
      onSwitchToRegister={() => {
        const params = new URLSearchParams(searchParams.toString());
        navigate(`/register?${params.toString()}`);
      }}
      onBackToHomepage={() => navigate(redirectParam || '/')}
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
  const redirectParam = searchParams.get('redirect');
  
  return (
    <Register 
      onSwitchToLogin={() => {
        const params = new URLSearchParams(searchParams.toString());
        navigate(`/login?${params.toString()}`);
      }}
      onBackToHomepage={() => navigate(redirectParam || '/')}
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
            <Suspense fallback={
              <div className="flex min-h-screen items-center justify-center bg-white" role="status" aria-label="Loading page">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <AppContent />
            </Suspense>
          </DataProvider>
        </ToastProvider>
      </AuthProvider>
    </TenantProvider>
  );
}

export default App;
