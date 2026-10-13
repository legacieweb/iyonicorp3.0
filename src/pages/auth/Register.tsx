import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Card } from '../../components/ui';
import { Store, Eye, EyeOff, CheckCircle, ArrowLeft, Package, Briefcase, Link as LinkIcon } from 'lucide-react';
import { getAuthErrorDetails } from '../../utils/authErrors';
import { managerInvitationAPI } from '../../services/api';
import { getVipAuthTheme } from '../../utils/vipAuthTheme';
import './vip-auth.css';

const PRODUCT_SHOP_THEME_IDS = new Set([
  'neon-pulse', 'modern-ecommerce', 'luxury-boutique', 'beauty-store', 'shoe-store',
  'jewelry-store', 'bakery-store', 'couture-store', 'crown-stroke'
]);

interface RegisterProps {
  onSwitchToLogin: () => void;
  onBackToHomepage?: () => void;
  preselectedRole?: 'seller' | 'seller_manager' | 'customer' | null;
  managerSlug?: string | null;
  sellerId?: string | null;
  invitationToken?: string | null;
}

export const Register: React.FC<RegisterProps> = ({ 
  onSwitchToLogin, 
  onBackToHomepage,
  preselectedRole,
  managerSlug,
  sellerId: initialSellerId,
  invitationToken
}) => {
  const { register, linkStore, isLoading } = useAuth();
  const location = useLocation();
  const signupParams = new URLSearchParams(location.search);
  const storeSubdomain = signupParams.get('subdomain');
  const selectedThemeId = signupParams.get('theme') || signupParams.get('platform');
  const isProductThemeSignup = Boolean(selectedThemeId && PRODUCT_SHOP_THEME_IDS.has(selectedThemeId.toLowerCase()));
  const isPlatformThemeSignup = Boolean(selectedThemeId && !isProductThemeSignup);
  const isUtormeSignup = signupParams.get('platform') === 'utorme';
  const isUtormeTutorSignup = isUtormeSignup && preselectedRole === 'seller';
  const isUtormeStudentSignup = isUtormeSignup && preselectedRole === 'customer';
  const isTsppSignup = signupParams.get('theme') === 'tspp';
  const isTsppTeacherSignup = isTsppSignup && preselectedRole === 'customer';
  const isTsppSchoolSignup = isTsppSignup && !isTsppTeacherSignup;
  const isShopSignup = Boolean(initialSellerId || storeSubdomain);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: (isShopSignup || isUtormeStudentSignup || isTsppTeacherSignup || preselectedRole === 'customer'
      ? 'customer'
      : managerSlug
        ? 'seller'
        : preselectedRole === 'seller_manager'
          ? 'seller_manager'
          : 'seller') as 'seller' | 'seller_manager' | 'customer',
    storeName: '',
    subdomain: '',
    shopType: isUtormeTutorSignup ? 'service' as const : 'product' as const,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [managerInfo, setManagerInfo] = useState<any>(null);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const vipTheme = getVipAuthTheme(location.pathname, location.search, storeInfo?.themeId || storeInfo?.theme?.selectedTheme);
  const [managerLoading, setManagerLoading] = useState(false);
  const [mergeRequired, setMergeRequired] = useState(false);
  const [mergeMessage, setMergeMessage] = useState('');
  const [invitationLoading, setInvitationLoading] = useState(Boolean(invitationToken));
  const [invitationError, setInvitationError] = useState('');
  const isInvitation = Boolean(invitationToken);

  useEffect(() => {
    if (isShopSignup && formData.role !== 'customer') {
      setFormData((current) => ({ ...current, role: 'customer' }));
    }
  }, [formData.role, isShopSignup]);

  useEffect(() => {
    if (isUtormeStudentSignup && formData.role !== 'customer') {
      setFormData((current) => ({ ...current, role: 'customer' }));
    } else if (isUtormeTutorSignup && (formData.role !== 'seller' || formData.shopType !== 'service')) {
      setFormData((current) => ({ ...current, role: 'seller', shopType: 'service' }));
    } else if (isTsppTeacherSignup && formData.role !== 'customer') {
      setFormData((current) => ({ ...current, role: 'customer' }));
    } else if (isTsppSchoolSignup && formData.role !== 'seller') {
      setFormData((current) => ({ ...current, role: 'seller' }));
    }
  }, [formData.role, formData.shopType, isUtormeStudentSignup, isUtormeTutorSignup, isTsppTeacherSignup, isTsppSchoolSignup]);

  useEffect(() => {
    if (invitationToken) {
      managerInvitationAPI.get(invitationToken).then((invitation) => {
        setFormData(prev => ({
          ...prev,
          firstName: invitation.firstName || invitation.name?.split(' ')[0] || '',
          lastName: invitation.lastName || invitation.name?.split(' ').slice(1).join(' ') || '',
          email: invitation.email || '',
          role: 'seller_manager'
        }));
      }).catch((err) => {
        setInvitationError(err.response?.data?.message || 'This invitation is invalid or has expired.');
      }).finally(() => setInvitationLoading(false));
      return;
    }
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
  }, [managerSlug, formData.role, initialSellerId, invitationToken]);

  const getRegisterErrorMessage = (err: any): string => {
    const details = getAuthErrorDetails(err, 'Registration failed. Please try again.');
    return `${details.title}: ${details.message}`;
  };

  const validateForm = (): string | null => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      return 'Please enter your first and last name.';
    }
    if (!formData.email.trim()) {
      return 'Please enter your email address.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Please enter a valid email address.';
    }
    if (!formData.phoneNumber.trim()) {
      return 'Please enter your phone number.';
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters for security.';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match. Please ensure both passwords are identical.';
    }
    if (!isShopSignup && formData.role === 'seller' && !formData.storeName.trim()) {
      return isTsppSchoolSignup ? 'Please enter your school name.' : 'Please enter your store name.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const accountRole = isShopSignup ? 'customer' : formData.role;
      if (isInvitation && invitationToken) {
        await managerInvitationAPI.accept({
          token: invitationToken,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          password: formData.password
        });
        setError('Invitation accepted. Redirecting to sign in...');
        setTimeout(onSwitchToLogin, 1000);
        return;
      }
      await register({
        name: `${formData.firstName} ${formData.lastName}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        password: formData.password,
        role: accountRole as any,
        sellerId: initialSellerId || undefined,
        themeId: selectedThemeId || (isTsppSignup ? 'tspp' : undefined),
        ...(accountRole === 'seller' ? {
          storeName: formData.storeName,
          ...(!isTsppSignup && !isPlatformThemeSignup ? {
            subdomain: formData.subdomain,
            shopType: formData.shopType,
          } : {}),
          managerId: managerInfo?.id,
        } : {}),
      });
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.mergeRequired) {
        setMergeRequired(true);
        setMergeMessage(err.response.data.message);
      } else {
        setError(getRegisterErrorMessage(err));
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
      const details = getAuthErrorDetails(err, 'Failed to link account. Please check your password.');
      setError(`${details.title}: ${details.message}`);
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

  if (invitationLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading your invitation...</div>;
  }

  if (invitationError) {
    return <div className="min-h-screen flex items-center justify-center p-4 text-red-600">{invitationError}</div>;
  }

  const isThemeSignup = Boolean(selectedThemeId);
  const selectedThemeName = vipTheme?.name || selectedThemeId?.split(/[-_]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  const benefitHeading = formData.role === 'seller'
    ? isTsppSchoolSignup ? 'Your school workspace' : isUtormeTutorSignup ? 'Your tutor workspace' : isProductThemeSignup ? 'Your product storefront' : isPlatformThemeSignup ? `${selectedThemeName || 'Platform'} workspace` : 'Your business workspace'
    : formData.role === 'customer' ? isTsppTeacherSignup ? 'Your educator profile' : isUtormeStudentSignup ? 'Your learning space' : isShopSignup ? 'Your shopping account' : 'Your account, made useful'
      : 'Your management workspace';
  const benefits = {
     seller: isUtormeTutorSignup ? [
      'Create a tutor profile and service page',
      'Manage tutoring sessions and availability',
      'Message students in one inbox',
      'Track your tutoring business',
      'Set up your own tutoring services',
    ] : isTsppSchoolSignup ? [
      'List unlimited school jobs',
      'Search verified teacher profiles',
      'Schedule interviews and collect feedback',
      'Branded school employer page',
      'Auto-renewing subscription',
    ] : isProductThemeSignup ? [
      'Launch a storefront designed for your products',
      'Manage products and orders in one workspace',
      'Customize the look and feel of your store',
      'Keep your customers and business details together',
    ] : isPlatformThemeSignup ? [
      'Start with tools built for your platform',
      'Manage your workspace from one place',
      'Bring your team and customers together',
      'Shape the experience around your business',
    ] : [
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
     customer: isUtormeStudentSignup ? [
      'Discover tutors by subject',
      'Request sessions that fit your schedule',
      'Message your tutor directly',
      'Keep your learning sessions organized',
      'Choose your tutor before booking',
    ] : isTsppTeacherSignup ? [
      'Create a verified teacher profile',
      'Get matched with private schools',
      'Showcase your credentials and experience',
      'Receive interview invitations',
      'Secure messaging with schools',
    ] : isShopSignup ? [
      'Shop from our store',
      'Track your orders in real-time',
      'Securely pay with IyonicPay',
      'Manage your favorite products',
      'Get personalized recommendations',
    ] : [
      'Keep your activity and preferences together',
      'Get a smoother experience across Iyonicorp',
      'Stay connected to the services you use',
      'Access your account securely from anywhere',
    ],
  };

  const getThemeStyles = () => {
    if (!vipTheme) return {};
    return {
      '--theme-primary': vipTheme.primary,
      '--theme-primary-hover': vipTheme.secondary,
    } as React.CSSProperties;
  };

  const themePrimary = vipTheme?.primary || '#c6f04a';
  const themeSecondary = vipTheme?.secondary || '#171a16';
  const getAuthStyles = () => ({
    ...getThemeStyles(),
    ...(vipTheme ? { '--vip-surface': vipTheme.surface } : {}),
  } as React.CSSProperties);

  return (
    <div className={`auth-page-shell min-h-screen flex flex-col md:flex-row bg-white ${vipTheme ? 'vip-auth-shell' : ''}`} data-vip-theme={vipTheme?.id} style={getAuthStyles()}>
      {/* Left Side - Context for every account and platform */}
      <div 
        className="vip-auth-brand-panel flex min-h-[26rem] w-full flex-col justify-between p-5 text-white relative overflow-hidden sm:p-7 md:min-h-screen md:w-[42%] md:p-8 lg:w-[45%] lg:p-12"
        style={vipTheme || isTsppSignup ? { background: isTsppSignup ? 'linear-gradient(145deg, #123b3b, #1f5a55)' : `linear-gradient(145deg, ${themeSecondary}, ${themePrimary})` } : undefined}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3 mb-12">
            <div className="flex min-w-0 items-center space-x-3">
            {storeInfo?.logo ? (
              <img src={storeInfo.logo} alt={storeInfo.storeName} className="w-10 h-10 object-cover rounded-xl" />
            ) : (
              <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl">
                <img src="/logo.png" alt="Iyonicorp Logo" className="w-8 h-8 object-contain" />
              </div>
            )}
            <span className="truncate text-xl font-extrabold tracking-tight">{storeInfo?.storeName || selectedThemeName || 'Iyonicorp'}</span>
            </div>
            <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-white/80">{formData.role === 'customer' ? 'Member account' : isThemeSignup ? 'Platform setup' : 'Business account'}</span>
          </div>

          <p className="mb-4 text-xs font-bold uppercase tracking-[.22em] text-white/65">A better way to get started</p>
          <h2 className={`mb-5 max-w-[13ch] text-4xl font-extrabold leading-[1.02] tracking-tight lg:text-5xl ${isTsppSignup ? 'text-[#f8f5ed]' : ''}`}>
            {vipTheme ? vipTheme.headline : storeInfo ? `Welcome to ${storeInfo.storeName}` : isProductThemeSignup ? 'Your store starts here.' : isPlatformThemeSignup ? 'Your work, in its own space.' : formData.role === 'customer' ? 'Make your account work for you.' : formData.role === 'seller_manager' ? 'Bring every business into focus.' : 'Build something that feels like yours.'}
          </h2>
          <p className={`text-base max-w-lg mb-8 leading-7 ${isTsppSignup ? 'text-[#e0eeea]' : 'text-white/72'}`}>
            {isTsppSchoolSignup
              ? 'Create your school hiring workspace to publish roles, review verified candidates, and manage interviews in one place.'
              : isTsppTeacherSignup
                ? 'Build your professional profile, verify your credentials, and connect with schools looking for teachers and staff.'
                : vipTheme ? vipTheme.description : storeInfo
                ? `Become a member of ${storeInfo.storeName} and enjoy exclusive benefits, track your orders, and more.`
                : isProductThemeSignup ? `Create your ${selectedThemeName} storefront and bring your products, customers, and brand together.`
                  : isPlatformThemeSignup ? `Set up ${selectedThemeName} for your organization with a workspace designed around the way you work.`
                    : formData.role === 'customer' ? 'One secure account keeps your preferences, activity, and the services you use close at hand.'
                      : 'A clear, capable workspace for running your business and keeping the important details moving.'}
          </p>
          <div className="rounded-3xl border border-white/12 bg-white/[.07] p-5 backdrop-blur-xl lg:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-white"><CheckCircle className="h-5 w-5" /></span>
              <div><h3 className="font-bold text-white">{benefitHeading}</h3><p className="mt-0.5 text-xs text-white/55">A few things you can do</p></div>
            </div>
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {benefits[formData.role].slice(0, 4).map((benefit, index) => (
                <li key={index} className="flex items-start gap-2.5 text-sm leading-5 text-white/80">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-primary,#c6f04a)]" />{benefit}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {[formData.role === 'customer' ? 'One secure account' : 'Built around your work', isProductThemeSignup ? 'Product storefront' : isPlatformThemeSignup ? 'Dedicated workspace' : 'Simple to manage'].map((item) => <span key={item} className="rounded-full border border-white/15 bg-white/[.04] px-3 py-1.5 text-xs font-semibold text-white/65">{item}</span>)}
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-1/4 -right-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex items-center justify-between gap-4 text-xs text-white/45">
          <span>© 2026 Iyonicorp</span><span>Thoughtful tools for what comes next.</span>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className={`vip-auth-form-panel flex-1 flex items-center justify-center p-8 overflow-y-auto ${isTsppSignup ? 'bg-[#f8f6f0]' : 'bg-gray-50/50'}`}>
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
            <span className="text-2xl font-bold">{storeInfo?.storeName || vipTheme?.name || 'Iyonicorp'}</span>
          </div>

          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isTsppSchoolSignup
                ? 'Create your school account'
                : isTsppTeacherSignup
                  ? 'Join as a teacher or worker'
                  : vipTheme
                    ? `Join ${vipTheme.name}`
                    : isShopSignup
                      ? 'Create Your Account'
                      : 'Build your business with Iyonicorp'}
            </h1>
            <p className="text-gray-500">
              {isTsppSchoolSignup
                ? 'Set up your school’s hiring workspace and connect with verified educators.'
                : isTsppTeacherSignup
                  ? 'Create your profile and connect with schools looking for your experience.'
                  : vipTheme
                    ? vipTheme.description
                    : isShopSignup
                      ? 'Fill in the details below to get started'
                      : 'Create an account for your seller or manager business.'}
            </p>
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
            {!selectedThemeId && !isShopSignup && !managerSlug && !isInvitation && !isUtormeSignup && !isTsppSignup && preselectedRole !== 'customer' && (
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
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="First Name"
                type="text"
                placeholder="John"
                value={formData.firstName}
                disabled={isInvitation}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="bg-white border-gray-200 rounded-xl"
              />
              <Input
                label="Last Name"
                type="text"
                placeholder="Doe"
                value={formData.lastName}
                disabled={isInvitation}
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
                disabled={isInvitation}
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
                {isProductThemeSignup ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-blue-950">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><Package className="h-5 w-5" /></span>
                    <span><span className="block text-sm font-bold">Product storefront selected</span><span className="mt-0.5 block text-xs text-blue-800/75">Your account will be set up for selling products.</span></span>
                  </div>
                ) : !isPlatformThemeSignup && !isUtormeTutorSignup && !isTsppSchoolSignup && (
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
                </div>)}

                <div className={`grid grid-cols-1 gap-6 p-4 rounded-2xl border ${isTsppSignup ? 'md:grid-cols-1 border-white/10 bg-white/5' : 'md:grid-cols-2 bg-blue-50/50 border-blue-100'}`}>
                <Input
                  label={isUtormeTutorSignup ? 'Tutor or practice name' : isTsppSchoolSignup ? 'School name' : isPlatformThemeSignup ? 'Workspace or business name' : 'Store Name'}
                  type="text"
                  placeholder={isUtormeTutorSignup ? 'Your tutoring name' : isTsppSchoolSignup ? 'Your school name' : isPlatformThemeSignup ? 'Your workspace' : 'My Awesome Store'}
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  required
                  className="bg-white border-gray-200 rounded-xl"
                />
                {!isTsppSignup && !isPlatformThemeSignup && <Input
                  label="Preferred subdomain (optional)"
                  type="text"
                  placeholder="mystore"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                  helperText={formData.subdomain
                    ? `Your store URL: ${formData.subdomain}.iyonicorp.com`
                    : "Leave blank and we'll assign a live store URL automatically."}
                  className="bg-white border-gray-200 rounded-xl"
                />}
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
              {isTsppSchoolSignup
                ? 'Create school account'
                : isTsppTeacherSignup
                  ? 'Create teacher / worker account'
                  : 'Create My Account'}
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
              {isTsppSignup ? 'Back to TSPP landing page' : 'Back to Homepage'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
