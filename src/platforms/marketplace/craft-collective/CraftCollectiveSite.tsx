import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Filter, Grid, List, Mail, MapPin, Phone, Scissors, Search, ShoppingBag, Star, Truck } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller, sellersAPI, productsAPI } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import { defaultMarketSettings, getMarketSettings, isCraftCollective, MarketOrderData, readMarketOrder, saveMarketSettings } from './craftCollectiveTypes';
import './craft-collective.css';

interface Props { seller?: Seller; products?: Product[]; demoMode?: boolean }

const CATEGORIES = ['All', 'Home', 'Jewelry', 'Art', 'Fashion', 'Food', 'Crafts', 'Ceramics'];

const createDemoCraftSeller = (): Seller => ({
  id: 'craft-demo-seller',
  userId: 'craft-demo-user',
  storeName: 'Craft Collective',
  subdomain: 'craft-collective',
  shopType: 'product',
  themeId: 'craft-collective',
  theme: {
    primaryColor: '#7c4d32',
    secondaryColor: '#f5efe6',
    fontFamily: 'Inter',
    selectedTheme: 'craft-collective',
    customizations: {},
  },
  subscription: { plan: 'starter', status: 'active', startDate: null, endDate: null },
  stats: { totalProducts: 0, totalOrders: 0, totalRevenue: 0, totalCustomers: 0 },
  isLive: true,
  createdAt: new Date().toISOString(),
});

const CraftCollectiveSite: React.FC<Props> = ({ seller: sellerProp, products: initialProducts = [], demoMode = false }) => {
  const { user } = useAuth();
  const seller = sellerProp || createDemoCraftSeller();
  const [marketSettings, setMarketSettings] = useState(() => getMarketSettings(seller));
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
  const [vendors, setVendors] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high' | 'newest' | 'rating'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const isDemo = demoMode;
  const itemsPerPage = 12;

  useEffect(() => {
    if (isDemo) {
      setMarketSettings((prev) => ({
        ...prev,
        marketplaceName: 'Craft Collective',
      }));
      return;
    }
    let active = true;
    Promise.all([
      sellersAPI.getAll(),
      productsAPI.getBySellerId(seller.id),
    ])
      .then(([allSellers, sellerProducts]) => {
        if (!active) return;
        const vendorIds = allSellers
          .filter((s) => s.shopType === 'service' && s.themeId && !s.id.startsWith('demo'))
          .map((s) => s.id);
        const vendorList = allSellers.filter((s) => vendorIds.includes(s.id)).slice(0, 12);
        setVendors(vendorList);
        const enriched = (sellerProducts || []).map((product) => ({
          ...product,
          sellerName: seller.storeName,
          sellerId: seller.id,
        }));
        setAllProducts(enriched);
      })
      .catch(() => {
        if (active) {
          setVendors(seller.id ? [] : []);
          setAllProducts(initialProducts || []);
        }
      });
    return () => { active = false; };
  }, [seller, initialProducts, isDemo]);

  const filteredProducts = allProducts
    .filter((product) => {
      const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'newest':
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        case 'rating':
          return (b.images?.length || 0) - (a.images?.length || 0);
        default:
          return 0;
      }
    });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginated = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const featuredVendors = vendors.slice(0, 4);

  const handleVendorClick = (vendorSubdomain: string) => {
    window.location.href = `/shop/${vendorSubdomain}`;
  };

  const handleProductClick = (product: Product) => {
    const sellerName = (product as any).sellerName || 'Artisan';
    const sellerSubdomain = (product as any).sellerSubdomain || 'vendor';
    window.location.href = `/shop/${sellerSubdomain}`;
  };

  const toggleAddOn = () => {
    setMarketSettings((prev) => ({
      ...prev,
      announcements: [
        ...prev.announcements,
        {
          id: Date.now().toString(),
          title: 'Welcome to the collective',
          content: 'We handpick the best independent makers for you.',
          active: true,
        },
      ],
    }));
    void sellersAPI.updateMe(saveMarketSettings(seller, { ...marketSettings } as any));
  };

  const activeAnnouncement = marketSettings.announcements.find((a) => a.active);

  return (
    <div className="cc-market">
      <header className="cc-site-header">
        <nav className="cc-nav">
          <a href="#top" className="cc-wordmark">
            <span className="wordmark-mark"><Scissors size={18} /></span>
            <span>{marketSettings.marketplaceName || seller.storeName || 'Craft'} <em>Collective</em></span>
          </a>
          <div className="nav-links">
            <a href="#fleet" className="active">Shop</a>
            <a href="#vendors">Vendors</a>
            <a href="#process">How it works</a>
            <a href="#contact">Contact</a>
            <button className="cc-btn cc-btn-outline cc-btn-sm">
              <ShoppingBag size={14} /> Cart
            </button>
          </div>
        </nav>
      </header>

      {activeAnnouncement && (
        <div className="cc-notice">
          <CalendarDays size={15} /> {activeAnnouncement.content}
        </div>
      )}

      <main className="cc-page-shell">
        <section className="cc-hero">
          <div className="cc-hero__content">
            <p className="cc-kicker">CURATED MARKETPLACE</p>
            <h1>Artisan finds for <span>beautiful living</span>.</h1>
            <p>
              Discover contemporary pieces from independent makers, small-batch studios, and design-led homes.
              Every order supports real craft, real people, and a slower, more intentional way to shop.
            </p>
            <div className="cc-hero__actions">
              <button className="cc-btn cc-btn-primary" onClick={() => window.location.href = '/marketplace/craft-collective#fleet'}>
                Start shopping <ArrowRight size={16} />
              </button>
              <button className="cc-btn cc-btn-outline" onClick={() => window.location.href = '/marketplace/craft-collective#vendors'}>
                Meet our makers
              </button>
            </div>
            <div className="cc-trust-row">
              <span><strong>4.9/5</strong> average rating</span>
              <span><strong>120+</strong> artisan partners</span>
              <span><strong>48h</strong> dispatch window</span>
            </div>
          </div>

          <div className="cc-hero__visual">
            <div className="cc-showcase-card">
              <div className="cc-showcase-visual">
                <div className="cc-showcase-badge">New drop</div>
              </div>
              <div className="cc-showcase-meta">
                <div>
                  <span>Studio Edit</span>
                  <strong>Nordic Atelier</strong>
                </div>
                <button className="cc-btn cc-btn-primary cc-btn-sm">View collection</button>
              </div>
            </div>
          </div>
        </section>

        <section className="cc-stats">
          <article className="cc-stat-card">
            <span className="cc-stat-label">Handpicked</span>
            <strong>1,200+</strong>
            <p>Pieces reviewed by makers and editors.</p>
          </article>
          <article className="cc-stat-card accent">
            <span className="cc-stat-label">Independent</span>
            <strong>96%</strong>
            <p>Of our partners are small-batch studios.</p>
          </article>
          <article className="cc-stat-card">
            <span className="cc-stat-label">Community</span>
            <strong>12k</strong>
            <p>Collectors, stylists, and homes supported.</p>
          </article>
        </section>

        <section className="cc-featured" id="featured">
          <div className="section-header">
            <p className="cc-kicker">SELECTED EDITS</p>
            <h2>Curated for thoughtful homes and slower rituals.</h2>
          </div>

          <div className="cc-feature-grid">
            <article className="cc-feature-card feature-one">
              <div className="cc-feature-card__content">
                <span>Home</span>
                <h3>Warm, tactile living.</h3>
                <p>Natural materials, sculptural silhouettes, and artisan-made comfort.</p>
              </div>
            </article>
            <article className="cc-feature-card feature-two">
              <div className="cc-feature-card__content">
                <span>Jewelry</span>
                <h3>One-of-a-kind shine.</h3>
                <p>Statement pieces designed to feel personal from the very first wear.</p>
              </div>
            </article>
            <article className="cc-feature-card feature-three">
              <div className="cc-feature-card__content">
                <span>Objects</span>
                <h3>Story-rich details.</h3>
                <p>Thoughtful pieces that transform everyday rituals into memorable rituals.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="nova-vehicles cc-collection" id="fleet" style={{ padding: '60px 40px' }}>
          <div className="section-header">
            <p className="cc-kicker">OUR COLLECTION</p>
            <h2>Curated by category and style.</h2>
            <p style={{ color: 'var(--cc-charcoal-light)', marginBottom: '32px' }}>
              {filteredProducts.length} item{filteredProducts.length === 1 ? '' : 's'} across {vendors.length} makers
            </p>
          </div>

          <div style={{ maxWidth: '1200px', margin: '0 auto 32px' }}>
            <div className="category-bar">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  className={`category-btn ${activeCategory === category ? 'active' : ''}`}
                  onClick={() => { setActiveCategory(category); setCurrentPage(1); }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="products-grid">
            {paginated.length ? (
              paginated.map((product) => (
                <article key={product.id} className="product-card" onClick={() => handleProductClick(product)}>
                  {product.images && product.images[0] ? (
                    <img src={product.images[0]} alt={product.name} className="product-image" />
                  ) : (
                    <div className="product-placeholder">
                      <Scissors size={36} />
                    </div>
                  )}
                  <div className="product-content">
                    <span className="vendor-badge">{product.category}</span>
                    <h3>{product.name}</h3>
                    <div className="product-meta">
                      <span className="product-price">{formatPrice(product.price, marketSettings.currency)}</span>
                      <span className="product-rating">
                        <Star size={14} fill="currentColor" /> 4.8
                      </span>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '48px', gridColumn: '1 / -1' }}>
                <Scissors size={40} style={{ color: 'var(--cc-sage)' }} />
                <p style={{ marginTop: '12px' }}>No items match your filters.</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '32px' }}>
              <button
                className="nova-btn nova-btn-ghost nova-btn-sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`nova-btn nova-btn-sm ${currentPage === page ? 'nova-btn-primary' : 'nova-btn-ghost'}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="nova-btn nova-btn-ghost nova-btn-sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>

        <section className="nova-vehicles cc-makers" id="vendors" style={{ background: 'var(--cc-paper)', padding: '60px 40px' }}>
          <div className="section-header">
            <p className="cc-kicker">OUR MAKERS</p>
            <h2>The artisans behind the pieces.</h2>
          </div>

          <div className="vendors-grid">
            {featuredVendors.length ? (
              featuredVendors.map((vendor) => (
                <div key={vendor.id} className="vendor-card">
                  {vendor.logo ? (
                    <img src={vendor.logo} alt={vendor.storeName} className="vendor-logo" />
                  ) : (
                    <div className="vendor-placeholder">
                      <Scissors size={24} />
                    </div>
                  )}
                  <h3>{vendor.storeName || vendor.ownerName}</h3>
                  <p className="vendor-location">{vendor.contactInfo?.address || 'Local artisan'}</p>
                  <button className="cc-btn cc-btn-outline cc-btn-sm" onClick={() => handleVendorClick(vendor.subdomain)}>
                    Shop store <ArrowRight size={12} />
                  </button>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '48px', gridColumn: '1 / -1' }}>
                <Scissors size={40} style={{ color: 'var(--cc-sage)' }} />
                <p style={{ marginTop: '12px' }}>Vendor profiles coming soon.</p>
              </div>
            )}
          </div>
        </section>

        <section className="cc-story" id="process">
          <div className="section-header" style={{ color: 'var(--cc-cream)' }}>
            <p className="cc-kicker">HOW IT WORKS</p>
            <h2 style={{ color: 'var(--cc-cream)' }}>Simple as three steps.</h2>
          </div>

          <div className="cc-process-grid">
            <div className="cc-process-card">
              <div className="cc-process-icon">
                <ShoppingBag size={22} />
              </div>
              <h3>Browse & buy</h3>
              <p>Discover curated pieces from independent makers and studios with a distinctly human story.</p>
            </div>
            <div className="cc-process-card">
              <div className="cc-process-icon">
                <Truck size={22} />
              </div>
              <h3>Ships directly</h3>
              <p>Your order is fulfilled by the artisan themselves, with care and a personal touch.</p>
            </div>
            <div className="cc-process-card">
              <div className="cc-process-icon">
                <Star size={22} />
              </div>
              <h3>Love it</h3>
              <p>Leave a review and help other shoppers uncover their next favorite piece.</p>
            </div>
          </div>
        </section>

        <section className="nova-vehicles cc-contact" id="contact" style={{ padding: '60px 40px' }}>
          <div className="section-header">
            <p className="cc-kicker">SAY HELLO</p>
            <h2>Have a question? We love to hear from you.</h2>
          </div>
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {seller.contactInfo?.email && (
                <a href={`mailto:${seller.contactInfo.email}?subject=${encodeURIComponent('Marketplace inquiry')}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cc-charcoal)', textDecoration: 'none' }}>
                  <Mail size={20} color="var(--cc-terracotta)" /> {seller.contactInfo.email}
                </a>
              )}
              {seller.contactInfo?.phone && (
                <a href={`tel:${seller.contactInfo.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cc-charcoal)', textDecoration: 'none' }}>
                  <Phone size={20} color="var(--cc-terracotta)" /> {seller.contactInfo.phone}
                </a>
              )}
              {seller.contactInfo?.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cc-charcoal-light)' }}>
                  <MapPin size={20} color="var(--cc-terracotta)" /> {seller.contactInfo.address}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="nova-footer">
        <div className="footer-grid">
          <div>
            <a href="#top" className="cc-wordmark">
              <span className="wordmark-mark"><Scissors size={18} /></span>
              <span>{marketSettings.marketplaceName || 'Craft'} <em>Collective</em></span>
            </a>
            <p style={{ marginTop: '12px', opacity: '0.6' }}>
              {marketSettings.marketplaceDescription || 'A curated marketplace for independent makers.'}
            </p>
            <div className="social-links">
              {seller.socialLinks?.instagram && (
                <a href={seller.socialLinks.instagram} aria-label="Instagram"><Scissors size={16} /></a>
              )}
              {seller.socialLinks?.facebook && (
                <a href={seller.socialLinks.facebook} aria-label="Facebook"><Scissors size={16} /></a>
              )}
            </div>
          </div>
          <div>
            <h4>Shop</h4>
            <div className="footer-links">
              {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                <a key={cat} href="#fleet" onClick={() => setActiveCategory(cat)}>{cat}</a>
              ))}
            </div>
          </div>
          <div>
            <h4>Support</h4>
            <div className="footer-links">
              <a href="#process">How it works</a>
              <a href="#contact">Contact</a>
              <a href="#privacy">Privacy</a>
              <a href="#terms">Terms</a>
            </div>
          </div>
          <div>
            <h4>For makers</h4>
            <div className="footer-links">
              <a href="#vendors">Become a vendor</a>
              <a href="#contact">Vendor support</a>
            </div>
          </div>
        </div>
        <div className="copyright">
          <p>© {new Date().getFullYear()} {marketSettings.marketplaceName || seller.storeName || 'Craft Collective'}</p>
        </div>
      </footer>
    </div>
  );
};

export default CraftCollectiveSite;
