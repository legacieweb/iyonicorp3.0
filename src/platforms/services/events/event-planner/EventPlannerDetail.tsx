import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, Scissors } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller, sellersAPI, productsAPI } from '../../../../services/api';
import { formatPrice } from '../../../../utils/currency';
import { defaultPlannerSettings, getPlannerSettings, isEventFlow, readEventBooking } from './eventPlannerTypes';
import './event-planner.css';

interface LocationState { service?: Product; seller?: Seller; from?: string }

const EventPlannerDetail: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { serviceId } = useParams<{ serviceId?: string }>();
  const state = (location.state as LocationState) || {};
  const sellerId = searchParams.get('seller') || state?.seller?.id;

  const [service, setService] = useState<Product | null>(state?.service || null);
  const [seller, setSeller] = useState<Seller | null>(state?.seller || null);
  const [loading, setLoading] = useState(!service || !seller);
  const [error, setError] = useState('');

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guestCount, setGuestCount] = useState('25');
  const [preferredPlanner, setPreferredPlanner] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [eventBrief, setEventBrief] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Order | null>(null);

  useEffect(() => {
    let active = true;
    if (service && seller) {
      setLoading(false);
      return;
    }
    if (!serviceId || !sellerId) {
      navigate('/', { replace: true });
      return;
    }
    setLoading(true);
    Promise.all([
      seller ? Promise.resolve(seller) : sellersAPI.getPublicById(sellerId),
      service ? Promise.resolve(service) : productsAPI.getBySellerId(sellerId),
    ])
      .then(([resolvedSeller, products]) => {
        if (!active) return;
        const resolvedSellerChecked = resolvedSeller;
        if (resolvedSellerChecked && !isEventFlow(resolvedSellerChecked)) {
          setError('This listing is not available.');
          setLoading(false);
          return;
        }
        setSeller(resolvedSellerChecked);
        if (!service) {
          const found = (products as Product[]).find((p) => p.id === serviceId && p.type === 'service');
          setService(found || null);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError('This event service could not be found.');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [serviceId, sellerId, service, seller, navigate]);

  const planner = seller ? getPlannerSettings(seller) : defaultPlannerSettings;
  const today = new Date().toISOString().slice(0, 10);

  const availableTimes = useMemo(() => {
    if (!date) return [];
    const slots: string[] = [];
    const start = 9 * 60;
    const end = 18 * 60;
    let current = start;
    while (current < end) {
      const h = String(Math.floor(current / 60)).padStart(2, '0');
      const m = String(current % 60).padStart(2, '0');
      const slot = `${h}:${m}`;
      const slotDate = new Date(`${date}T${slot}:00`);
      if (slotDate.getTime() > Date.now() + planner.bookingLeadTime * 3600000) {
        slots.push(slot);
      }
      current += 30;
    }
    return slots;
  }, [date, planner.bookingLeadTime]);

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!service || !seller || !date || !time || !name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim()) {
      setError('Choose a date and time, then add your name, a valid email, and phone number.');
      return;
    }

    setBusy(true);
    try {
      const booking = {
        platform: 'event-flow',
        eventType: service.name,
        eventDate: date,
        eventTime: time,
        guestCount: Number(guestCount),
        plannerName: preferredPlanner,
        eventBrief: eventBrief.trim(),
      };
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
    } catch {
      setError('We could not send your request. Please try again or call the studio.');
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (state?.from && state.from.startsWith('/')) {
      navigate(state.from, { replace: true });
    } else {
      window.location.href = `/shop/${seller?.subdomain || ''}`;
    }
  };

  const openPortal = () =>
    navigate(
      user
        ? '/events/event-planner/client'
        : `/login?shop=${encodeURIComponent(seller?.id || '')}&subdomain=${encodeURIComponent(
            seller?.subdomain || ''
          )}&redirect=${encodeURIComponent('/events/event-planner/client')}`
    );

  if (loading) {
    return (
      <div className="flow-site">
        <div className="aurelia-service-page-loading">
          <div className="button-spinner" />
          <p>Loading the event details…</p>
        </div>
      </div>
    );
  }

  if (!service || !seller) {
    return (
      <div className="flow-site">
        <div className="aurelia-service-page-loading" role="alert">
          {error || 'This event service could not be found.'}
        </div>
      </div>
    );
  }

  const description = (service.description || '').replace(/\n?Duration:\s*\d+\s*min/i, '').trim();
  const durationMatch = service.description?.match(/Duration:\s*(\d+)/i);
  const duration = durationMatch ? `${durationMatch[1]} min` : '';

  return (
    <div className="flow-site">
      <header className="flow-header">
        <button className="flow-wordmark" onClick={handleBack} aria-label="Back to studio">
          <span className="wordmark-mark"><CalendarDays size={18} /></span>
          <span>Event <em>Flow</em></span>
        </button>
      </header>

      <main className="aurelia-service-page">
        <div className="service-detail-layout">
          <div className="service-detail-media">
            {service.images && service.images.length > 0 ? (
              <img src={service.images[0]} alt={service.name} className="service-detail-image" />
            ) : (
              <div className="service-detail-placeholder">
                <CalendarDays size={48} />
              </div>
            )}
            {service.videos && service.videos.length > 0 && (
              <video src={service.videos[0]} controls className="service-detail-video" />
            )}
          </div>

          <div className="service-detail-content">
            <p className="service-coordinate">
              <span /> EVENT SERVICE / {service.category || 'PLANNING'}
            </p>
            <p className="flow-kicker">{service.category || 'EVENT FLOW'}</p>
            <h1 className="service-detail-title">{service.name}</h1>
            <p className="service-detail-description">
              {description || 'A tailored experience designed just for your event.'}
            </p>
            {duration && (
              <p className="service-detail-duration">
                <Clock3 size={15} /> {duration}
              </p>
            )}
            <p className="service-detail-price">
              {formatPrice(service.price, seller.currency || 'USD')}
            </p>
          </div>
        </div>

        <div className="aurelia-booking aurelia-service-booking">
          <div className="booking-heading">
            <p className="flow-kicker">BOOK YOUR CONSULTATION</p>
            <h2>
              Let's talk about<br />
              <i>your event.</i>
            </h2>
            <p>Send a request and our team will confirm details within 24 hours.</p>
            <div className="booking-details">
              <span>
                <Clock3 size={16} /> Working hours: 9:00–18:00
              </span>
              <span>
                <MapPin size={16} />{' '}
                {seller.contactInfo?.address || 'Location details coming soon'}
              </span>
            </div>
          </div>

          <div className="booking-panel">
            {confirmation ? (
              <div className="booking-success" role="status">
                <span className="success-check">
                  <Check size={20} />
                </span>
                <p className="flow-kicker">REQUEST RECEIVED</p>
                <h3>
                  You earned a slot<br />
                  <i>in our books.</i>
                </h3>
                <p>
                  Your request for {service.name} on{' '}
                  {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  at {time} is pending review. We will be in touch within 24 hours.
                </p>
                <button className="flow-button flow-button-gold" onClick={openPortal}>
                  My events <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <form className="aurelia-booking-form" onSubmit={submitRequest}>
                <div className="service-detail-price" style={{ marginBottom: '12px' }}>
                  {service.name} — {formatPrice(service.price, seller.currency || 'USD')}
                </div>

                <label>
                  Guest count
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={guestCount}
                    onChange={(event) => setGuestCount(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Date
                  <input
                    type="date"
                    min={today}
                    value={date}
                    onChange={(event) => {
                      setDate(event.target.value);
                      setTime('');
                    }}
                    required
                  />
                </label>

                <label>
                  Preferred time
                  <select
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    disabled={!date || availableTimes.length === 0}
                    required
                  >
                    <option value="">
                      {!date ? 'Choose date first' : availableTimes.length ? 'Select time' : 'No times available'}
                    </option>
                    {availableTimes.map((slot) => (
                      <option key={slot} value={slot}>
                        {new Date(`2000-01-01T${slot}`).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="booking-field-pair">
                  <label>
                    Your name
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      required
                    />
                  </label>
                  <label>
                    Email address
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </label>
                </div>

                <label>
                  Phone number
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    required
                  />
                </label>

                {planner.planners && planner.planners.length > 0 && (
                  <label>
                    Preferred planner <span className="optional-label">OPTIONAL</span>
                    <select
                      value={preferredPlanner}
                      onChange={(event) => setPreferredPlanner(event.target.value)}
                      aria-label="Preferred planner"
                    >
                      <option value="">Any available planner</option>
                      {planner.planners.map((person) => (
                        <option key={person.name} value={person.name}>
                          {person.name} · {person.specialty || 'Planner'}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label>
                  Event brief <span className="optional-label">OPTIONAL</span>
                  <textarea
                    rows={3}
                    value={eventBrief}
                    onChange={(event) => setEventBrief(event.target.value)}
                    placeholder="Tell us about your vision, goals, and any must-haves."
                  />
                </label>

                {error && <p className="aurelia-form-error" role="alert">{error}</p>}
                <button
                  className="flow-button flow-button-gold booking-submit"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? 'Sending…' : 'Request consultation'}
                  {busy ? <span className="button-spinner" /> : <ArrowRight size={15} />}
                </button>
                <p className="booking-fineprint">
                  No payment now. Your consultation is confirmed once our team responds.
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EventPlannerDetail;
