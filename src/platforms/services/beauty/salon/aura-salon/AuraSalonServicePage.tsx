import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import { ArrowRight, Bookmark, Check, Clock3, MapPin, Scissors } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller, sellersAPI, productsAPI } from '../../../../../services/api';
import { formatPrice } from '../../../../../utils/currency';
import { defaultSalonSettings, getFavoriteServiceIds, getLocalDateString, getRequestTimes, getSalonSettings, hasConfiguredSalonHours, isAuraSalon, saveFavoriteServiceIds } from './salonTypes';
import './aura-salon.css';

interface LocationState { service?: Product; seller?: Seller; from?: string }

const AuraSalonServicePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { serviceId } = useParams<{ serviceId?: string }>();
  const state = (location.state as LocationState) || {};
  const sellerId = searchParams.get('seller') || state?.seller?.id;

  const [service, setService] = useState<Product | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [preferredStylist, setPreferredStylist] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Order | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => getFavoriteServiceIds(sellerId || ''));

  useEffect(() => {
    let active = true;
    if (!serviceId || !sellerId) {
      setError('This service link is incomplete.');
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      sellersAPI.getPublicById(sellerId),
      productsAPI.getBySellerId(sellerId),
    ]).then(([resolvedSeller, products]) => {
      if (!active) return;
      if (!isAuraSalon(resolvedSeller)) {
        setError('This is not an Aura Salon service.');
        setLoading(false);
        return;
      }
      const found = (products as Product[]).find((product) =>
        product.id === serviceId &&
        product.type === 'service' &&
        product.status === 'active' &&
        product.sellerId === sellerId,
      );
      if (!found) {
        setError('This service is unavailable or no longer published.');
        setLoading(false);
        return;
      }
      setSeller(resolvedSeller);
      setService(found);
      setError('');
      setLoading(false);
    }).catch(() => { if (active) { setError('This service could not be found.'); setLoading(false); } });
    return () => { active = false; };
  }, [serviceId, sellerId]);

  const fit = seller ? getSalonSettings(seller) : defaultSalonSettings;
  const hasPublishedHours = hasConfiguredSalonHours(seller);
  const today = getLocalDateString();
  const duration = Number(service?.description.match(/Duration:\s*(\d+)/i)?.[1] || 0);

  const availableTimes = useMemo(() => {
    return hasPublishedHours ? getRequestTimes(date, fit, duration) : [];
  }, [date, fit, duration, hasPublishedHours]);

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!service || service.status !== 'active' || !seller || !date || !hasPublishedHours || !getRequestTimes(date, fit, duration).includes(time) || !name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim()) {
      setError('Choose an offered request time, then add your name, a valid email, and phone number.');
      return;
    }
    setBusy(true);
    try {
      const booking = { platform: 'aura-salon', appointmentDate: date, appointmentTime: time, staffName: preferredStylist, notes: notes.trim() };
      const order = await ordersAPI.create({
        sellerId: seller.id,
        customerId: user?.id || '',
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        items: [{ productId: service.id, productName: service.name, quantity: 1, price: service.price }],
        total: service.price,
        subtotal: service.price,
        currency: seller.currency || 'USD',
        status: 'pending',
        shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' },
        deliveryLocation: JSON.stringify(booking),
        paymentType: 'pod',
      });
      setConfirmation(order);
    } catch { setError('We could not send your request just now. Please try again or contact the salon.'); }
    finally { setBusy(false); }
  };

  const handleBack = () => {
    if (state?.from && state.from.startsWith('/')) {
      navigate(state.from, { replace: true });
    } else {
      navigate(seller?.subdomain ? `/shop/${seller.subdomain}` : '/', { replace: true });
    }
  };

  const openPortal = () => navigate(user
    ? '/salon/aura-salon/client'
    : `/login?shop=${encodeURIComponent(seller?.id || '')}&subdomain=${encodeURIComponent(seller?.subdomain || '')}&redirect=${encodeURIComponent('/salon/aura-salon/client')}`);

  if (loading) {
    return <div className="aurelia-site"><div className="aurelia-service-page-loading"><div className="admin-loading-spinner" /><p>Loading the service details…</p></div></div>;
  }
  if (!service || !seller) {
    return <div className="aurelia-site"><div className="aurelia-service-page-loading" role="alert">{error || 'This service could not be found.'}</div></div>;
  }

  const description = (service.description || '').replace(/\n?Duration:\s*\d+\s*min/i, '').trim();
  const durationLabel = duration ? `${duration} min` : '';
  const isSaved = service ? favorites.includes(service.id) : false;
  const toggleFavorite = () => {
    if (!seller || !service) return;
    const next = isSaved ? favorites.filter((id) => id !== service.id) : [...favorites, service.id];
    setFavorites(next);
    saveFavoriteServiceIds(seller.id, next);
  };
  const salonName = seller.storeName || 'Aura Salon';

  return (
    <div className="aurelia-site">
      <header className="aurelia-header">
        <button className="aurelia-wordmark" onClick={handleBack} aria-label="Back to salon">
          {seller.logo ? <img className="salon-logo" src={seller.logo} alt="" /> : <span className="wordmark-mark"><Scissors size={18} /></span>}
          <span>{salonName}</span>
        </button>
      </header>
      <main className="aurelia-service-page">
        <div className="service-detail-layout">
          <div className="service-detail-media">
            {service.images && service.images.length > 0 ? (
              <img src={service.images[0]} alt={service.name} className="service-detail-image" />
            ) : (
              <div className="service-detail-placeholder"><Scissors size={48} /></div>
            )}
            {service.videos && service.videos.length > 0 && (
              <video src={service.videos[0]} controls className="service-detail-video" />
            )}
          </div>
          <div className="service-detail-content">
            <p className="service-coordinate"><span /> SERVICE FILE / {service.category || 'SALON'}</p>
            <p className="aurelia-kicker">{service.category || 'SALON SERVICE'}</p>
            <h1 className="service-detail-title">{service.name}</h1>
            <p className="service-detail-description">{description || 'A treatment designed just for you.'}</p>
            {durationLabel && <p className="service-detail-duration"><Clock3 size={15} /> {durationLabel}</p>}
            <p className="service-detail-price">{formatPrice(service.price, seller.currency || 'USD')}</p>
            <button className="aura-save-button aura-detail-save" onClick={toggleFavorite} aria-pressed={isSaved}><Bookmark size={17} fill={isSaved ? 'currentColor' : 'none'} /> {isSaved ? 'Saved to favorites' : 'Save this treatment'}</button>
          </div>
        </div>
        <div className="aurelia-booking aurelia-service-booking">
          <div className="booking-heading">
            <p className="aurelia-kicker">BOOK YOUR APPOINTMENT</p>
            <h2>Choose a time<br /><i>to request.</i></h2>
            <p>This is only a preferred time request. The salon will review it and let you know if it can be confirmed. Request times are generated from published hours and do not check existing appointments.</p>
            <div className="booking-details">
              {hasPublishedHours ? <span><Clock3 size={16} /> {fit.openingTime}–{fit.closingTime}</span> : <span>Request hours have not been published.</span>}
              {(fit.location || seller?.contactInfo?.address) && <span><MapPin size={16} /> {fit.location || seller?.contactInfo?.address}</span>}
            </div>
          </div>
          <div className="booking-panel">
            {confirmation ? (
              <div className="booking-success" role="status">
                <span className="success-check"><Check size={20} /></span>
                <p className="aurelia-kicker">REQUEST RECEIVED</p>
                <h3>Request sent.<br /><i>Await confirmation.</i></h3>
                <p>Your request for {service.name} on {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at {time} is pending salon approval. This time is not reserved; the salon will review it and let you know if it can be confirmed.</p>
                <button className="aurelia-button aurelia-button-brass" onClick={openPortal}>
                  My appointments <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <form className="aurelia-booking-form" onSubmit={submitBooking}>
                <label>Date
                  <input type="date" min={today} value={date} onChange={(event) => { setDate(event.target.value); setTime(''); }} required />
                </label>
                <label>Preferred time (request only)
                  <select value={time} onChange={(event) => setTime(event.target.value)} disabled={!date || availableTimes.length === 0} required>
                    <option value="">{!hasPublishedHours ? 'Request hours not published' : !date ? 'Choose date first' : availableTimes.length ? 'Choose a time to request' : 'No request times for this date'}</option>
                    {availableTimes.map((slot) => (
                      <option key={slot} value={slot}>
                        {new Date(`2000-01-01T${slot}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="booking-field-pair">
                  <label>Your name
                    <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
                  </label>
                  <label>Email address
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
                  </label>
                </div>
                <label>Phone number
                  <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required />
                </label>
                {fit.staff.length > 0 && <label>Preferred stylist <span className="optional-label">OPTIONAL</span>
                  <select value={preferredStylist} onChange={(event) => setPreferredStylist(event.target.value)} aria-label="Preferred stylist">
                    <option value="">No preference</option>
                    {fit.staff.map((person) => <option key={person.name} value={person.name}>{person.name} · {person.specialty || 'Stylist'}</option>)}
                  </select>
                </label>}
                <label>A note for your stylist <span className="optional-label">OPTIONAL</span>
                  <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Goals, sensitivities, or anything we should know?" />
                </label>
                {error && <p className="aurelia-form-error" role="alert">{error}</p>}
                <button className="aurelia-button aurelia-button-brass booking-submit" type="submit" disabled={busy}>
                  {busy ? 'Sending request…' : 'Request this appointment'} {busy ? <span className="button-spinner" /> : <ArrowRight size={15} />}
                </button>
                <p className="booking-fineprint">No payment is collected. This is a request, not a confirmed or reserved appointment.</p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuraSalonServicePage;
