import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Check, Clock, MapPin, Menu, Phone,
  Star, X, Send, Instagram, Facebook, Twitter
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller, uploadAPI } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import {
  createDemoRestaurantMenu,
  createDemoRestaurantSeller,
  getRestaurantSettings,
  readRestaurantOrder,
  RestaurantOrderData,
  MenuItemCategory,
  getCategoryLabel,
  getCategoryIcon,
  DAY_NAMES,
  formatDate,
  formatTime,
} from './restaurantTypes';
import './restaurant.css';

interface Props {
  seller: Seller;
  products: Product[];
  demoMode?: boolean;
}

const RestorantSite: React.FC<Props> = ({ seller, products, demoMode = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const settings = getRestaurantSettings(seller);
  const liveMenu = products.filter((product) => product.status === 'active' && product.type === 'service');
  const menuItems = demoMode && liveMenu.length === 0
    ? createDemoRestaurantMenu(seller.id)
    : liveMenu;
  const restaurantName = seller.storeName || 'Le Jardin';
  const currency = seller.currency || settings.currency || 'USD';
  const isDemo = demoMode;

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [guestName, setGuestName] = useState(user?.name || '');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestPhone, setGuestPhone] = useState(user?.phoneNumber || '');
  const [specialRequest, setSpecialRequest] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingConfirmation, setBookingConfirmation] = useState<Order | 'demo' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  const maxDateString = maxDate.toISOString().split('T')[0];

  const categories: { id: string; name: string; icon: string }[] = [
    { id: 'all', name: 'Full Menu', icon: '🍽️' },
    { id: 'appetizer', name: getCategoryLabel('appetizer'), icon: getCategoryIcon('appetizer') },
    { id: 'main', name: getCategoryLabel('main'), icon: getCategoryIcon('main') },
    { id: 'dessert', name: getCategoryLabel('dessert'), icon: getCategoryIcon('dessert') },
    { id: 'drink', name: getCategoryLabel('drink'), icon: getCategoryIcon('drink') },
    { id: 'special', name: getCategoryLabel('special'), icon: getCategoryIcon('special') },
  ];

  const categoryMap: Record<string, MenuItemCategory> = {
    appetizer: 'appetizer',
    main: 'main',
    dessert: 'dessert',
    drink: 'drink',
    special: 'special',
  };

  const filteredMenu = useMemo(() => {
    if (activeCategory === 'all') return menuItems;
    const cat = categoryMap[activeCategory];
    return menuItems.filter((item) => (cat ? item.category === cat : item.category === activeCategory));
  }, [activeCategory, menuItems]);

  const availableTimes = useMemo(() => {
    if (!reservationDate) return [];
    const [startHour, startMin] = settings.openingHours[reservationDate.split('-')[1] ? 0 : 0]?.open?.split(':').map(Number) || [11, 0];
    const [endHour, endMin] = settings.openingHours[0]?.close?.split(':').map(Number) || [23, 0];
    const earliest = Date.now() + settings.leadTimeMinutes * 60 * 1000;
    const slots: string[] = [];
    for (let h = startHour; h < endHour + 1; h++) {
      const mins = h === startHour ? startMin : 0;
      for (let m = mins; m < 60; m += 30) {
        if (h === endHour && m > endMin) break;
        const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotDate = new Date(`${reservationDate}T${value}:00`);
        if (slotDate.getTime() >= earliest) {
          slots.push(value);
        }
      }
    }
    return slots;
  }, [reservationDate, settings.leadTimeMinutes, settings.openingHours]);

  useEffect(() => {
    const onScroll = () => setHeaderScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const submitReservation = async (event: React.FormEvent) => {
    event.preventDefault();
    setBookingError('');
    if (!reservationDate || !reservationTime || !guestName.trim() || !/^\S+@\S+\.\S+$/.test(guestEmail) || !guestPhone.trim()) {
      setBookingError('Choose a date and time, then add your name, a valid email, and phone number.');
      return;
    }
    const party = parseInt(partySize);
    if (party > settings.maxPartySize) {
      setBookingError(`The maximum party size is ${settings.maxPartySize}.`);
      return;
    }

    if (isDemo) {
      setBookingConfirmation('demo');
      return;
    }

    setBookingBusy(true);
    try {
      const orderData: RestaurantOrderData = {
        platform: 'restaurant',
        orderType: 'table-service',
        tableNumber: `T-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
        items: [],
        specialInstructions: specialRequest.trim() || undefined,
      };
      const order = await ordersAPI.create({
        sellerId: seller.id,
        customerId: user?.id || '',
        customerName: guestName.trim(),
        customerEmail: guestEmail.trim(),
        customerPhone: guestPhone.trim(),
        items: [],
        total: 0,
        subtotal: 0,
        currency,
        status: 'pending',
        shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' },
        deliveryLocation: JSON.stringify(orderData),
        paymentType: 'site',
      });
      setBookingConfirmation(order);
    } catch {
      setBookingError('We could not send your reservation. Please try again or call the restaurant.');
    } finally {
      setBookingBusy(false);
    }
  };

  const openBookedItem = (item: Product) => {
    const from = window.location.pathname;
    navigate(`/restaurant/item/${item.id}`, { state: { item, seller, from, demoMode } });
  };

  const openClientPortal = () => {
    const portalPath = '/restaurant/client';
    navigate(user ? portalPath : `/login?shop=${encodeURIComponent(seller.id)}&subdomain=${encodeURIComponent(seller.subdomain)}&redirect=${encodeURIComponent(portalPath)}`);
  };

  if (bookingConfirmation) {
    return (
      <div className="restaurant-site">
        <header className={`resto-header ${headerScrolled ? 'scrolled' : ''}`}>
          <div className="resto-header-inner">
            <a href="#resto-home" className="resto-logo" aria-label={restaurantName}>
              <span className="resto-logo-icon">🍽️</span>
              <strong>{restaurantName}<em>RESTAURANT</em></strong>
            </a>
          </div>
        </header>
        <main className="resto-booking-success">
          <div className="resto-confirm-card">
            <span className="resto-success-check"><Check size={32} /></span>
            <h2>Table Reserved.<em>See you soon.</em></h2>
            <p>
              {bookingConfirmation === 'demo'
                ? 'This was a preview reservation. On a live storefront, this creates a table reservation for your party.'
                : `Your table for ${partySize} on ${formatDate(reservationDate)} at ${formatTime(reservationTime)} is confirmed. The restaurant will be in touch to finalize details.`}
            </p>
            {isDemo ? (
              <button className="resto-btn resto-btn-primary" onClick={() => setBookingConfirmation(null)}>
                Back to preview <ArrowRight size={15} />
              </button>
            ) : (
              <button className="resto-btn resto-btn-primary" onClick={openClientPortal}>
                View your reservations <ArrowRight size={15} />
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="restaurant-site">
      <header className={`resto-header ${headerScrolled ? 'scrolled' : ''}`}>
        <div className="resto-header-inner">
          <a href="#resto-home" className="resto-logo" aria-label={`${restaurantName} home`}>
            <span className="resto-logo-icon">🍽️</span>
            <strong>{restaurantName}<em>{settings.cuisineType || 'CAFE'}</em></strong>
          </a>
          <button
            className="resto-menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
          <nav className={`resto-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
            <a href="#menu" onClick={() => setMenuOpen(false)}>Menu</a>
            <a href="#reservation" onClick={() => setMenuOpen(false)}>Reservations</a>
            <a href="#story" onClick={() => setMenuOpen(false)}>Our story</a>
            <a href="#visit" onClick={() => setMenuOpen(false)}>Visit</a>
            <button className="resto-btn resto-btn-ghost nav-cta" onClick={openClientPortal}>
              Your reservations <ArrowRight size={15} />
            </button>
          </nav>
        </div>
      </header>

      <main id="resto-home">
        <section className="resto-hero">
          <div>
            <p className="resto-hero-kicker"><span /> {settings.cuisineType || 'Fine dining'} / {settings.serviceStyle || 'casual'}</p>
            <h1 className="resto-display">Seasonal ingredients.<br /><i>Thoughtful cooking.</i></h1>
            <p className="resto-hero-intro">
              {seller.description ||
                'A neighborhood restaurant built around the seasons, honest ingredients, and the quiet joy of sharing a good meal.'}
            </p>
            <div className="resto-hero-actions">
              <a className="resto-btn resto-btn-primary" href="#reservation">Book a table <ArrowRight size={17} /></a>
              <a className="resto-btn resto-btn-outline" href="#menu">View the menu <ArrowRight size={17} /></a>
            </div>
            <div className="resto-hero-trust">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} fill="currentColor" color="#d4a85e" />
              ))}
              <span>4.8 · {menuItems.length} dishes on the menu</span>
            </div>
          </div>
          <div className="resto-hero-img-col">
            <img
              src={menuItems[0]?.images?.[0] || 'https://images.unsplash.com/photo-1514933651103-0009771dfbcf?auto=format&fit=crop&q=80&w=800'}
              alt={restaurantName}
              className="resto-hero-image"
            />
            <span className="resto-hero-stamp">OPEN DAILY {formatTime(settings.openingHours[0]?.open || '11:00')} — {formatTime(settings.openingHours[0]?.close || '23:00')}</span>
          </div>
        </section>

        <section className="resto-trust-strip">
          <div className="resto-trust-item">
            <div className="resto-trust-value">{settings.tableCount}</div>
            <div className="resto-trust-label">Tables for reservations</div>
          </div>
          <div className="resto-trust-item">
            <div className="resto-trust-value">30%</div>
            <div className="resto-trust-label">Standard deposit to confirm</div>
          </div>
          <div className="resto-trust-item">
            <div className="resto-trust-value">{menuItems.length}</div>
            <div className="resto-trust-label">Carefully crafted dishes</div>
          </div>
          <div className="resto-trust-item">
            <div className="resto-trust-value">4.8★</div>
            <div className="resto-trust-label">From our guests</div>
          </div>
        </section>

        <section className="resto-menu-section" id="menu">
          <div className="resto-section-heading">
            <div>
              <p className="resto-kicker">THE MENU</p>
              <h2>Our <i>current</i> offerings.</h2>
              <p>
                {settings.cuisineType} dishes, refreshed with the season.
              </p>
            </div>
            <a href="#reservation" className="resto-btn resto-btn-outline resto-btn-sm">
              Reserve now <ArrowRight size={15} />
            </a>
          </div>

          <div className="resto-menu-categories">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`resto-menu-category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <span>{cat.icon}</span> {cat.name}
              </button>
            ))}
          </div>

          {filteredMenu.length === 0 ? (
            <div className="resto-empty-menu">
              <h3>The menu is being refreshed.</h3>
              <p>Check back soon or reach out to reserve a table.</p>
              <a className="resto-btn resto-btn-primary" href="#reservation">
                Reserve a table <ArrowRight size={15} />
              </a>
            </div>
          ) : (
            <div className="resto-menu-list">
              {filteredMenu.map((item) => (
                  <article
                    key={item.id}
                    className="resto-menu-item"
                    onClick={() => openBookedItem(item)}
                  >
                    {item.images?.[0] && (
                      <div className="resto-menu-item-image-wrap">
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="resto-menu-item-image"
                        />
                      </div>
                    )}
                  <div className="resto-menu-item-body">
                    <div className="resto-menu-item-header">
                      <h3 className="resto-menu-item-title">{item.name}</h3>
                      <span className="resto-menu-item-price">{formatPrice(item.price, currency)}</span>
                    </div>
                    <span className="resto-menu-item-category">{getCategoryLabel((item.category || 'main') as MenuItemCategory)}</span>
                    <p className="resto-menu-item-description">{item.description}</p>
                    <div className="resto-menu-item-footer">
                      <span className="resto-menu-item-rating">
                        <Star size={14} fill="currentColor" color="#d4a85e" /> 4.8
                      </span>
                      <span className="resto-btn resto-btn-ghost resto-btn-sm">
                        Details <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="resto-story" id="story">
          <img
            src="https://images.unsplash.com/photo-1517248328731-4e4c69a9d46a?auto=format&fit=crop&q=80&w=800"
            alt="Restaurant interior"
            className="resto-story-image"
          />
          <div className="resto-story-content">
            <h2>Crafted with <i>care.</i></h2>
            <p className="resto-story-text">
              We work with local farms and artisans to bring the freshest seasonal ingredients to your table.
              Every dish is rooted in tradition but never afraid of a little curiosity.
            </p>
            <p className="resto-story-text">
              Whether it's an intimate dinner or a celebration with friends, we're here to make it memorable.
            </p>
            <div className="resto-story-signature"> — The {restaurantName} Team</div>
          </div>
        </section>

        <section className="resto-reservation" id="reservation">
          <div className="resto-section-heading">
            <div>
              <p className="resto-kicker">RESERVE A TABLE</p>
              <h2>Your next<br /><i>good meal.</i></h2>
              <p className="resto-subtitle">
                Book a table and we'll confirm your spot. A 30% deposit secures your reservation.
              </p>
            </div>
          </div>
          <div className="resto-reservation-form">
            <form onSubmit={submitReservation}>
              <div className="resto-reservation-grid">
                <div className="resto-reservation-field">
                  <label>Date</label>
                  <input
                    type="date"
                    min={today}
                    max={maxDateString}
                    value={reservationDate}
                    onChange={(e) => { setReservationDate(e.target.value); setReservationTime(''); }}
                    required
                  />
                </div>
                <div className="resto-reservation-field">
                  <label>Time</label>
                  <select
                    value={reservationTime}
                    onChange={(e) => setReservationTime(e.target.value)}
                    disabled={!reservationDate || availableTimes.length === 0}
                    required
                  >
                    <option value="">{!reservationDate ? 'Choose date first' : availableTimes.length ? 'Select time' : 'No times available'}</option>
                    {availableTimes.map((slot) => (
                      <option key={slot} value={slot}>{formatTime(slot)}</option>
                    ))}
                  </select>
                </div>
                <div className="resto-reservation-field">
                  <label>Party size</label>
                  <select
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                    required
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n.toString()}>
                        {n} {n === 1 ? 'person' : 'people'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="resto-reservation-field">
                  <label>Name</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="resto-reservation-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="resto-reservation-field">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>
              <div className="resto-reservation-field">
                <label>Special request (optional)</label>
                <textarea
                  value={specialRequest}
                  onChange={(e) => setSpecialRequest(e.target.value)}
                  placeholder="Allergies, seating preferences, celebration details..."
                />
              </div>
              {bookingError && <div className="resto-form-error" role="alert">{bookingError}</div>}
              <button className="resto-btn resto-btn-primary resto-btn-lg" type="submit" disabled={bookingBusy}>
                {bookingBusy ? 'Confirming…' : 'Confirm your table'} {bookingBusy ? <span className="button-spinner" /> : <ArrowRight size={16} />}
              </button>
              {isDemo && (
                <p className="resto-fineprint">
                  Preview mode — no reservation or payment is created.
                </p>
              )}
            </form>
          </div>
        </section>

        <section className="resto-visit" id="visit">
          <div className="resto-section-heading">
            <div>
              <p className="resto-kicker">FIND US</p>
              <h2>See you <i>soon.</i></h2>
            </div>
          </div>
          <div className="resto-contact-grid">
            <div className="resto-contact-item">
              <div className="resto-contact-item-icon"><MapPin size={20} /></div>
              <div className="resto-contact-item-info">
                <h4>Address</h4>
                <p>{seller.contactInfo?.address || '123 Main Street, Downtown'}</p>
              </div>
            </div>
            <div className="resto-contact-item">
              <div className="resto-contact-item-icon"><Phone size={20} /></div>
              <div className="resto-contact-item-info">
                <h4>Phone</h4>
                <p>{seller.contactInfo?.phone || '+1 (555) 123-4567'}</p>
              </div>
            </div>
            <div className="resto-contact-item">
              <div className="resto-contact-item-icon"><Send size={20} /></div>
              <div className="resto-contact-item-info">
                <h4>Email</h4>
                <a href={`mailto:${seller.contactInfo?.email || ''}`}>{seller.contactInfo?.email || 'info@restaurant.com'}</a>
              </div>
            </div>
            <div className="resto-contact-item">
              <div className="resto-contact-item-icon"><Clock size={20} /></div>
              <div className="resto-contact-item-info">
                <h4>Hours</h4>
                <p>
                  {DAY_NAMES[settings.openingHours[0]?.day || 1]}, {formatTime(settings.openingHours[0]?.open || '11:00')} — {formatTime(settings.openingHours[0]?.close || '23:00')}
                </p>
              </div>
            </div>
          </div>
          <div className="resto-social-links">
            {seller.socialLinks?.instagram && (
              <a href={seller.socialLinks.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="resto-social-link">
                <Instagram size={20} />
              </a>
            )}
            {seller.socialLinks?.facebook && (
              <a href={seller.socialLinks.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="resto-social-link">
                <Facebook size={20} />
              </a>
            )}
            {seller.socialLinks?.twitter && (
              <a href={seller.socialLinks.twitter} target="_blank" rel="noreferrer" aria-label="Twitter" className="resto-social-link">
                <Twitter size={20} />
              </a>
            )}
          </div>
        </section>
      </main>

      <footer className="resto-footer">
        <div className="resto-footer-inner">
          <div>
            <div className="resto-footer-brand">
              <span className="resto-logo-icon">🍽️</span>
              <strong>{restaurantName}</strong>
              <small>{settings.cuisineType || 'RESTAURANT'}</small>
            </div>
            <small className="resto-footer-bottom">
              © {new Date().getFullYear()} {restaurantName}. All rights reserved.
            </small>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><a href="#story">Our story</a></li>
              <li><a href="#menu">Menu</a></li>
              <li><a href="#reservation">Reservations</a></li>
            </ul>
          </div>
          <div>
            <h4>Visit</h4>
            <ul>
              <li><a href="#visit">Find us</a></li>
              <li><a href="#reservation">Book a table</a></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Privacy policy</a></li>
              <li><a href="#">Terms of service</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RestorantSite;

const landingSeller = createDemoRestaurantSeller();
const landingMenu = createDemoRestaurantMenu(landingSeller.id);

export const RestorantLandingPage: React.FC = () => (
  <RestorantSite seller={landingSeller} products={landingMenu} demoMode />
);
