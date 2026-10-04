import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Calendar, Check, Clock, MapPin, Minus, Plus, Send, Star
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller, productsAPI, sellersAPI } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import {
  createDemoRestaurantMenu,
  createDemoRestaurantSeller,
  getRestaurantSettings,
  readRestaurantOrder,
  RestaurantOrderData,
  MenuItemCategory,
  getCategoryLabel,
  formatDate,
  formatTime,
} from './restaurantTypes';
import './restaurant.css';

interface LocationState {
  item?: Product;
  seller?: Seller;
  from?: string;
  demoMode?: boolean;
}

const RestorantServicePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { itemId } = useParams<{ itemId?: string }>();
  const state = (location.state as LocationState) || {};
  const demoMode = state.demoMode === true || searchParams.get('demo') === 'true';
  const sellerId = searchParams.get('seller') || state?.seller?.id || (demoMode ? 'demo-seller' : undefined);
  const from = searchParams.get('from') || state.from;

  const [item, setItem] = useState<Product | null>(state?.item || null);
  const [seller, setSeller] = useState<Seller | null>(state?.seller || null);
  const [loading, setLoading] = useState(!item || !seller);
  const [error, setError] = useState('');

  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [guestName, setGuestName] = useState(user?.name || '');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestPhone, setGuestPhone] = useState(user?.phoneNumber || '');
  const [specialRequest, setSpecialRequest] = useState('');
  const [busy, setBusy] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [confirmation, setConfirmation] = useState<Order | 'demo' | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    let active = true;
    if (item && seller) {
      setLoading(false);
      return;
    }
    if (demoMode && sellerId === 'demo-seller') {
      const demoItem = createDemoRestaurantMenu(sellerId).find((menuItem) => menuItem.id === itemId) || null;
      setSeller(createDemoRestaurantSeller());
      setItem(demoItem);
      if (!demoItem) setError('This menu item could not be found.');
      setLoading(false);
      return;
    }
    if (!itemId || !sellerId) {
      navigate('/', { replace: true });
      return;
    }
    setLoading(true);
    Promise.all([
      seller ? Promise.resolve(seller) : sellersAPI.getPublicById(sellerId),
      item ? Promise.resolve(item) : productsAPI.getBySellerId(sellerId),
    ]).then(([resolvedSeller, products]) => {
      if (!active) return;
      setSeller(resolvedSeller);
      if (!item) {
        const found = (products as Product[]).find((p) => p.id === itemId && p.type === 'service');
        setItem(found || null);
        if (!found) setError('This menu item could not be found.');
      }
      setLoading(false);
    }).catch(() => {
      if (active) {
        setError('This menu item could not be found.');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [demoMode, itemId, sellerId, item, seller, navigate]);

  const settings = seller ? getRestaurantSettings(seller) : getRestaurantSettings(null);
  const currency = seller?.currency || settings.currency || 'USD';

  const availableTimes = useMemo(() => {
    if (!reservationDate || !seller) return [];
    const dayOfWeek = new Date(`${reservationDate}T12:00:00`).getDay();
    const dayHours = settings.openingHours.find((h) => h.day === dayOfWeek);
    if (!dayHours || dayHours.closed) return [];
    const [startHour, startMin] = dayHours.open.split(':').map(Number);
    const [endHour, endMin] = dayHours.close.split(':').map(Number);
    const earliest = Date.now() + settings.leadTimeMinutes * 60 * 1000;
    const slots: string[] = [];
    for (let h = startHour; h <= endHour; h++) {
      const startM = h === startHour ? startMin : 0;
      const endM = h === endHour ? endMin : 59;
      for (let m = startM; m <= endM; m += 30) {
        if (h > endHour || (h === endHour && m > endMin)) continue;
        const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotDate = new Date(`${reservationDate}T${value}:00`);
        if (slotDate.getTime() >= earliest) {
          slots.push(value);
        }
      }
    }
    return slots;
  }, [reservationDate, settings, seller]);

  const handleBack = () => {
    if (from && from.startsWith('/')) {
      navigate(from, { replace: true });
    } else {
      window.location.href = `/shop/${seller?.subdomain || ''}`;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setOrderError('');
    if (!item || !seller || !reservationDate || !reservationTime) {
      setOrderError('Choose an item, date, and time.');
      return;
    }
    if (!guestName.trim() || !/^\S+@\S+\.\S+$/.test(guestEmail) || !guestPhone.trim()) {
      setOrderError('Please fill in your name, a valid email, and phone number.');
      return;
    }

    const party = parseInt(partySize);
    if (party > settings.maxPartySize) {
      setOrderError(`The maximum party size is ${settings.maxPartySize}.`);
      return;
    }

    if (demoMode) {
      setConfirmation('demo');
      return;
    }

    setBusy(true);
    try {
      const orderData: RestaurantOrderData = {
        platform: 'restaurant',
        orderType: 'table-service',
        tableNumber: `T-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
        items: [{
          productId: item.id,
          productName: item.name,
          quantity: party,
          price: item.price,
          notes: specialRequest.trim() || undefined,
        }],
        specialInstructions: specialRequest.trim() || undefined,
      };
      const order = await ordersAPI.create({
        sellerId: seller.id,
        customerId: user?.id || '',
        customerName: guestName.trim(),
        customerEmail: guestEmail.trim(),
        customerPhone: guestPhone.trim(),
        items: [{ productId: item.id, productName: item.name, quantity: party, price: item.price }],
        total: item.price * party,
        subtotal: item.price * party,
        currency,
        status: 'pending',
        shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' },
        deliveryLocation: JSON.stringify(orderData),
        paymentType: 'site',
      });
      setConfirmation(order);
    } catch {
      setOrderError('We could not process your request. Please try again or call the restaurant.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="restaurant-site">
        <div className="resto-service-page-loading">
          <div className="loading-spinner" />
          <p>Finding your dish…</p>
        </div>
      </div>
    );
  }

  if (!item || !seller) {
    return (
      <div className="restaurant-site">
        <div className="resto-service-page-loading" role="alert">
          {error || 'This menu item could not be found.'}
        </div>
      </div>
    );
  }

  if (confirmation) {
    return (
      <div className="restaurant-site">
        <header className="resto-header">
          <div className="resto-header-inner">
            <button className="resto-logo" onClick={handleBack} aria-label="Back to menu">
              <span className="resto-logo-icon">🍽️</span>
              <strong>{seller.storeName}<em>{getCategoryLabel((item.category || 'main') as MenuItemCategory)}</em></strong>
            </button>
          </div>
        </header>
      <main className="resto-booking-success">
        <div className="resto-confirm-card">
          <span className="resto-success-check"><Check size={32} /></span>
          <h2>Reserved.<em>We'll see you soon.</em></h2>
          <p>
            {confirmation === 'demo'
              ? 'This was a preview. No reservation was created.'
              : `Your request for ${item.name} is confirmed. A table for ${partySize} on ${formatDate(reservationDate)} at ${formatTime(reservationTime)} is being processed.`}
          </p>
          {demoMode ? (
            <button className="resto-btn resto-btn-primary" onClick={() => setConfirmation(null)}>
              Back to preview <ArrowRight size={15} />
            </button>
          ) : (
            <button className="resto-btn resto-btn-primary" onClick={handleBack}>
              Back to menu <ArrowRight size={15} />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

  const restaurantName = seller.storeName || 'Restaurant';

  return (
    <div className="restaurant-site resto-font-sans">
      <header className="resto-header">
        <div className="resto-header-inner">
          <button className="resto-logo" onClick={handleBack} aria-label="Back to menu">
            <span className="resto-logo-icon">🍽️</span>
            <strong>{restaurantName}<em>{getCategoryLabel((item.category || 'main') as MenuItemCategory)}</em></strong>
          </button>
          <button className="resto-btn-ghost resto-btn-sm" onClick={handleBack}>
            <ArrowLeft size={16} /> Back to menu
          </button>
        </div>
      </header>

      <main className="resto-service-page">
        <div className="resto-service-layout">
          <div className="resto-service-media">
            {item.images?.[0] ? (
              <img src={item.images[0]} alt={item.name} className="resto-service-image" />
            ) : (
              <div className="resto-service-placeholder" role="img" aria-label={`Image for ${item.name}`}>
                <span>{getCategoryLabel((item.category || 'main') as MenuItemCategory)}</span>
              </div>
            )}
          </div>

          <div className="resto-service-content">
            <p className="resto-kicker">{getCategoryLabel((item.category || 'main') as MenuItemCategory)}</p>
            <h1 className="resto-display resto-service-title">{item.name}</h1>
            <p className="resto-service-description">{item.description || 'A carefully crafted dish, made with seasonal ingredients.'}</p>
            <p className="resto-service-price">
              {formatPrice(item.price, currency)}
            </p>

            <div className="resto-service-specs">
              <div className="resto-spec-item">
                <span className="resto-spec-label">Category</span>
                <span className="resto-spec-value">{getCategoryLabel((item.category || 'main') as MenuItemCategory)}</span>
              </div>
              <div className="resto-spec-item">
                <span className="resto-spec-label">Cuisine</span>
                <span className="resto-spec-value">{settings.cuisineType || 'International'}</span>
              </div>
              <div className="resto-spec-item">
                <span className="resto-spec-label">Availability</span>
                <span className="resto-spec-value">{formatTime(settings.openingHours[0]?.open || '11:00')} — {formatTime(settings.openingHours[0]?.close || '23:00')}</span>
              </div>
            </div>

            {orderError && <div className="resto-form-error" role="alert">{orderError}</div>}

            <form className="resto-booking-form" onSubmit={handleSubmit}>
              <div className="resto-form-row">
                <div className="resto-form-field">
                  <label className="resto-form-label">Date</label>
                  <input
                    type="date"
                    className="resto-input"
                    min={today}
                    value={reservationDate}
                    onChange={(e) => { setReservationDate(e.target.value); setReservationTime(''); }}
                    required
                  />
                </div>
                <div className="resto-form-field">
                  <label className="resto-form-label">Time</label>
                  <select
                    className="resto-select"
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
              </div>

              <div className="resto-form-row">
                <div className="resto-form-field">
                  <label className="resto-form-label">Party size</label>
                  <select className="resto-select" value={partySize} onChange={(e) => setPartySize(e.target.value)} required>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n.toString()}>
                        {n} {n === 1 ? 'person' : 'people'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="resto-form-field">
                  <label className="resto-form-label">Your name</label>
                  <input
                    type="text"
                    className="resto-input"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

              <div className="resto-form-row">
                <div className="resto-form-field">
                  <label className="resto-form-label">Email address</label>
                  <input
                    type="email"
                    className="resto-input"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="resto-form-field">
                  <label className="resto-form-label">Phone number</label>
                  <input
                    type="tel"
                    className="resto-input"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>

              <div className="resto-form-field">
                <label className="resto-form-label">Special request (optional)</label>
                <textarea
                  className="resto-input"
                  value={specialRequest}
                  onChange={(e) => setSpecialRequest(e.target.value)}
                  rows={3}
                  placeholder="Allergies, dietary restrictions, celebrations..."
                />
              </div>

              <div className="resto-price-summary">
                <div><span>Party size</span><strong>{partySize} {parseInt(partySize) === 1 ? 'person' : 'people'}</strong></div>
                <div><span>Item price</span><strong>{formatPrice(item.price, currency)}</strong></div>
              </div>

              <button className="resto-btn resto-btn-primary" type="submit" disabled={busy}>
                {busy ? 'Processing…' : 'Request reservation'} {busy ? <span className="button-spinner" /> : <ArrowRight size={15} />}
              </button>
              {demoMode && (
                <p className="resto-fineprint">Preview mode — no reservation is created.</p>
              )}
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RestorantServicePage;
