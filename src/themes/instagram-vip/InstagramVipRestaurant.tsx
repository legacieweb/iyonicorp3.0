import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Seller } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './instagram-vip.css';

const INSTAGRAM_VIP_DEFAULT_SELLER: Seller = {
  id: 'ig-vip-restaurant',
  userId: 'ig-vip-user',
  storeName: 'Golden Spoon',
  subdomain: 'golden-spoon',
  shopType: 'service',
  description: 'Where every dish tells a story of passion, heritage, and the freshest seasonal ingredients.',
  themeId: 'instagram-vip',
  isLive: true,
  createdAt: new Date().toISOString(),
  contactInfo: {
    email: 'reservations@goldenspoon.com',
    phone: '(555) 123-4567',
    address: '123 Culinary Street, Food District, NY 10001',
  },
  subscription: { plan: 'professional', status: 'active', startDate: null, endDate: null },
  stats: { totalProducts: 0, totalOrders: 0, totalRevenue: 0, totalCustomers: 0 },
  theme: {
    primaryColor: '#833ae5',
    secondaryColor: '#0d0d0d',
    fontFamily: 'Inter',
    selectedTheme: 'instagram-vip',
    customizations: {
      hero_title_1: 'Golden',
      hero_title_2: 'Spoon',
      hero_subtitle: "An intimate dining experience where modern technique meets timeless comfort. Our seasonal menu celebrates the bounty of local farms with a touch of luxury.",
      hero_badge: 'Michelin Recommended',
      heroImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80',
    },
  },
};

const DEFAULT_RESTAURANT_PRODUCTS: Product[] = [
  {
    id: 'app-1',
    sellerId: 'golden-spoon',
    name: 'Truffle Burrata Toast',
    price: 18,
    description: 'Charred sourdough layered with burrata, truffle oil, and roasted grapes.',
    category: 'Appetizers',
    type: 'service',
    images: ['https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80'],
    stock: 999,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'm-1',
    sellerId: 'golden-spoon',
    name: 'Charred Citrus Salmon',
    price: 29,
    description: 'Seared salmon with saffron rice, grilled greens, and lemon beurre blanc.',
    category: 'Mains',
    type: 'service',
    images: ['https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80'],
    stock: 999,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'm-2',
    sellerId: 'golden-spoon',
    name: 'Wild Mushroom Risotto',
    price: 26,
    description: 'Creamy arborio rice finished with roasted mushrooms, herbs, and parmesan.',
    category: 'Mains',
    type: 'service',
    images: ['https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80'],
    stock: 999,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'd-1',
    sellerId: 'golden-spoon',
    name: 'Dark Chocolate Tart',
    price: 14,
    description: 'A rich cocoa tart with salted caramel and vanilla bean cream.',
    category: 'Desserts',
    type: 'service',
    images: ['https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80'],
    stock: 999,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dr-1',
    sellerId: 'golden-spoon',
    name: 'Citrus Thyme Spritz',
    price: 12,
    description: 'Sparkling citrus, thyme syrup, and a bright herbal finish.',
    category: 'Drinks',
    type: 'service',
    images: ['https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80'],
    stock: 999,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'app-2',
    sellerId: 'golden-spoon',
    name: 'Crispy Calamari',
    price: 17,
    description: 'Lightly fried and served with lemon aioli and pickled shallots.',
    category: 'Appetizers',
    type: 'service',
    images: ['https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80'],
    stock: 999,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const STORY_HIGHLIGHTS = [
  { label: 'Chef stories', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80' },
  { label: 'Wine pairings', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=400&q=80' },
  { label: 'Private dining', image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=400&q=80' },
  { label: 'Seasonal menu', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80' },
];

const FALLBACK_HERO_IMAGE = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80';

const foodKeywords = /(dish|food|salad|pasta|risotto|burger|steak|sushi|tart|toast|seafood|citrus|mushroom|ramen|pizza|taco|brunch|dessert|coffee|wine|cocktail|menu|appetizer|main|drinks)/i;

const normalizeRestaurantProducts = (inputProducts?: Product[]) => {
  const products = inputProducts && inputProducts.length > 0 ? inputProducts : DEFAULT_RESTAURANT_PRODUCTS;
  const hasFoodContent = products.some((product) => {
    const haystack = `${product.name || ''} ${product.category || ''} ${product.description || ''}`;
    return foodKeywords.test(haystack);
  });

  return hasFoodContent ? products : DEFAULT_RESTAURANT_PRODUCTS;
};

const safeRestaurantImage = (candidate?: string) => {
  if (typeof candidate !== 'string' || !candidate.trim()) {
    return FALLBACK_HERO_IMAGE;
  }
  if (candidate.includes('images.unsplash.com') || candidate.includes('images.pexels.com')) {
    return candidate;
  }
  return FALLBACK_HERO_IMAGE;
};

interface View {
  home: boolean;
  menu: boolean;
  item: boolean;
  reservation: boolean;
}

interface InstagramVipProps {
  seller?: Seller;
  products?: Product[];
  editMode?: boolean;
  sellerData?: Seller | null;
  onUpdateData?: (fieldPath: string, value: any) => void;
  onUpdateThemeCustomization?: (section: string, field: string, value: any) => void;
  onUpdateFeatureItem?: (index: number, field: 'title' | 'description', value: string) => void;
  onUpdateThemeColor?: (type: 'primary' | 'secondary', value: string) => void;
  onImageUpload?: (file: File, target: 'logo' | 'hero' | 'story') => void;
}

const InstagramVipRestaurant = ({
  seller: propSeller,
  products: propProducts,
  editMode = false,
  sellerData,
}: InstagramVipProps) => {
  const seller = editMode && sellerData ? sellerData : propSeller || INSTAGRAM_VIP_DEFAULT_SELLER;
  const products = normalizeRestaurantProducts(propProducts || []);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<keyof View>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [reservationConfirmed, setReservationConfirmed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const themePrimary = seller.theme?.primaryColor || '#833ae5';
  const customizations = seller.theme?.customizations || {};
  const themeStyle = { ['--ig-primary' as any]: themePrimary };
  const storeName = seller.storeName && !seller.storeName.toLowerCase().includes('demo') ? seller.storeName : 'Golden Spoon';
  const [heroImage, setHeroImage] = useState(() => safeRestaurantImage(customizations.heroImage));

  useEffect(() => {
    setHeroImage(safeRestaurantImage(customizations.heroImage));
  }, [customizations.heroImage]);

  const categories = ['All', 'Appetizers', 'Mains', 'Desserts', 'Drinks'];
  const [activeCategory, setActiveCategory] = useState('All');

  const getCategoryProducts = (cat: string) => {
    if (cat === 'All') return products;
    return products.filter((p) => (p.category || 'Mains') === cat);
  };

  const displayProducts = getCategoryProducts(activeCategory);

  const navItems = [
    { label: 'Home', action: () => setView('home') },
    { label: 'Menu', action: () => setView('menu') },
    { label: 'Reservations', action: () => setView('reservation') },
  ];

  const HeroSection = () => (
    <section className="ig-hero">
      <img
        src={heroImage}
        alt={storeName}
        className="ig-hero-image"
        onError={() => setHeroImage(FALLBACK_HERO_IMAGE)}
      />
      <div className="ig-hero-background" />
      <div className="ig-hero-content">
        <div className="ig-hero-kicker">{'? ' + (customizations.hero_badge || 'Michelin Recommended')}</div>
        <h1 className="ig-hero-title display">
          {customizations.hero_title_1 || 'Golden'} <span>{customizations.hero_title_2 || 'Spoon'}</span>
        </h1>
        <p className="ig-hero-subtitle">{customizations.hero_subtitle || seller.description}</p>
        <div className="ig-hero-actions">
          <button
            type="button"
            onClick={() => setView('reservation')}
            className="ig-btn ig-btn-primary"
            style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f2d982 100%)', color: '#1c1716' }}
          >
            Book a Table
          </button>
          <button
            type="button"
            onClick={() => setView('menu')}
            className="ig-btn ig-btn-outline-light"
            style={{ borderColor: 'rgba(255,255,255,0.5)', color: '#fff' }}
          >
            View Menu
          </button>
        </div>
        <div className="ig-hero-stats">
          <div className="ig-hero-stat">
            <span>?</span>
            {(seller as any).rating || '4.9'} rating
          </div>
          <div className="ig-hero-stat">
            <span>??</span>
            Open today 5pm - 11pm
          </div>
        </div>
        <div className="ig-hero-panel" style={{ borderColor: `${themePrimary}40` }}>
          <div className="ig-panel-metric">
            <span className="ig-panel-label">Tonight?s chef selection</span>
            <strong>Garden truffle risotto</strong>
          </div>
          <div className="ig-panel-meta">
            <span>Small plates</span>
            <span>Private dining</span>
          </div>
        </div>
      </div>
    </section>
  );

  const MenuSection = () => (
    <section className="ig-menu-section" id="menu-section">
      <div className="ig-section-header">
        <div className="ig-section-kicker">The menu</div>
        <h2 className="display">Curated dishes made for lingering evenings</h2>
        <p>Seasonal plates, warm hospitality, and a menu designed to feel as intimate as the room itself.</p>
      </div>

      <div className="ig-story-strip">
        {STORY_HIGHLIGHTS.map((story) => (
          <div key={story.label} className="ig-story-item">
            <div className="ig-story-ring">
              <img src={story.image} alt={story.label} className="ig-story-image" />
            </div>
            <span className="ig-story-label">{story.label}</span>
          </div>
        ))}
      </div>

      <div className="ig-menu-filters">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`ig-filter-btn ${activeCategory === cat ? 'active' : ''}`}
            style={activeCategory === cat ? { backgroundColor: themePrimary, color: '#fff' } : {}}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="ig-masonry-grid">
        {displayProducts.map((product) => (
          <InstagramPostCard
            key={product.id}
            product={product}
            onClick={() => {
              setSelectedProduct(product);
              setView('item');
            }}
          />
        ))}

        {displayProducts.length === 0 && (
          <div className="ig-empty-state" style={{ gridColumn: '1 / -1' }}>
            <p>No dishes available in this category.</p>
          </div>
        )}
      </div>
    </section>
  );

  const ReservationSection = () => (
    <section className="ig-reservation-section" id="reservation-section">
      <div
        className="ig-reservation-background"
        style={{
          backgroundImage: `url(${heroImage})`,
        }}
      />
      <div className="ig-reservation-shell">
        <div className="ig-reservation-container">
          <div className="ig-reservation-content">
            <div className="ig-hero-kicker">Reserve Your Table</div>
            <h2 className="display">
              Plan Your <span>Dining</span> Experience
            </h2>
            <p>{seller.description || 'We provide data-driven strategic consulting for enterprises looking to navigate the complex digital landscape and scale exponentially.'}</p>
            <div className="ig-reservation-details">
              <div className="ig-reservation-detail">
                <div className="ig-reservation-detail-icon">📍</div>
                <div>
                  <div className="ig-detail-title">Find Us</div>
                  <div className="ig-detail-value">{seller.contactInfo?.address || '123 Culinary Street, Food District, NY 10001'}</div>
                </div>
              </div>
              <div className="ig-reservation-detail">
                <div className="ig-reservation-detail-icon">🕐</div>
                <div>
                  <div className="ig-detail-title">Opening Hours</div>
                  <div className="ig-detail-value">Mon-Fri: 5pm - 11pm | Sat-Sun: 12pm - 11pm</div>
                </div>
              </div>
              <div className="ig-reservation-detail">
                <div className="ig-reservation-detail-icon">📞</div>
                <div>
                  <div className="ig-detail-title">Reservations</div>
                  <div className="ig-detail-value">{seller.contactInfo?.phone || '(555) 123-4567'}</div>
                </div>
              </div>
            </div>
          </div>

          {reservationConfirmed ? (
            <div className="ig-reservation-form" style={{ textAlign: 'center' }}>
              <div className="ig-confirm-emoji">✅</div>
              <h3 className="display">Reservation Confirmed!</h3>
              <p>Your table has been reserved. We&apos;ll send a confirmation to your email shortly.</p>
              <button
                type="button"
                onClick={() => setReservationConfirmed(false)}
                className="ig-btn ig-btn-primary"
                style={{ marginTop: '1.5rem', backgroundColor: themePrimary }}
              >
                Book Another Table
              </button>
            </div>
          ) : (
            <ReservationForm themePrimary={themePrimary} onSubmit={() => setReservationConfirmed(true)} />
          )}
        </div>
      </div>
    </section>
  );

  return (
    <div className="ig-vip" style={themeStyle}>
      <nav className="ig-navbar">
        <div className="ig-navbar-container">
          <div className="ig-navbar-group">
            <button
              type="button"
              onClick={() => setView('home')}
              className="ig-logo"
              style={{ border: 'none', cursor: 'pointer', padding: 0, background: 'none' }}
            >
              <span className="ig-logo-icon">🍽️</span>
              <span className="ig-logo-text">
                {storeName} <em style={{ color: themePrimary }}>{customizations.hero_title_2 || 'Spoon'}</em>
              </span>
            </button>
            <div className="ig-nav-links">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    item.action();
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
          <div className="ig-nav-cta">
            <a className="ig-social-link" href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">📷</a>
            <a className="ig-social-link" href="mailto:reservations@goldenspoon.com" aria-label="Email">✉️</a>
            <button
              type="button"
              onClick={() => navigate(user ? (user.role === 'customer' ? '/customer/dashboard' : '/seller/dashboard') : `/login?shop=${encodeURIComponent(seller.id)}&subdomain=${encodeURIComponent(seller.subdomain)}`)}
              className="ig-btn ig-btn-secondary"
              style={{ fontSize: '0.8125rem', padding: '0.5rem 1.25rem' }}
            >
              {user ? 'Dashboard' : 'Client Portal'}
            </button>
          </div>
          <button
            type="button"
            className="ig-mobile-nav-toggle"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            ☰
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="ig-mobile-menu" role="menu">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className="ig-mobile-menu-item"
                onClick={() => {
                  item.action();
                  setMobileMenuOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {view === 'home' && (
        <>
          <HeroSection />
          <MenuSection />
          <ReservationSection />
          <Footer seller={seller} />
        </>
      )}

      {view === 'menu' && <MenuSection />}
      {view === 'reservation' && <ReservationSection />}
      {view === 'item' && selectedProduct && (
        <ItemDetailPage
          product={selectedProduct}
          seller={seller}
          themePrimary={themePrimary}
          onBack={() => setView('menu')}
        />
      )}

      {editMode && (
        <div className="ig-edit-hint">
          <div className="ig-edit-icon">
            <span>🎨</span> Edit mode active
          </div>
        </div>
      )}
    </div>
  );
};

const InstagramPostCard = ({
  product,
  onClick,
}: {
  product: Product;
  onClick: () => void;
}) => {
  const price = typeof product.price === 'number' ? product.price : parseFloat(product.price as string) || 0;
  const image = safeRestaurantImage(product.images?.[0]);
  const isSpecial = Math.random() > 0.7;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className="ig-grid-item"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${product.name}`}
    >
      <img src={image} alt={product.name} className="ig-grid-image" />
      {isSpecial && <span className="ig-grid-badge special">★ Special</span>}
      <div className="ig-grid-overlay">
        <div className="ig-overlay-category">{product.category || 'Mains'}</div>
        <h3>{product.name}</h3>
        <div className="ig-overlay-price">${price.toFixed(2)}</div>
      </div>
      <div className="ig-card-meta">
        <span>{product.category || 'Mains'}</span>
        <strong>{product.name}</strong>
        <em>${price.toFixed(2)}</em>
      </div>
    </div>
  );
};

const ReservationForm = ({
  themePrimary,
  onSubmit,
}: {
  themePrimary: string;
  onSubmit: () => void;
}) => {
  const [partySize, setPartySize] = useState('2');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [requests, setRequests] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form className="ig-reservation-form" onSubmit={handleSubmit}>
      <h3 className="display">Reserve Your Table</h3>
      <div className="ig-form-grid">
        <div className="ig-form-field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="ig-form-field">
          <label>Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
        <div className="ig-form-field">
          <label>Party Size</label>
          <select value={partySize} onChange={(e) => setPartySize(e.target.value)}>
            <option value="1">1 Person</option>
            <option value="2">2 People</option>
            <option value="3">3 People</option>
            <option value="4">4 People</option>
            <option value="5">5+ People</option>
          </select>
        </div>
        <div className="ig-form-field">
          <label>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" required />
        </div>
      </div>
      <div className="ig-form-grid">
        <div className="ig-form-field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" required />
        </div>
        <div className="ig-form-field">
          <label>Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" required />
        </div>
      </div>
      <div className="ig-form-field">
        <label>Special Requests</label>
        <textarea
          value={requests}
          onChange={(e) => setRequests(e.target.value)}
          placeholder="Any dietary restrictions, special occasions, or seating preferences..."
          rows={4}
        />
      </div>
      <div className="ig-price-summary">
        <div className="ig-price-summary-row">
          <span>Party Size</span>
          <span>{partySize}</span>
        </div>
        <div className="ig-price-summary-row">
          <span>Service Fee</span>
          <span>$0</span>
        </div>
        <div className="ig-price-summary-row">
          <span>Deposit</span>
          <span>$5</span>
        </div>
        <div className="ig-price-summary-row">
          <span>Total</span>
          <span style={{ color: themePrimary, fontWeight: 700 }}>$5</span>
        </div>
      </div>
      <div className="ig-form-actions">
        <button type="submit" className="ig-btn ig-btn-primary" style={{ backgroundColor: themePrimary, flex: 1 }}>
          Confirm Reservation
        </button>
        <button type="button" className="ig-btn ig-btn-secondary" onClick={() => window.history.back()} style={{ flex: 1 }}>
          Cancel
        </button>
      </div>
    </form>
  );
};

const ItemDetailPage = ({
  product,
  seller,
  themePrimary,
  onBack,
}: {
  product: Product;
  seller: Seller;
  themePrimary: string;
  onBack: () => void;
}) => {
  const price = typeof product.price === 'number' ? product.price : parseFloat(product.price as string) || 0;
  const image = safeRestaurantImage(product.images?.[0]);

  return (
    <div className="ig-item-page">
      <button type="button" onClick={onBack} className="ig-btn ig-btn-ghost" style={{ marginBottom: '2rem' }}>
        ← Back to Menu
      </button>
      <div className="ig-item-page-grid">
        <img src={image} alt={product.name} className="ig-item-image" />
        <div className="ig-item-copy">
          <div className="ig-hero-kicker">{product.category || 'Mains'}</div>
          <h1 className="display">{product.name}</h1>
          <p className="ig-item-price" style={{ color: themePrimary }}>${price.toFixed(2)}</p>
          <p className="ig-item-description">
            {product.description || 'Our signature dish, crafted with the finest seasonal ingredients and our chef\'s special touch.'}
          </p>
          <button
            type="button"
            className="ig-btn ig-btn-primary"
            style={{ backgroundColor: themePrimary, width: '100%', padding: '0.875rem' }}
            onClick={() => window.location.hash = 'reservation-section'}
          >
            Add to Order
          </button>
          <div className="ig-item-meta">
            <span>{seller.storeName}</span>
            <span>Chef&apos;s favorite</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Footer = ({ seller }: { seller: Seller }) => {
  const footerLinks = {
    About: ['Our Story', 'Careers', 'Press', 'Blog'],
    Contact: ['Reservations', 'Location', 'Phone', 'Email'],
    Menu: ['Appetizers', 'Mains', 'Desserts', 'Drinks'],
  };

  return (
    <footer className="ig-footer">
      <div className="ig-footer-inner">
        <div>
          <div className="ig-footer-brand">
            <span className="ig-logo-icon">🍽️</span>
            <span className="ig-logo-text">
              {seller.storeName || 'Golden'} <em style={{ color: '#d4af37' }}>{seller.theme?.customizations?.hero_title_2 || 'Spoon'}</em>
            </span>
          </div>
          <p>{seller.description || 'Where every dish tells a story.'}</p>
        </div>
        {Object.entries(footerLinks).map(([category, links]) => (
          <div key={category}>
            <h4>{category}</h4>
            <ul>
              {links.map((link) => (
                <li key={link}>
                  <a href={link === 'Reservations' ? '#reservation-section' : '#menu-section'}>{link}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="ig-footer-bottom">
        <div>© {new Date().getFullYear()} {seller.storeName || 'Golden Spoon'}. All rights reserved.</div>
      </div>
    </footer>
  );
};

export default InstagramVipRestaurant;
