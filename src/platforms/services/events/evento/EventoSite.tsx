import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Check, Clock3, MapPin, Menu, Phone, Send, Ticket, TicketCheck } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller } from '../../../../services/api';
import { formatPrice } from '../../../../utils/currency';
import { getEventoSettings, parseEventMeta } from './eventoTypes';
import './evento.css';

interface Props { seller: Seller; products: Product[]; demoMode?: boolean }

const monthName = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
const dayNum = (date: string) => new Date(`${date}T12:00:00`).getDate();
const dayName = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
const todayISO = () => new Date().toISOString().slice(0, 10);

const EventoSite: React.FC<Props> = ({ seller, products, demoMode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const settings = getEventoSettings(seller);
  const events = products.filter((product) => product.status === 'active' && product.type === 'service');
  const upcoming = useMemo(() => events.filter((item) => {
    const meta = parseEventMeta(item.description);
    return meta.date && meta.date >= todayISO();
  }), [events]);
  const headlineEvent = upcoming[0];
  const headlineMeta = headlineEvent ? parseEventMeta(headlineEvent.description) : null;
  const headlineVenue = settings.venue || settings.address || seller.contactInfo?.address;

  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [attendees, setAttendees] = useState(1);
  const [ticketType, setTicketType] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [notes, setNotes] = useState('');
  const [preferredHost, setPreferredHost] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Order | null>(null);

  const chosen = events.find((item) => item.id === selectedEvent);
  const chosenMeta = chosen ? parseEventMeta(chosen.description) : { date: '', time: '', duration: '', capacity: '' };
  const tiers = settings.ticketTiers.length > 0 ? settings.ticketTiers : [{ name: 'Standard Admission', price: chosen?.price || 0 }];
  const unitPrice = useMemo(() => {
    if (!chosen) return 0;
    const tier = tiers.find((item) => item.name === ticketType) || (settings.ticketTiers.length ? tiers[0] : undefined);
    return (tier ? tier.price : chosen.price) * attendees;
  }, [chosen, tiers, ticketType, attendees, settings.ticketTiers]);

  const portalPath = '/evento/client';
  const openPortal = () => navigate(user ? portalPath : `/login?shop=${encodeURIComponent(seller.id)}&subdomain=${encodeURIComponent(seller.subdomain)}&redirect=${encodeURIComponent('/evento/client')}`);

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!chosen || !chosenMeta.date || !chosenMeta.time || !name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim() || attendees < 1) {
      setError('Select an event and add your name, a valid email, phone number, and at least one attendee.');
      return;
    }
    if (demoMode) {
      setError('This is an interactive preview. Ticket requests are only sent from a seller’s published Evento page.');
      return;
    }
    const leadMs = (settings.leadTimeHours || 0) * 3600000;
    if (chosenMeta.date && new Date(`${chosenMeta.date}T${chosenMeta.time}`).getTime() - Date.now() < leadMs) {
      setError('This event is too soon to request tickets. Pick a later session.');
      return;
    }
    setBusy(true);
    try {
      const booking = { platform: 'evento', eventDate: chosenMeta.date, eventTime: chosenMeta.time, attendees, ticketType: ticketType || (tiers[0]?.name || 'Standard'), cohostName: preferredHost, notes: notes.trim() };
      const order = await ordersAPI.create({
        sellerId: seller.id,
        customerId: user?.id || '',
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        items: [{ productId: chosen.id, productName: chosen.name, quantity: attendees, price: unitPrice }],
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

  const goDetail = (item: Product) => navigate(`/evento/event/${item.id}?seller=${encodeURIComponent(seller.id)}`, { state: { service: item, seller, from: `/shop/${seller.subdomain}` } });

  return <div className="ev-site">
    <header className="ev-header">
      <a href="#top" className="ev-wordmark" aria-label="Evento home"><span className="ev-emblem"><Ticket size={18} /></span><span>Evento <em>Live</em></span></a>
      <button className="ev-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="evento-main-navigation"><Menu /></button>
      <nav id="evento-main-navigation" className={`ev-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <a href="#events" onClick={() => setMenuOpen(false)}>Events</a>
        <a href="#book" onClick={() => setMenuOpen(false)}>Request</a>
        <a href="#visit" onClick={() => setMenuOpen(false)}>Info</a>
        <button className="ev-text-btn" onClick={openPortal}>My tickets <TicketCheck size={15} /></button>
      </nav>
    </header>

    <main id="top">
      <section className={`ev-hero ${headlineEvent ? 'has-featured' : 'is-empty'}`}>
        <div className="ev-hero-copy">
          <p className="ev-kicker">A HOUSE FOR LIVE EXPERIENCES</p>
          <h1>Make room<br />for <em>the moment.</em></h1>
          <p className="ev-intro">Thoughtful gatherings, live performances, and workshops worth stepping out for. Request a place; the box office will confirm your spot.</p>
          <button className="ev-cta" onClick={() => headlineEvent ? goDetail(headlineEvent) : document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' })}>
            {headlineEvent ? 'Discover the next event' : 'Explore the programme'} <TicketCheck size={15} />
          </button>
          <span className="ev-hero-side">LIVE / LOCAL / IN PERSON</span>
        </div>
        {headlineEvent && headlineMeta && <button className="ev-featured-ticket" onClick={() => goDetail(headlineEvent)} aria-label={`View ${headlineEvent.name}`}>
          <span className="ev-featured-image">
            {headlineEvent.images?.[0] ? <img src={headlineEvent.images[0]} alt="" /> : <span className="ev-image-placeholder"><CalendarDays size={38} /></span>}
            <span className="ev-featured-overline">{headlineEvent.category || 'UP NEXT'}</span>
          </span>
          <span className="ev-featured-details">
            <span className="ev-featured-date">{headlineMeta.date ? `${dayName(headlineMeta.date)} · ${monthName(headlineMeta.date)} ${dayNum(headlineMeta.date)}` : 'DATE TO BE ANNOUNCED'}</span>
            <strong>{headlineEvent.name}</strong>
            <span>{headlineMeta.time || 'Time to be announced'}{headlineVenue ? ` · ${headlineVenue}` : ''}</span>
            <span className="ev-featured-price">{formatPrice(settings.ticketTiers[0]?.price ?? headlineEvent.price, seller.currency || 'USD')} <span>per ticket</span></span>
            <span className="ev-featured-link">EVENT DETAILS <span aria-hidden="true">↗</span></span>
          </span>
        </button>}
      </section>

      <section className="ev-container">
        <div className="ev-stats">
          <div className="ev-stat ev-stat-count"><strong>{events.length}</strong><span className="ev-label">Active events</span></div>
          <div className="ev-stat ev-stat-brief"><strong>No upfront payment</strong><span className="ev-label">Requests stay pending until confirmed</span></div>
          <div className="ev-stat ev-stat-brief"><strong>Personal confirmation</strong><span className="ev-label">The box office follows up by email</span></div>
        </div>

        <section className="ev-section" id="events">
          <div className="ev-section-title"><h2>Up next</h2><a href="#book" className="ev-view-all">Book now <Send size={14} /></a></div>
          {upcoming.length ? <div className="ev-event-grid">{upcoming.map((item) => {
            const meta = parseEventMeta(item.description);
            return <article key={item.id} className="ev-event-card" onClick={() => goDetail(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); goDetail(item); } }} tabIndex={0} role="link" aria-label={`View ${item.name}`}>
              <div className="ev-card-media">
              {item.images?.[0] ? <img src={item.images[0]} alt={item.name} /> : <div className="ev-image-placeholder"><CalendarDays size={30} /><span>EVENTO / LIVE</span></div>}
                {meta.date && <span className="ev-date-badge"><span className="ev-day">{dayNum(meta.date)}</span><span className="ev-mo">{monthName(meta.date)}</span></span>}
              </div>
              <div className="ev-card-body">
                <span className="ev-cat">{item.category || 'LIVE EVENT'}</span>
                <h3>{item.name}</h3>
                <div className="ev-card-meta"><Clock3 size={13} /> {meta.time}{meta.duration && ` · ${meta.duration} min`}</div>
                <div className="ev-price-tag">{formatPrice(item.price, seller.currency || 'USD')}</div>
              </div>
            </article>;
          })}</div> : <div className="ev-empty-state"><CalendarDays /><p>No events scheduled yet. Check back soon.</p></div>}
        </section>

        <section className="ev-section" id="book">
          <div className="ev-booking">
            <div className="ev-heading">
              <p className="ev-kicker">REQUEST TICKETS</p>
              <h2>Find you<br /><em>a seat.</em></h2>
              <p>Send a request for any event above. We will hold your tickets and confirm once we verify your spot. No payment now.</p>
              <div className="ev-card-meta"><MapPin size={13} /> {settings.venue || settings.address || seller.contactInfo?.address || seller.contactInfo?.phone || 'Venue details coming soon'}</div>
            </div>
            <div className="ev-panel">
              {confirmation ? (
                <div className="ev-success" role="status">
                  <span className="ev-check"><Check size={22} /></span>
                  <p className="ev-kicker">REQUEST RECEIVED</p>
                  <h3>Your request is in the queue,</h3>
                  <p>We will email you at {email} once your tickets are confirmed. Reference: {confirmation.id.slice(0, 8).toUpperCase()}.</p>
                  <button className="ev-btn ev-btn-primary" onClick={openPortal}>View my tickets <TicketCheck size={15} /></button>
                </div>
              ) : events.length === 0 ? (
                <div className="ev-empty-state"><Ticket size={28} /><h3>Online booking is almost ready</h3><p>The schedule is coming together. Contact us and we will find a time together.</p></div>
              ) : (
                <form className="ev-form" onSubmit={submitRequest}>
                  <label>Choose an event
                    <select value={selectedEvent} onChange={(e) => { setSelectedEvent(e.target.value); }} required>
                      <option value="">Select an event</option>
                      {events.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatPrice(item.price, seller.currency || 'USD')}</option>)}
                    </select>
                  </label>
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
                  {chosen && <div className="ev-row">Total: <strong className="ev-price">{formatPrice(unitPrice, seller.currency || 'USD')}</strong></div>}
                  {error && <p className="ev-error" role="alert">{error}</p>}
                  <button className="ev-btn ev-btn-primary" type="submit" disabled={busy}>
                    {busy ? 'Sending request…' : demoMode ? 'Preview request flow' : 'Request tickets'} {busy ? <span className="ev-spinner" /> : <Send size={15} />}
                  </button>
                  <p className="ev-note">No payment now. Your tickets are confirmed once we email you back.</p>
                </form>
              )}
            </div>
          </div>
        </section>

      </section>

      <footer className="ev-footer" id="visit">
        <div className="ev-footer-close">
          <p className="ev-kicker">UNTIL WE MEET IN PERSON</p>
          <p className="ev-footer-statement">Good things happen<br />when we <em>gather.</em></p>
          <a href="#events" className="ev-footer-return">Return to the events <ArrowUpRight size={16} /></a>
        </div>
        <div className="ev-footer-body">
          <div className="ev-footer-identity">
            <a href="#top" className="ev-wordmark" aria-label="Evento Live, back to top"><span className="ev-emblem"><Ticket size={16} /></span><span>Evento <em>Live</em></span></a>
            <p>{seller.storeName || 'Evento Live'}{settings.venue ? ` · ${settings.venue}` : ''}</p>
          </div>
          <nav className="ev-footer-nav" aria-label="Footer navigation">
            <span className="ev-footer-label">EXPLORE</span>
            <a href="#events">Upcoming events</a>
            <button type="button" onClick={openPortal}>My tickets <ArrowUpRight size={13} /></button>
          </nav>
          <address className="ev-footer-contact">
            <span className="ev-footer-label">BOX OFFICE & VENUE</span>
            {(settings.phone || seller.contactInfo?.phone) && <a href={`tel:${settings.phone || seller.contactInfo?.phone}`}><Phone size={14} /> {settings.phone || seller.contactInfo?.phone}</a>}
            {(settings.email || seller.contactInfo?.email) && <a href={`mailto:${settings.email || seller.contactInfo?.email}`}><Send size={14} /> {settings.email || seller.contactInfo?.email}</a>}
            {(settings.address || seller.contactInfo?.address) && <span className="ev-footer-address"><MapPin size={14} /> {settings.address || seller.contactInfo?.address}</span>}
            {!settings.phone && !seller.contactInfo?.phone && !settings.email && !seller.contactInfo?.email && !settings.address && !seller.contactInfo?.address && <span>Contact and venue details will appear here when available.</span>}
          </address>
        </div>
        <div className="ev-footer-bottom">
          <small>© {new Date().getFullYear()} {seller.storeName || 'Evento Live'}</small>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
    </main>
  </div>;
};

export default EventoSite;
