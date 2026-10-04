import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock3, MapPin, Send, Ticket, Users } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller, sellersAPI, productsAPI } from '../../../../services/api';
import { formatPrice } from '../../../../utils/currency';
import { defaultEventoSettings, getEventoSettings, parseEventMeta } from './eventoTypes';
import './evento.css';

interface LocationState { service?: Product; seller?: Seller; from?: string }

const EventoServicePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { eventId } = useParams<{ eventId?: string }>();
  const state = (location.state as LocationState) || {};
  const sellerId = searchParams.get('seller') || state?.seller?.id;

  const [service, setService] = useState<Product | null>(state?.service || null);
  const [seller, setSeller] = useState<Seller | null>(state?.seller || null);
  const isDemo = seller?.id === 'demo-seller' || seller?.subdomain === 'demo';
  const [loading, setLoading] = useState(!service || !seller);
  const [error, setError] = useState('');

  const [attendees, setAttendees] = useState(1);
  const [ticketType, setTicketType] = useState('');
  const [preferredHost, setPreferredHost] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Order | null>(null);

  useEffect(() => {
    let active = true;
    if (service && seller) {
      setLoading(false);
      return;
    }
    if (!eventId || !sellerId) {
      navigate('/', { replace: true });
      return;
    }
    setLoading(true);
    Promise.all([
      seller ? Promise.resolve(seller) : sellersAPI.getPublicById(sellerId),
      service ? Promise.resolve(service) : productsAPI.getBySellerId(sellerId),
    ]).then(([resolvedSeller, resolvedProducts]) => {
      if (!active) return;
      setSeller(resolvedSeller);
      if (!service) {
        const found = (resolvedProducts as Product[]).find((item) => item.id === eventId && item.type === 'service');
        setService(found || null);
      }
      setLoading(false);
    }).catch(() => {
      if (active) {
        setError('This event could not be found.');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [eventId, sellerId, service, seller, navigate]);

  const settings = seller ? getEventoSettings(seller) : defaultEventoSettings;
  const tiers = settings.ticketTiers.length > 0 ? settings.ticketTiers : [{ name: 'Standard Admission', price: service?.price || 0 }];
  const unitPrice = useMemo(() => {
    if (!service) return 0;
    const tier = tiers.find((item) => item.name === ticketType) || (settings.ticketTiers.length ? tiers[0] : undefined);
    return (tier ? tier.price : service.price) * attendees;
  }, [service, tiers, ticketType, attendees, settings.ticketTiers]);

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!service || !seller || !attendees || !name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim()) {
      setError('Select tickets and add your name, a valid email, and phone number.');
      return;
    }
    if (isDemo) {
      setError('This is an interactive preview. Ticket requests are only sent from a seller’s published Evento page.');
      return;
    }
    const meta = parseEventMeta(service.description);
    if (meta.date && new Date(`${meta.date}T${meta.time}`).getTime() - Date.now() < (settings.leadTimeHours || 0) * 3600000) {
      setError('This event is too soon to request tickets. Choose a later session.');
      return;
    }
    setBusy(true);
    try {
      const booking = { platform: 'evento', eventDate: meta.date, eventTime: meta.time, attendees, ticketType: ticketType || (tiers[0]?.name || 'Standard'), cohostName: preferredHost, notes: notes.trim() };
      const order = await ordersAPI.create({
        sellerId: seller.id,
        customerId: user?.id || '',
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        items: [{ productId: service.id, productName: service.name, quantity: attendees, price: unitPrice }],
        total: unitPrice,
        subtotal: unitPrice,
        currency: seller.currency || 'USD',
        status: 'pending',
        shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' },
        deliveryLocation: JSON.stringify(booking),
        paymentType: 'pod',
      });
      setConfirmation(order);
    } catch {
      setError('We could not send your request just now. Please try again or call the box office.');
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (state?.from && state.from.startsWith('/')) {
      navigate(state.from, { replace: true });
    } else {
      navigate(`/shop/${seller?.subdomain || ''}`, { replace: true });
    }
  };

  if (loading) {
    return <div className="ev-site"><div className="ev-loading"><span className="ev-spinner" /> Loading the event…</div></div>;
  }
  if (!service || !seller) {
    return <div className="ev-site"><div className="ev-loading" role="alert">{error || 'This event could not be found.'}</div></div>;
  }

  const meta = parseEventMeta(service.description);
  const cleanDescription = (service.description || '').replace(/\n?Date:\s*[\d-]+/i, '').replace(/\n?Time:\s*[\d:]+/i, '').replace(/\n?Duration:\s*\d+\s*min/i, '').replace(/\n?Capacity:\s*\d+/i, '').replace(/\n{3,}/g, '\n\n').trim() || 'An experience worth remembering.';

  return (
    <div className="ev-site">
      <header className="ev-header" style={{ position: 'static' }}>
        <button className="ev-wordmark" onClick={handleBack} aria-label="Back to event site">
          <span className="ev-emblem"><Ticket size={18} /></span><span>Evento <em>Live</em></span>
        </button>
        <button className="ev-back-link" onClick={handleBack}><ArrowRight size={14} /> Back to events</button>
      </header>

      <main className="ev-container">
        <div className="ev-detail-layout">
          <div className="ev-detail-media">
            {service.images && service.images.length > 0 ? (
              <img src={service.images[0]} alt={service.name} />
            ) : (
              <div className="ev-thumb-placeholder" style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--ev-muted)' }}><CalendarDays size={56} /></div>
            )}
            {service.videos && service.videos.length > 0 && <video src={service.videos[0]} controls />}
          </div>

          <div className="ev-detail-meta">
            <p className="ev-kicker">{service.category || 'LIVE EVENT'}</p>
            <h1>{service.name}</h1>
            <div className="ev-meta-row"><CalendarDays size={15} /> {meta.date ? new Date(`${meta.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBA'}</div>
            <div className="ev-meta-row"><Clock3 size={15} /> {meta.time || 'Time TBA'}{meta.duration && ` · ${meta.duration} min`}</div>
            {meta.capacity && <div className="ev-meta-row"><Users size={15} /> {meta.capacity} capacity</div>}
            <p className="ev-meta-row" style={{ marginTop: '8px' }}><MapPin size={15} /> {settings.venue || settings.address || seller.contactInfo?.address || 'Venue details coming soon'}</p>
            <p className="ev-price">{formatPrice(unitPrice, seller.currency || 'USD')}</p>
            <p className="ev-event-description">{cleanDescription}</p>
          </div>
        </div>

        <div className="ev-booking ev-service-booking">
          <div className="ev-heading">
            <p className="ev-kicker">REQUEST TICKETS</p>
            <h2>Get you<br /><em>a seat.</em></h2>
            <p>No payment now. We will confirm your tickets and email you back.</p>
          </div>
          <div className="ev-panel">
            {confirmation ? (
              <div className="ev-success" role="status">
                <span className="ev-check"><Check size={22} /></span>
                <p className="ev-kicker">REQUEST RECEIVED</p>
                <h3>You are on the list.</h3>
                <p>Your request for {service.name} is pending confirmation. We will email you at {email}. Reference: {confirmation.id.slice(0, 8).toUpperCase()}.</p>
                <button className="ev-btn ev-btn-primary" onClick={() => user
                  ? navigate('/evento/client')
                  : navigate(`/login?shop=${encodeURIComponent(seller.id)}&subdomain=${encodeURIComponent(seller.subdomain)}&redirect=${encodeURIComponent('/evento/client')}`)}>My tickets <Ticket size={15} /></button>
              </div>
            ) : (
              <form className="ev-form" onSubmit={submitRequest}>
                <div className="ev-field-pair">
                  <label>Tickets
                    <input type="number" min={1} max={10} value={attendees} onChange={(e) => setAttendees(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} required />
                  </label>
                  {tiers.length > 1 && <label>Ticket type
                    <select value={ticketType} onChange={(e) => setTicketType(e.target.value)}>
                      {tiers.map((tier) => <option key={tier.name} value={tier.name}>{tier.name} · {formatPrice(tier.price, seller.currency || 'USD')}</option>)}
                    </select>
                  </label>}
                </div>
                <div className="ev-field-pair">
                  <label>Your name
                    <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
                  </label>
                  <label>Email address
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                  </label>
                </div>
                <label>Phone number
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
                </label>
                {settings.cohosts.length > 0 && <label>Preferred host <span className="ev-optional">OPTIONAL</span>
                  <select value={preferredHost} onChange={(e) => setPreferredHost(e.target.value)} aria-label="Preferred host">
                    <option value="">Any host</option>
                    {settings.cohosts.map((host) => <option key={host.name} value={host.name}>{host.name} · {host.specialty || 'Coordinator'}</option>)}
                  </select>
                </label>}
                <label>A note for the host <span className="ev-optional">OPTIONAL</span>
                  <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Accessibility needs, dietary notes, or anything we should know?" />
                </label>
                <div className="ev-row">Total: <strong className="ev-price">{formatPrice(unitPrice, seller.currency || 'USD')}</strong></div>
                {error && <p className="ev-error" role="alert">{error}</p>}
                <button className="ev-btn ev-btn-primary" type="submit" disabled={busy}>
                  {busy ? 'Sending request…' : isDemo ? 'Preview ticket request' : 'Request tickets'} {busy ? <span className="ev-spinner" /> : <Send size={15} />}
                </button>
                <p className="ev-note">No payment now. Your tickets are confirmed once we email you back.</p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EventoServicePage;
