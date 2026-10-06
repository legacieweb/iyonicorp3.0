import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDownLeft, ArrowRight, BadgeCheck, Check, ExternalLink, LayoutGrid, Search, Send, Sparkles, Store, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Seller, sellersAPI } from '../services/api';
import { getThemeDashboardRoute } from '../utils/themeDashboard';
import ThemeLaunchOverlay, { ThemeLaunchState } from '../components/ThemeLaunchOverlay';
import { THEME_PRICES_USD_CENTS } from '../utils/vipThemes';
import './theme-catalog.css';

type ThemeKind = 'product' | 'service' | 'streaming' | 'education';
type ThemeCategory = 'All platforms' | 'Product stores' | 'Service platforms' | 'Streaming platforms' | 'Education platforms';
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
];

const CATEGORIES: ThemeCategory[] = ['All platforms', 'Product stores', 'Service platforms', 'Streaming platforms', 'Education platforms'];
const kindLabel: Record<ThemeKind, string> = {
  product: 'Product storefront',
  service: 'Service platform',
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

const Themes: React.FC = () => {
  const { user } = useAuth();
  const { refreshData } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState<ThemeCategory>('All platforms');
  const [query, setQuery] = useState('');
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
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const [verificationPending, setVerificationPending] = useState(false);
  const [canRetryVerification, setCanRetryVerification] = useState(false);
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

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const pageParams = new URLSearchParams(window.location.search);
    const reference = searchParams.get('reference') || searchParams.get('trxref') ||
      hashParams.get('reference') || hashParams.get('trxref') ||
      pageParams.get('reference') || pageParams.get('trxref');
    const themeId = sessionStorage.getItem('iyonic-vip-theme-purchase-pending');
    if (!reference || !themeId || !isSeller) return;

    let active = true;
    setVerificationPending(true);
    setCanRetryVerification(false);
    setError('');
    withTimeout(sellersAPI.verifyThemePurchase(themeId, reference), 'Payment verification timed out. Your payment reference is saved; retry verification below.').then(async ({ acquiredThemes }) => {
      if (!active) return;
      sessionStorage.removeItem('iyonic-vip-theme-purchase-pending');
      setAcquiredThemeIds(acquiredThemes);
      setSuccess('Payment confirmed. Your one-time theme license is ready to apply.');
      setVerificationPending(false);
      setCanRetryVerification(false);
      try {
        await refreshData();
      } catch (refreshError) {
        console.error('Theme purchase was verified, but seller data could not be refreshed:', refreshError);
      }
      setSearchParams({}, { replace: true });
    }).catch((verifyError) => {
      if (!active) return;
      setError(verifyError.response?.data?.message || 'We could not verify that payment. This theme has not been unlocked.');
      setVerificationPending(false);
      setCanRetryVerification(true);
    });
    return () => { active = false; };
  }, [searchParams, setSearchParams, isSeller, refreshData, verificationAttempt]);

  const previewUrl = (themeId: string) => {
    if (themeId === 'nlmsongs' || themeId === 'ixstream' || themeId === 'utorme' || themeId === 'tspp') {
      return `${window.location.origin}/#/${themeId}`;
    }
    return `${window.location.origin}/#/shop/demo?theme=${encodeURIComponent(themeId)}`;
  };

  const visibleThemes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return THEMES.filter((theme) => {
      const matchesCategory = category === 'All platforms' ||
        (category === 'Product stores' && theme.kind === 'product') ||
        (category === 'Service platforms' && theme.kind === 'service') ||
        (category === 'Streaming platforms' && theme.kind === 'streaming') ||
        (category === 'Education platforms' && theme.kind === 'education');
      const matchesQuery = !normalizedQuery || [theme.name, theme.description, ...theme.tags].join(' ').toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const applyTheme = async (theme: ThemeOption) => {
    if (!isSeller) {
      if (!user) navigate('/login?redirect=%2Fthemes');
      else setError('A seller account is required to acquire and apply a platform.');
      return;
    }

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
      if (!acquiredThemes.includes(theme.id) && selectedTheme !== theme.id) {
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
      setApplyingId(null);
    }
  };

  const purchaseTheme = async (themeId: string) => {
    if (!isSeller) {
      if (!user) navigate('/login?redirect=%2Fthemes');
      else setError('Only sellers can acquire platform licenses.');
      return;
    }
    setApplyingId(themeId);
    setError('');
    try {
      sessionStorage.setItem('iyonic-vip-theme-purchase-pending', themeId);
      const checkout = await withTimeout(sellersAPI.initializeThemePurchase(themeId), 'Checkout setup timed out. Please try again.');
      const authorizationUrl = checkout.data?.authorization_url;
      if (!authorizationUrl) throw new Error('Checkout did not return a payment link.');
      window.location.assign(authorizationUrl);
    } catch (purchaseError: any) {
      sessionStorage.removeItem('iyonic-vip-theme-purchase-pending');
      setError(purchaseError.response?.data?.message || purchaseError.message || 'Could not start checkout. Please try again.');
      setApplyingId(null);
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

  return (
    <main className="theme-library">
      <header className="theme-library-header">
          <Link to="/" className="theme-library-brand" aria-label="Iyonicorp home">
            <img src="/logo.png" alt="" />
            <span>Iyonicorp<small>THE PLATFORM COLLECTION</small></span>
          </Link>
        <div className="theme-library-header-actions">
          {user && <span className="theme-account-context"><span className="theme-account-dot" />{isSeller ? 'Seller workspace' : 'Customer account'}{user.name ? ` · ${user.name}` : ''}</span>}
          <Link to={returnPath} className="theme-return-link"><ArrowDownLeft size={16} /> Dashboard</Link>
        </div>
      </header>

      <section className="theme-editorial-hero">
        <div className="theme-hero-grain" aria-hidden="true" />
        <div className="theme-hero-inner">
          <div className="theme-hero-copy">
            <p className="theme-eyebrow"><LayoutGrid size={14} /> CURATED FOR THE WAY YOU WORK</p>
            <h1>Your next<br /><em>business platform.</em></h1>
            <p className="theme-hero-lede">From independent storefronts to full service platforms—choose a considered foundation, preview it in motion, then make it yours.</p>
            <a className="theme-hero-link" href="#platform-catalog">Explore the collection <ArrowRight size={16} /></a>
          </div>
          <aside className="theme-hero-aside" aria-label="Collection facts">
            <div className="theme-hero-stat"><strong>{THEMES.length.toString().padStart(2, '0')}</strong><span>working platforms<br />to make your own</span></div>
            <div className="theme-hero-rule" />
            <p><Sparkles size={16} /> One-time license. No recurring theme fee.</p>
            <span className="theme-hero-price">USD 30—1500</span>
          </aside>
        </div>
        <div className="theme-hero-caption"><span>THE IYONICWEB LIBRARY</span><span>DESIGNED TO DO MORE&nbsp; / &nbsp;01—{String(THEMES.length).padStart(2, '0')}</span></div>
      </section>

      <section className="theme-catalog-section" id="platform-catalog">
        <div className="theme-catalog-heading">
          <div>
            <p className="theme-eyebrow theme-eyebrow-dark">THE COLLECTION</p>
            <h2>Find your platform.</h2>
            <p className="theme-catalog-intro">Every listing includes a live preview, a clear one-time price, and a real path into the platform.</p>
          </div>
          <div className="theme-catalog-count"><strong>{visibleThemes.length.toString().padStart(2, '0')}</strong><span>of {THEMES.length} platforms</span></div>
        </div>

        <div className="theme-discovery">
          <div className="theme-category-list" role="group" aria-label="Filter platforms by category">
            {CATEGORIES.map((item) => (
              <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`theme-category-button${category === item ? ' is-active' : ''}`}>{item}</button>
            ))}
          </div>
          <label className="theme-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search platforms</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the collection" />
            <kbd>/</kbd>
          </label>
        </div>

        {error && <div role="alert" className="theme-message theme-message-error">
          {error}
          {canRetryVerification && sessionStorage.getItem('iyonic-vip-theme-purchase-pending') && (
            <button type="button" onClick={() => { setError(''); setVerificationAttempt((attempt) => attempt + 1); }}>Retry payment verification</button>
          )}
        </div>}
        {verificationPending && <div role="status" className="theme-message theme-message-success">Confirming your payment with the payment provider…</div>}
        {success && <div role="status" className="theme-message theme-message-success">{success}</div>}

        {visibleThemes.length ? (
          <div className="theme-card-grid">
            {visibleThemes.map((theme, index) => {
              const isAcquired = acquiredThemeIds.includes(theme.id);
              const isActive = activeThemeId === theme.id;
              const price = THEME_PRICES_USD_CENTS[theme.id] / 100;
              const isBusy = applyingId === theme.id;
              return (
                <article key={theme.id} className={`theme-card${index === 0 && category === 'All platforms' && !query ? ' theme-card-featured' : ''}`}>
                  <div className="theme-card-preview">
                    <iframe src={previewUrl(theme.id)} title={`${theme.name} live platform preview`} loading="lazy" tabIndex={-1} aria-hidden="true" className="theme-card-frame" />
                    <div className="theme-preview-shade" />
                    <span className="theme-kind-label">{kindLabel[theme.kind]}</span>
                    <a href={previewUrl(theme.id)} target="_blank" rel="noreferrer" className="theme-preview-action" aria-label={`Open ${theme.name} preview in a new tab`}>Preview <ExternalLink size={13} /></a>
                    <span className="theme-preview-index">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="theme-card-body">
                    <div className="theme-card-tags">
                      {theme.tags.map((tag) => <span key={tag}>{tag}</span>)}
                      {isSeller && isAcquired && <span className="theme-owned-tag"><BadgeCheck size={12} /> Licensed</span>}
                    </div>
                    <div className="theme-card-title-row"><h3>{theme.name}</h3><span className="theme-card-price">${price.toFixed(2)}<small>USD · one-time</small></span></div>
                    <p className="theme-card-description">{theme.description}</p>
                    <div className="theme-license-note"><Check size={14} /> One-time license, secured through checkout</div>
                    <div className="theme-card-actions">
                      <button
                        type="button"
                        onClick={() => isActive ? navigate(getThemeDashboardRoute(theme.id)) : isAcquired ? void applyTheme(theme) : void purchaseTheme(theme.id)}
                        disabled={isBusy || acquisitionsLoading || (isActive && !isSeller)}
                        className={`theme-primary-action${isActive ? ' is-applied' : ''}`}
                      >
                        {isBusy ? <><span className="theme-button-spinner" />{isAcquired ? 'Opening platform…' : 'Opening checkout…'}</>
                          : isActive ? <><Check size={15} /> Open applied platform</>
                            : acquisitionsLoading && isSeller ? 'Checking license…'
                              : isSeller && isAcquired ? <><Store size={15} /> Apply platform</>
                                : !user ? <><Store size={15} /> Sign in to acquire</>
                                  : isSeller ? <><Store size={15} /> Acquire · ${price.toFixed(2)}</>
                                    : 'Seller access required'}
                      </button>
                      {isSeller && !isAcquired && !isActive && (
                        <button type="button" className="theme-offer-toggle" onClick={() => {
                          setOfferThemeId(offerThemeId === theme.id ? null : theme.id);
                          setOfferAmount((price - 5).toFixed(2));
                          setOfferResult(null);
                        }}>Make an offer</button>
                      )}
                    </div>
                    {offerThemeId === theme.id && isSeller && (
                      <form className="theme-offer-form" onSubmit={(event) => { event.preventDefault(); void submitOffer(theme.id); }}>
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
        {!isSeller && <p className="theme-seller-note"><Ticket size={15} /> Platform licenses are available to seller accounts. Explore each live preview before signing in.</p>}
      </section>
      <footer className="theme-library-footer"><Link to="/"><img src="/logo.png" alt="" />Iyonicorp</Link><span>Build the business that feels like yours.</span></footer>

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
