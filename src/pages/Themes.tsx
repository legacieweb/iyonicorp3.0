import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Check, ExternalLink, Eye, LayoutGrid, Monitor, Search, Send, Smartphone, Sparkles, Store, Ticket, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Seller, sellersAPI } from '../services/api';
import { getThemeDashboardRoute } from '../utils/themeDashboard';
import ThemeLaunchOverlay, { ThemeLaunchState } from '../components/ThemeLaunchOverlay';
import GlobalHeader from '../components/GlobalHeader';
import SEO from '../components/SEO';
import { THEME_PRICES_USD_CENTS } from '../utils/vipThemes';
import './theme-catalog.css';

type ThemeKind = 'product' | 'service' | 'streaming' | 'education';
type ThemeCategory = 'All collections' | 'Free templates' | 'VIP SaaS platforms' | 'Private platforms';
type ThemeOption = { id: string; name: string; description: string; tags: string[]; kind: ThemeKind };

const THEMES: ThemeOption[] = [
  { id: 'neon-pulse', name: 'Neon Pulse', description: 'A bright, kinetic storefront for brands with energy and a point of view.', tags: ['Animated', 'Bold', 'Modern'], kind: 'product' },
  { id: 'modern-ecommerce', name: 'Modern E-commerce', description: 'A clean, minimal shopping experience designed for fashion and retail.', tags: ['Minimal', 'Clean', 'Retail'], kind: 'product' },
  { id: 'luxury-boutique', name: 'Luxury Boutique', description: 'A sophisticated editorial storefront with a premium boutique feel.', tags: ['Luxury', 'Editorial', 'Premium'], kind: 'product' },
  { id: 'beauty-store', name: 'Beauty Store', description: 'Fresh, polished product storytelling for beauty and skincare brands.', tags: ['Beauty', 'Modern', 'Skincare'], kind: 'product' },
  { id: 'shoe-store', name: 'Shoe Store', description: 'A bold, urban shopping experience for footwear and streetwear.', tags: ['Shoes', 'Urban', 'Bold'], kind: 'product' },
  { id: 'jewelry-store', name: 'Jewelry Store', description: 'Timeless visual merchandising for fine jewelry and accessories.', tags: ['Luxury', 'Elegant', 'Jewelry'], kind: 'product' },
  { id: 'bakery-store', name: 'Bakery Store', description: 'An inviting, artisanal storefront for bakeries, cafes, and makers.', tags: ['Artisanal', 'Bakery', 'Food'], kind: 'product' },
  { id: 'couture-store', name: 'Couture Store', description: 'High-fashion minimalism for couture houses and designer labels.', tags: ['Fashion', 'Minimalist', 'Couture'], kind: 'product' },
  { id: 'tspp', name: 'TSPP', description: 'A premium, modern hiring platform for private schools and verified teachers, with a trust-first recruitment flow and contemporary deep-teal & gold design.', tags: ['Hiring', 'Schools', 'Verified', 'Premium', 'Modern'], kind: 'service' },
  { id: 'sms', name: 'School Management System', description: 'A complete school management platform with SIS, faculty, grading, attendance, scheduling, fee management, and parent-teacher communication portals.', tags: ['School', 'Education', 'SIS', 'Attendance', 'Grading', 'Fees', 'Modern'], kind: 'education' },
  { id: 'event-planner', name: 'Event Flow', description: 'A sophisticated event planning platform with navy-and-gold branding, request-based booking, and dedicated workspaces.', tags: ['Events', 'Planning', 'Booking', 'Premium'], kind: 'service' },
  { id: 'carnovga', name: 'Carnovga', description: 'A refined luxury event brand experience with editorial storytelling, premium bookings, and an elevated client journey.', tags: ['Luxury', 'Events', 'Modern', 'Elegant'], kind: 'service' },
  { id: 'aura-salon', name: 'Aura Salon', description: 'A considered salon experience with service menus and client appointment management.', tags: ['Salon', 'Booking', 'Minimalist'], kind: 'service' },
  { id: 'craft-collective', name: 'Craft Collective', description: 'A curated marketplace platform for artisan vendors, with fleet desk management, order routing, and community announcements.', tags: ['Marketplace', 'Multi-vendor', 'Artisan'], kind: 'service' },
  { id: 'point-of-sale', name: 'Point of Sale', description: 'A terminal-first point-of-sale system with menu management, order routing, and kitchen display for retail and hospitality.', tags: ['POS', 'Terminal', 'Menu', 'Retail'], kind: 'service' },
  { id: 'apex-pos', name: 'Apex POS', description: 'An advanced terminal-first POS with table management, employee logins, split billing, tip suggestions, real-time analytics, and kitchen display.', tags: ['POS', 'Advanced', 'Terminal', 'Table Mgmt', 'Staff'], kind: 'service' },
  { id: 'tamira-salon', name: 'Tamira Salon', description: 'A dedicated salon system for premium booking, service menus, and client appointments.', tags: ['Salon', 'Booking', 'Premium'], kind: 'service' },
  { id: 'pulse-fit', name: 'Pulse Fit', description: 'A fitness platform with group classes, trainer assignments, schedules, and member bookings.', tags: ['Fitness', 'Classes', 'Booking'], kind: 'service' },
  { id: 'spa-retreat', name: 'Stillwater Spa', description: 'A restorative spa platform with treatment menus, appointment requests, and a calm guest experience.', tags: ['Spa', 'Treatments', 'Booking'], kind: 'service' },
  { id: 'elite-consulting', name: 'Elite Consulting', description: 'A confident, structured platform for consultants and professional firms.', tags: ['Corporate', 'Consulting', 'Professional'], kind: 'service' },
  { id: 'creative-studio', name: 'Creative Studio', description: 'A distinctive digital home for creative agencies and independent studios.', tags: ['Creative', 'Bold', 'Studio'], kind: 'service' },
  { id: 'modern-wellness', name: 'Modern Wellness', description: 'A calm, considered client experience for wellness and health practices.', tags: ['Wellness', 'Serene', 'Health'], kind: 'service' },
  { id: 'nlmsongs', name: 'NLM Songs', description: 'A music-streaming platform with a curated library and dedicated listener and admin experiences.', tags: ['Music', 'Streaming', 'Standalone'], kind: 'streaming' },
  { id: 'ixstream', name: 'IxStream', description: 'A movie and TV streaming platform with library management and dedicated admin and client experiences.', tags: ['Movies', 'TV Shows', 'Streaming'], kind: 'streaming' },
  { id: 'utorme', name: 'tutorme', description: 'A tutor-first learning marketplace with student discovery, session management, and tutor business tools.', tags: ['Tutoring', 'Education', 'Marketplace'], kind: 'education' },
  { id: 'homeworker', name: 'Homeworker', description: 'A homework-help marketplace for assignment intake, expert workspaces, and staged payments.', tags: ['Homework', 'Education', 'Marketplace'], kind: 'education' },
  { id: 'car-rental', name: 'Apex Drive', description: 'A car-rental platform with vehicle showcase, date-based reservations, and fleet management.', tags: ['Automotive', 'Booking', 'Fleet'], kind: 'service' },
  { id: 'restaurant', name: 'The Restaurant', description: 'A restaurant platform with menu management, table reservations, and order tracking.', tags: ['Restaurant', 'Food', 'Booking'], kind: 'service' },
  { id: 'instagram-vip', name: 'Instagram VIP', description: 'A visual restaurant storefront with gallery storytelling and a reservation experience.', tags: ['Gallery', 'Restaurant', 'Reservations'], kind: 'service' },
  { id: 'evento', name: 'Evento', description: 'An event business platform for event listings, ticket requests, co-hosts, bookings, and venue operations.', tags: ['Events', 'Tickets', 'Co-hosts'], kind: 'service' },
  { id: 'crown-stroke', name: 'Crown Stroke', description: 'A print-on-demand platform with a canvas-based design studio for custom apparel and merchandise.', tags: ['Print', 'Design', 'Merchandise', 'Canvas'], kind: 'product' },
];

// These IDs have matching template components under src/themes and are free to use.
const FREE_TEMPLATE_IDS = new Set([
  'neon-pulse', 'modern-ecommerce', 'luxury-boutique', 'beauty-store', 'shoe-store',
  'jewelry-store', 'bakery-store', 'couture-store', 'instagram-vip',
  'elite-consulting', 'creative-studio', 'modern-wellness',
]);
// Streaming services stay privately operated; the remaining platform-folder products are acquirable SaaS.
const PRIVATE_PLATFORM_IDS = new Set(['nlmsongs', 'ixstream']);
const CATEGORIES: ThemeCategory[] = ['All collections', 'Free templates', 'VIP SaaS platforms', 'Private platforms'];
const kindLabel: Record<ThemeKind, string> = {
  product: 'Product storefront theme',
  service: 'Service / storefront listing',
  streaming: 'Streaming platform',
  education: 'Education platform',
};

const withTimeout = <T,>(operation: Promise<T>, message: string) => new Promise<T>((resolve, reject) => {
  const timer = window.setTimeout(() => reject(new Error(message)), 20000);
  operation.then(
    (value) => { window.clearTimeout(timer); resolve(value); },
    (reason) => { window.clearTimeout(timer); reject(reason); },
  );
});

type PaystackTransaction = { reference?: string; trxref?: string; status?: string };
type PaystackPopup = {
  resumeTransaction: (
    accessCode: string,
    callbacks: {
      onSuccess: (transaction: PaystackTransaction) => void;
      onCancel: () => void;
      onError: (popupError: { message?: string }) => void;
    },
  ) => void;
};
type PaystackPopupConstructor = new () => PaystackPopup;

declare global {
  interface Window {
    PaystackPop?: PaystackPopupConstructor & { setup?: (...args: any[]) => any };
  }
}

let paystackPopupConstructorPromise: Promise<PaystackPopupConstructor> | null = null;

const loadPaystackPopup = () => {
  if (paystackPopupConstructorPromise) return paystackPopupConstructorPromise;

  paystackPopupConstructorPromise = new Promise<PaystackPopupConstructor>((resolve, reject) => {
    const legacyPaystackPop = window.PaystackPop;
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;
    script.onload = () => {
      const popupConstructor = window.PaystackPop;
      if (legacyPaystackPop) window.PaystackPop = legacyPaystackPop;
      else delete window.PaystackPop;

      if (popupConstructor?.prototype?.resumeTransaction) resolve(popupConstructor);
      else {
        script.remove();
        paystackPopupConstructorPromise = null;
        reject(new Error('The secure payment window could not be loaded. Please try again.'));
      }
    };
    script.onerror = () => {
      if (legacyPaystackPop) window.PaystackPop = legacyPaystackPop;
      else delete window.PaystackPop;
      script.remove();
      paystackPopupConstructorPromise = null;
      reject(new Error('The secure payment window could not be loaded. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });

  return paystackPopupConstructorPromise;
};

const Themes: React.FC = () => {
  const { user } = useAuth();
  const { refreshData } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState<ThemeCategory>('All collections');
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [previewTheme, setPreviewTheme] = useState<ThemeOption | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const previewCloseRef = useRef<HTMLButtonElement>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const previewDialogRef = useRef<HTMLElement>(null);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [acquiredThemeIds, setAcquiredThemeIds] = useState<string[]>([]);
  const [acquisitionsLoading, setAcquisitionsLoading] = useState(false);
  const [launchingTheme, setLaunchingTheme] = useState<ThemeOption | null>(null);
  const [launchState, setLaunchState] = useState<ThemeLaunchState>('checking');
  const [launchError, setLaunchError] = useState('');
  const [offerThemeId, setOfferThemeId] = useState<string | null>(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerResult, setOfferResult] = useState<{ themeId: string; message: string } | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [canRetryVerification, setCanRetryVerification] = useState(false);
  const [pendingVerification, setPendingVerification] = useState<{ themeId: string; reference: string } | null>(null);
  const purchaseInProgress = useRef<string | null>(null);
  const applyingThemeIds = useRef(new Set<string>());
  const verifiedReferences = useRef(new Set<string>());
  const autoAppliedPurchaseReferences = useRef(new Set<string>());
  const verificationInFlight = useRef(new Set<string>());
  const autoAppliedThemeId = useRef<string | null>(null);
  const isSeller = user?.role === 'seller';

  useEffect(() => {
    if (!isSeller) {
      setAcquisitionsLoading(false);
      return;
    }
    let active = true;
    setAcquisitionsLoading(true);
    withTimeout(sellersAPI.getMe(), 'License lookup timed out. Refresh the page and try again.').then((seller) => {
      if (!active) return;
      setActiveThemeId(seller.themeId || seller.theme?.selectedTheme || null);
      setAcquiredThemeIds(seller.acquiredThemes || []);
    }).catch(() => {
      if (active) setError('Your theme ownership could not be loaded. Refresh the page before purchasing or applying.');
    }).finally(() => {
      if (active) setAcquisitionsLoading(false);
    });
    return () => { active = false; };
  }, [isSeller]);

  const previewUrl = (themeId: string) => {
    if (themeId === 'nlmsongs' || themeId === 'ixstream' || themeId === 'utorme' || themeId === 'tspp' || themeId === 'sms') {
      return `${window.location.origin}/#/${themeId}`;
    }
    return `${window.location.origin}/#/shop/demo?theme=${encodeURIComponent(themeId)}`;
  };

  useEffect(() => {
    if (!previewTheme) {
      previewTriggerRef.current?.focus();
      return;
    }
    const previousOverflow = document.body.style.overflow;
    const appRoot = document.getElementById('root');
    const previousInert = appRoot?.inert ?? false;
    document.body.style.overflow = 'hidden';
    if (appRoot) appRoot.inert = true;
    previewCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewTheme(null);
      }
    };
    const containPageFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusable = previewDialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable[focusable.length - 1].focus();
      }
    };
    const containFrameFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const frameDocument = previewFrameRef.current?.contentDocument;
      const focusable = frameDocument?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        previewCloseRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const dialogFocusable = previewDialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
      );
      if (event.shiftKey && frameDocument?.activeElement === first) {
        event.preventDefault();
        dialogFocusable?.[dialogFocusable.length - 2]?.focus();
      } else if (!event.shiftKey && frameDocument?.activeElement === last) {
        event.preventDefault();
        dialogFocusable?.[0]?.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    document.addEventListener('keydown', containPageFocus);
    const frame = previewFrameRef.current;
    let frameWindow = frame?.contentWindow ?? null;
    const containFrameKeys = (event: KeyboardEvent) => {
      closeOnEscape(event);
      containFrameFocus(event);
    };
    frameWindow?.addEventListener('keydown', containFrameKeys);
    const attachFrameKeys = () => {
      frameWindow?.removeEventListener('keydown', containFrameKeys);
      frameWindow = frame?.contentWindow ?? null;
      frameWindow?.addEventListener('keydown', containFrameKeys);
    };
    frame?.addEventListener('load', attachFrameKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      if (appRoot) appRoot.inert = previousInert;
      window.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('keydown', containPageFocus);
      frame?.removeEventListener('load', attachFrameKeys);
      frameWindow?.removeEventListener('keydown', containFrameKeys);
    };
  }, [previewTheme]);

  const visibleThemes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return THEMES.filter((theme) => {
      const matchesCategory = category === 'All collections' ||
        (category === 'Free templates' && FREE_TEMPLATE_IDS.has(theme.id)) ||
        (category === 'VIP SaaS platforms' && !FREE_TEMPLATE_IDS.has(theme.id) && !PRIVATE_PLATFORM_IDS.has(theme.id)) ||
        (category === 'Private platforms' && PRIVATE_PLATFORM_IDS.has(theme.id));
      const matchesQuery = !normalizedQuery || [theme.name, theme.description, ...theme.tags].join(' ').toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const applyTheme = async (theme: ThemeOption) => {
    if (applyingThemeIds.current.has(theme.id)) return;
    if (!isSeller) {
      if (!user) navigate(`/login?theme=${encodeURIComponent(theme.id)}&redirect=%2Fthemes`);
      else setError('A seller account is required to acquire and apply a platform.');
      return;
    }

    applyingThemeIds.current.add(theme.id);
    setApplyingId(theme.id);
    setLaunchingTheme(theme);
    setLaunchState('checking');
    setLaunchError('');
    setError('');
    try {
      const seller = await withTimeout(sellersAPI.getMe(), 'License check timed out. Refresh the catalog and try again.');
      const acquiredThemes = seller.acquiredThemes || [];
      setAcquiredThemeIds(acquiredThemes);
      const selectedTheme = seller.themeId || seller.theme?.selectedTheme;
      if (!FREE_TEMPLATE_IDS.has(theme.id) && !acquiredThemes.includes(theme.id) && selectedTheme !== theme.id) {
        throw new Error('Acquire this platform before applying it.');
      }

      setLaunchState('applying');
      const updates: Partial<Seller> = {
        themeId: theme.id,
        theme: { ...seller.theme, selectedTheme: theme.id },
      };
      if (theme.kind !== 'streaming') updates.shopType = theme.kind === 'product' ? 'product' : 'service';
      await withTimeout(sellersAPI.updateMe(updates), 'Applying this platform is taking longer than expected. Refresh to check your current setup before trying again.');
      setActiveThemeId(theme.id);
      setLaunchState('ready');
      try {
        await withTimeout(refreshData(), 'Workspace refresh timed out.');
      } catch (refreshError) {
        console.error('Platform was applied, but refreshed seller data is not available yet:', refreshError);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1100));
      navigate(getThemeDashboardRoute(theme.id), { replace: true, state: { from: location.pathname } });
    } catch (applyError: any) {
      const message = applyError.response?.data?.message || applyError.message || 'The platform could not be applied. Your current setup is unchanged; please try again.';
      setLaunchError(message);
      setLaunchState('error');
    } finally {
      applyingThemeIds.current.delete(theme.id);
      setApplyingId(null);
    }
  };

  const verifyPaymentAndApply = async (themeId: string, reference: string) => {
    const verificationKey = `${themeId}:${reference}`;
    if (verificationInFlight.current.has(verificationKey) || verifiedReferences.current.has(verificationKey)) return;
    verificationInFlight.current.add(verificationKey);
    setPendingVerification({ themeId, reference });
    setVerificationPending(true);
    setCanRetryVerification(false);
    setError('');
    setSuccess('');

    try {
      const { acquiredThemes } = await withTimeout(
        sellersAPI.verifyThemePurchase(themeId, reference),
        'Payment verification timed out. Your payment reference is saved; retry verification below.',
      );
      verifiedReferences.current.add(verificationKey);
      sessionStorage.removeItem('iyonic-vip-theme-purchase-pending');
      setPendingVerification(null);
      setAcquiredThemeIds(acquiredThemes);
      setSuccess('Payment confirmed. Your license is secure; opening your new platform now…');
      try {
        await refreshData();
      } catch (refreshError) {
        console.error('Theme purchase was verified, but seller data could not be refreshed:', refreshError);
      }

      if (!autoAppliedPurchaseReferences.current.has(verificationKey)) {
        autoAppliedPurchaseReferences.current.add(verificationKey);
        const theme = THEMES.find((item) => item.id === themeId);
        if (theme) await applyTheme(theme);
      }
    } catch (verifyError: any) {
      const pending = { themeId, reference };
      sessionStorage.setItem('iyonic-vip-theme-purchase-pending', JSON.stringify(pending));
      setPendingVerification(pending);
      setError(verifyError.response?.data?.message || verifyError.message || 'Payment verification failed. Your theme remains locked until we confirm it.');
      setCanRetryVerification(true);
      setApplyingId(null);
    } finally {
      verificationInFlight.current.delete(verificationKey);
      setVerificationPending(false);
      purchaseInProgress.current = null;
    }
  };

  useEffect(() => {
    if (!isSeller || pendingVerification) return;
    const stored = sessionStorage.getItem('iyonic-vip-theme-purchase-pending');
    if (!stored) return;
    try {
      let pending: { themeId?: string; reference?: string };
      try {
        pending = JSON.parse(stored) as { themeId?: string; reference?: string };
      } catch {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const reference = searchParams.get('reference') || searchParams.get('trxref') ||
          hashParams.get('reference') || hashParams.get('trxref') ||
          new URLSearchParams(window.location.search).get('reference') ||
          new URLSearchParams(window.location.search).get('trxref');
        pending = { themeId: stored, reference: reference || undefined };
      }
      if (pending.themeId && pending.reference) {
        void verifyPaymentAndApply(pending.themeId, pending.reference);
      } else {
        sessionStorage.removeItem('iyonic-vip-theme-purchase-pending');
      }
    } catch (storageError) {
      console.error('Could not resume theme payment verification:', storageError);
    }
  }, [isSeller, searchParams]);

  const purchaseTheme = async (themeId: string) => {
    if (!isSeller) {
      if (!user) navigate(`/login?theme=${encodeURIComponent(themeId)}&redirect=%2Fthemes`);
      else setError('Only sellers can acquire platform licenses.');
      return;
    }
    if (purchaseInProgress.current) return;
    purchaseInProgress.current = themeId;
    setApplyingId(themeId);
    setError('');
    setSuccess('Connecting to secure Paystack checkout…');
    try {
      const checkout = await withTimeout(sellersAPI.initializeThemePurchase(themeId), 'Checkout setup timed out. Please try again.');
      const accessCode = checkout.data?.access_code;
      if (!accessCode) throw new Error('Checkout did not return a secure payment session.');
      const PaystackPop = await loadPaystackPopup();
      let checkoutSettled = false;
      const popup = new PaystackPop();
      popup.resumeTransaction(accessCode, {
        onSuccess: (transaction) => {
          if (checkoutSettled) return;
          checkoutSettled = true;
          const reference = transaction.reference || transaction.trxref || checkout.data?.reference;
          if (!reference) {
            setError('Payment was submitted, but the provider did not return a reference. Contact support before trying again.');
            setApplyingId(null);
            purchaseInProgress.current = null;
            return;
          }
          sessionStorage.setItem('iyonic-vip-theme-purchase-pending', JSON.stringify({ themeId, reference }));
          void verifyPaymentAndApply(themeId, reference);
        },
        onCancel: () => {
          if (checkoutSettled) return;
          checkoutSettled = true;
          setSuccess('Checkout cancelled. No license was added and no payment was verified.');
          setApplyingId(null);
          purchaseInProgress.current = null;
        },
        onError: (popupError) => {
          if (checkoutSettled) return;
          checkoutSettled = true;
          setSuccess('');
          setError(popupError.message || 'The payment window could not complete checkout. No license was added.');
          setApplyingId(null);
          purchaseInProgress.current = null;
        },
      });
    } catch (purchaseError: any) {
      setSuccess('');
      setError(purchaseError.response?.data?.message || purchaseError.message || 'Could not start checkout. Please try again.');
      setApplyingId(null);
      purchaseInProgress.current = null;
    }
  };

  const submitOffer = async (themeId: string) => {
    setOfferResult(null);
    try {
      await sellersAPI.makeThemeOffer(themeId, Number(offerAmount), offerMessage);
      setOfferResult({ themeId, message: 'Offer sent to the theme owner.' });
      setOfferThemeId(null);
      setOfferMessage('');
    } catch (offerError: any) {
      setOfferResult({ themeId, message: offerError.response?.data?.message || 'Could not send your offer. Please try again.' });
    }
  };

  useEffect(() => {
    const requestedThemeId = searchParams.get('apply');
    if (!isSeller || !requestedThemeId || autoAppliedThemeId.current === requestedThemeId) return;
    const requestedTheme = THEMES.find((theme) => theme.id === requestedThemeId);
    if (!requestedTheme) return;
    autoAppliedThemeId.current = requestedThemeId;
    void applyTheme(requestedTheme);
  }, [searchParams, isSeller]);

  const returnPath = typeof location.state?.from === 'string'
    ? location.state.from
    : getThemeDashboardRoute(activeThemeId || undefined);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '')) return;
      event.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  return (
    <main className="theme-library">
      <SEO title="Business Website Themes & Platforms" description="Explore free storefront themes, business SaaS platforms, and specialist platforms from Iyonicorp. Preview each experience and find the right tools for your business." keywords="business website themes, ecommerce templates, storefront themes, business SaaS platforms, Iyonicorp themes" canonical="https://iyonicorp.com/#/themes" />
      <GlobalHeader context={user ? `${isSeller ? 'Seller workspace' : 'Customer account'}${user.name ? ` · ${user.name}` : ''}` : 'Themes & platforms'} dashboardHref={user ? returnPath : undefined} />

      <section className="theme-editorial-hero">
        <div className="theme-hero-inner">
          <div className="theme-hero-copy">
            <p className="theme-eyebrow"><LayoutGrid size={16} /> IYONICORP THEMES</p>
            <h1>Make it<br /><em>yours.</em></h1>
            <p className="theme-hero-lede">A clear place to find your next storefront or business platform. Browse, preview, and choose what fits.</p>
            <a className="theme-hero-link" href="#platform-catalog">Browse themes <ArrowRight size={17} /></a>
          </div>
          <aside className="theme-hero-aside" aria-label="Theme collection summary">
            <span className="theme-summary-icon"><Sparkles size={20} /></span>
            <strong>{THEMES.length} ways to get started</strong>
            <p>Free templates, ready-to-run platforms, and specialist services in one collection.</p>
            <div className="theme-summary-counts"><span><b>{FREE_TEMPLATE_IDS.size}</b> Free</span><span><b>{THEMES.filter((theme) => !FREE_TEMPLATE_IDS.has(theme.id) && !PRIVATE_PLATFORM_IDS.has(theme.id)).length}</b> Licensed</span><span><b>{PRIVATE_PLATFORM_IDS.size}</b> Private</span></div>
          </aside>
        </div>
      </section>

      <section className="theme-catalog-section" id="platform-catalog">
        <div className="theme-catalog-heading">
          <div>
            <p className="theme-eyebrow theme-eyebrow-dark">THE COLLECTION</p>
            <h2>Find your fit.</h2>
            <p className="theme-catalog-intro">Browse by access type, preview an experience, and choose the right fit for your business.</p>
          </div>
          <div className="theme-catalog-count"><strong>{visibleThemes.length.toString().padStart(2, '0')}</strong><span>of {THEMES.length} listings</span></div>
        </div>

        <div className="theme-discovery">
          <div className="theme-category-list" role="group" aria-label="Filter platforms by category">
            {CATEGORIES.map((item) => {
              const count = item === 'All collections'
                ? THEMES.length
                : THEMES.filter((theme) =>
                  (item === 'Free templates' && FREE_TEMPLATE_IDS.has(theme.id)) ||
                  (item === 'VIP SaaS platforms' && !FREE_TEMPLATE_IDS.has(theme.id) && !PRIVATE_PLATFORM_IDS.has(theme.id)) ||
                  (item === 'Private platforms' && PRIVATE_PLATFORM_IDS.has(theme.id))).length;
              return (
                <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`theme-category-button${category === item ? ' is-active' : ''}`}>
                  {item}<span aria-label={`${count} platforms`}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="theme-search">
            <Search size={17} aria-hidden="true" />
            <label className="sr-only" htmlFor="theme-search-input">Search platforms</label>
            <input id="theme-search-input" ref={searchInputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the collection" />
            {query ? <button type="button" className="theme-search-clear" onClick={() => { setQuery(''); searchInputRef.current?.focus(); }} aria-label="Clear search"><X size={15} /></button> : <kbd aria-hidden="true">/</kbd>}
          </div>
        </div>

        {error && <div role="alert" className="theme-message theme-message-error">
          {error}
          {canRetryVerification && pendingVerification && (
            <button type="button" disabled={verificationPending} onClick={() => void verifyPaymentAndApply(pendingVerification.themeId, pendingVerification.reference)}>
              {verificationPending ? 'Verifying…' : 'Retry payment verification'}
            </button>
          )}
        </div>}
        {verificationPending && <div role="status" className="theme-message theme-message-progress"><span className="theme-button-spinner" />Confirming your payment securely… Your theme will open as soon as it is verified.</div>}
        {success && <div role="status" className="theme-message theme-message-success">{success}</div>}

        {visibleThemes.length ? (
          <div className="theme-card-grid">
            {visibleThemes.map((theme, index) => {
              const isAcquired = acquiredThemeIds.includes(theme.id);
              const isActive = activeThemeId === theme.id;
              const price = THEME_PRICES_USD_CENTS[theme.id] / 100;
              const isBusy = applyingId === theme.id;
              const sellerAccessRequired = Boolean(user && !isSeller && !isActive);
              return (
                <article key={theme.id} className={`theme-card${index === 0 && category === 'All collections' && !query ? ' theme-card-featured' : ''}`}>
                <div className="theme-card-preview">
                  <iframe className="theme-card-site-frame" src={previewUrl(theme.id)} title={`${theme.name} storefront thumbnail`} loading="lazy" tabIndex={-1} aria-hidden="true" />
                  <span className="theme-kind-label">{kindLabel[theme.kind]}</span>
                  <a className="theme-external-preview" href={previewUrl(theme.id)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${theme.name} preview in a new tab`}><ExternalLink size={14} /><span>Open preview</span></a>
                  <button type="button" className="theme-preview-action" onClick={(event) => { previewTriggerRef.current = event.currentTarget; setPreviewMode('desktop'); setPreviewTheme(theme); }} aria-label={`Preview ${theme.name} fullscreen`}><Eye size={16} /> Preview</button>
                </div>
                  <div className="theme-card-body">
                    <div className="theme-card-tags">
                      <span className="theme-vip-tag"><Sparkles size={10} /> {FREE_TEMPLATE_IDS.has(theme.id) ? 'FREE TEMPLATE' : PRIVATE_PLATFORM_IDS.has(theme.id) ? 'PRIVATE' : 'VIP SAAS'}</span>
                      {theme.tags.map((tag) => <span key={tag}>{tag}</span>)}
                      {isSeller && isAcquired && <span className="theme-owned-tag"><BadgeCheck size={12} /> Licensed</span>}
                    </div>
                    <div className="theme-card-title-row"><h3>{theme.name}</h3>{FREE_TEMPLATE_IDS.has(theme.id) ? <span className="theme-card-price">Free<small>template</small></span> : <span className="theme-card-price">${price.toFixed(2)}<small>USD · one-time</small></span>}</div>
                    <p className="theme-card-description">{theme.description}</p>
                    <div className="theme-license-note"><Check size={14} /> {FREE_TEMPLATE_IDS.has(theme.id) ? 'Free storefront template' : PRIVATE_PLATFORM_IDS.has(theme.id) ? 'Privately operated platform' : 'Acquire the SaaS and manage it from your owner dashboard'}</div>
                    <div className="theme-card-actions">
                      <button
                        type="button"
                        onClick={() => isActive ? navigate(getThemeDashboardRoute(theme.id)) : (isAcquired || FREE_TEMPLATE_IDS.has(theme.id)) ? void applyTheme(theme) : void purchaseTheme(theme.id)}
                        disabled={isBusy || acquisitionsLoading || (isActive && !isSeller) || sellerAccessRequired || PRIVATE_PLATFORM_IDS.has(theme.id)}
                        title={sellerAccessRequired ? 'A seller account is required to acquire and apply a platform.' : undefined}
                        aria-describedby={sellerAccessRequired ? 'theme-seller-note' : undefined}
                        className={`theme-primary-action${isActive ? ' is-applied' : ''}${sellerAccessRequired ? ' is-role-disabled' : ''}`}
                      >
                        {isBusy ? <><span className="theme-button-spinner" />{isAcquired || FREE_TEMPLATE_IDS.has(theme.id) ? 'Opening platform…' : 'Opening checkout…'}</>
                          : isActive ? <><Check size={15} /> Open applied platform</>
                            : acquisitionsLoading && isSeller ? 'Checking license…'
                              : PRIVATE_PLATFORM_IDS.has(theme.id) ? 'Privately operated'
                                : FREE_TEMPLATE_IDS.has(theme.id) ? <><Store size={15} /> Use free template</>
                                  : isSeller && isAcquired ? <><Store size={15} /> Open owner dashboard</>
                                : !user ? <><Store size={15} /> Sign in to acquire</>
                                  : isSeller ? <><Store size={15} /> Acquire · ${price.toFixed(2)}</>
                                    : 'Seller account required'}
                      </button>
                      {isSeller && !isAcquired && !isActive && !FREE_TEMPLATE_IDS.has(theme.id) && !PRIVATE_PLATFORM_IDS.has(theme.id) && (
                        <button type="button" className="theme-offer-toggle" onClick={() => {
                          setOfferThemeId(offerThemeId === theme.id ? null : theme.id);
                          setOfferAmount((price - 5).toFixed(2));
                          setOfferResult(null);
                        }} aria-expanded={offerThemeId === theme.id} aria-controls={offerThemeId === theme.id ? `offer-form-${theme.id}` : undefined}>{offerThemeId === theme.id ? 'Close offer form' : 'Make an offer'}</button>
                      )}
                    </div>
                    {offerThemeId === theme.id && isSeller && (
                      <form id={`offer-form-${theme.id}`} className="theme-offer-form" onSubmit={(event) => { event.preventDefault(); void submitOffer(theme.id); }}>
                        <label htmlFor={`offer-amount-${theme.id}`}>Your offer (USD)</label>
                        <input id={`offer-amount-${theme.id}`} type="number" min="1" max="50000" step="0.01" required value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} />
                        <textarea value={offerMessage} onChange={(event) => setOfferMessage(event.target.value)} maxLength={1000} rows={2} placeholder="Add a short note (optional)" aria-label="Offer note" />
                        <div><button type="button" onClick={() => setOfferThemeId(null)}>Cancel</button><button type="submit"><Send size={13} /> Send offer</button></div>
                      </form>
                    )}
                    {offerResult?.themeId === theme.id && <p role="status" className="theme-offer-result">{offerResult.message}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="theme-empty-state"><Search size={22} /><h3>No platforms found</h3><p>Try another search or choose a broader category.</p></div>
        )}
        {!isSeller && <p id="theme-seller-note" className="theme-seller-note"><Ticket size={15} /> Platform licenses are available to seller accounts. Explore each live preview before signing in.</p>}
      </section>
      {previewTheme && createPortal((
        <div className={`theme-preview-backdrop${previewMode === 'mobile' ? ' is-mobile-preview' : ''}`} onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setPreviewTheme(null);
          }
        }}>
          <section ref={previewDialogRef} className={`theme-preview-dialog${previewMode === 'mobile' ? ' is-mobile-preview' : ''}`} role="dialog" aria-modal="true" aria-labelledby="theme-preview-title">
            <header className="theme-preview-toolbar">
              <div className="theme-preview-heading"><span className="theme-preview-status" aria-hidden="true" /><div><p className="theme-preview-kicker">Theme preview</p><h2 id="theme-preview-title">{previewTheme.name}</h2></div></div>
              <div className="theme-preview-actions" role="group" aria-label="Preview size">
                <button type="button" className={`theme-preview-mode${previewMode === 'desktop' ? ' is-active' : ''}`} aria-pressed={previewMode === 'desktop'} onClick={() => setPreviewMode('desktop')}><Monitor size={16} /><span>Desktop</span></button>
                <button type="button" className={`theme-preview-mode${previewMode === 'mobile' ? ' is-active' : ''}`} aria-pressed={previewMode === 'mobile'} onClick={() => setPreviewMode('mobile')}><Smartphone size={16} /><span>Mobile</span></button>
                <a className="theme-preview-open-link" href={previewUrl(previewTheme.id)} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /><span>Open preview</span></a>
                <button ref={previewCloseRef} type="button" className="theme-preview-close" onClick={() => setPreviewTheme(null)} aria-label={`Close ${previewTheme.name} preview`}><X size={18} /><span>Close</span></button>
              </div>
            </header>
            <iframe ref={previewFrameRef} key={previewTheme.id} src={previewUrl(previewTheme.id)} title={`${previewTheme.name} website preview`} loading="lazy" className="theme-preview-iframe" />
          </section>
        </div>
      ), document.body)}
      <footer className="theme-library-footer">
        <div className="theme-footer-main"><div className="theme-footer-brand"><Link to="/"><img src="/logo.png" alt="" />Iyonicorp</Link><p>Tools and platforms for what you’re building next.</p></div>
          <nav aria-label="Footer navigation"><div><strong>Explore</strong><Link to="/bizhub">BizHub</Link><Link to="/iyonicpay">IyonicPay</Link><Link to="/iyonicintelligence">Iyonic Intelligence</Link></div><div><strong>More</strong><Link to="/iyonicdb">IyonicDB</Link><Link to="/iyonic-mailer">IyonicMailer</Link><Link to="/about">About Iyonicorp</Link></div></nav>
        </div><div className="theme-footer-bottom"><span>© {new Date().getFullYear()} Iyonicorp</span><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link className="theme-footer-backtop" to="#platform-catalog">Back to collection ↑</Link></div>
      </footer>

      {launchingTheme && (
        <ThemeLaunchOverlay
          themeName={launchingTheme.name}
          previewUrl={previewUrl(launchingTheme.id)}
          kind={kindLabel[launchingTheme.kind]}
          state={launchState}
          error={launchError}
          onRetry={() => void applyTheme(launchingTheme)}
          onClose={() => { setLaunchingTheme(null); setLaunchError(''); void refreshData(); }}
        />
      )}
    </main>
  );
};

export default Themes;
