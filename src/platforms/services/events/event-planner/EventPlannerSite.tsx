import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, CalendarDays, Check, Clock3, Mail, MapPin, Menu, Phone,
  Scissors, X
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller } from '../../../../services/api';
import { formatPrice } from '../../../../utils/currency';
import { defaultPlannerSettings, getPlannerSettings } from './eventPlannerTypes';
import './event-planner.css';

interface Props { seller: Seller; products: Product[] }

const NAV_LINKS = ['Services', 'Process', 'Stories', 'Contact'];

const EventPlannerSite: React.FC<Props> = ({ seller, products }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const planner = getPlannerSettings(seller);
  const services = (products || []).filter((product) => product.type === 'service' && product.status === 'active');

  const [selectedService, setSelectedService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guestCount, setGuestCount] = useState('25');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [eventBrief, setEventBrief] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Order | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const chosen = services.find((service) => service.id === selectedService);

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
      if (slotDate.getTime() > Date.now()) {
        slots.push(slot);
      }
      current += 30;
    }
    return slots;
  }, [date]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id.toLowerCase().replace(' ', '-'));
    el?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const handleBookNow = (service: Product) => {
    setSelectedService(service.id);
    const bookingSection = document.getElementById('booking');
    bookingSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!chosen || !date || !time || !name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim()) {
      setError('Please choose a service, select a date and time, and fill in your contact details.');
      return;
    }

    setBusy(true);
    try {
      const booking = {
        platform: 'event-flow',
        eventType: chosen.name,
        eventDate: date,
        eventTime: time,
        guestCount: Number(guestCount),
        eventBrief: eventBrief.trim(),
      };
      const order = await ordersAPI.create({
        sellerId: seller.id,
        customerId: user?.id || '',
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        items: [{ productId: chosen.id, productName: chosen.name, quantity: 1, price: chosen.price }],
        total: chosen.price,
        subtotal: chosen.price,
        currency: seller.currency || 'USD',
        status: 'pending',
        shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' },
        deliveryLocation: JSON.stringify(booking),
        paymentType: 'pod',
      });
      setConfirmation(order);
    } catch {
      setError('We could not send your request. Please try again or call us.');
    } finally {
      setBusy(false);
    }
  };

  const portalPath = '/events/event-planner/client';

  return (
    <div className="flow-site">
      <header className="flow-site-header">
        <nav className="flow-nav">
          <a href="#top" className="flow-wordmark">
            <span className="wordmark-mark"><CalendarDays size={20} /></span>
            <span>Carnovga</span>
          </a>
          <div style={{ display: menuOpen ? 'flex' : 'none', flexDirection: 'column' }} className="mobile-nav">
            {NAV_LINKS.map((link) => (
              <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`} onClick={() => scrollToSection(link)}>{link}</a>
            ))}
          </div>
          <div className="nav-links">
            {NAV_LINKS.map((link) => (
              <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`} onClick={() => scrollToSection(link)}>{link}</a>
            ))}
            <a href={portalPath}><Menu size={18} /></a>
          </div>
          <button className="mobile-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </header>

      <section className="flow-hero">
        <div className="hero-container">
          <div className="hero-content">
            <p className="flow-kicker">Luxury event design studio</p>
            <h1>Celebrations <span className="hero-accent">crafted</span> with intention.</h1>
            <p>From intimate dinners to grand destination moments, Carnovga creates refined experiences that feel deeply personal and unmistakably elevated.</p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '32px', flexWrap: 'wrap' }}>
              <button className="flow-button flow-button-gold" onClick={() => scrollToSection('Services')}>Explore services</button>
              <button className="flow-button flow-button-outline" onClick={() => scrollToSection('Booking')}>Book a consultation</button>
            </div>
            <div className="hero-metrics">
              <div>
                <strong>250+</strong>
                <span>Curated occasions</span>
              </div>
              <div>
                <strong>4.9/5</strong>
                <span>Client experience</span>
              </div>
            </div>
          </div>
          <div className="hero-image">
            {chosen?.images && chosen.images.length > 0 ? (
              <img src={chosen.images[0]} alt={chosen.name} />
            ) : (
              <div className="hero-placeholder">
                <div className="hero-placeholder-card">
                  <CalendarDays size={52} />
                  <span>Luxury planning</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="flow-services" id="services">
        <div className="section-header">
          <p className="flow-kicker">SERVICES</p>
          <h2>Thoughtful planning, tailored to your vision.</h2>
        </div>
        <div className="services-grid">
          {services.length ? services.map((service) => (
            <article className="service-card" key={service.id}>
              <div className="service-image" style={{ background: 'var(--flow-gray)', aspectRatio: '16/9' }}>
                {service.images && service.images.length > 0 ? (
                  <img src={service.images[0]} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--flow-gold)' }}>
                    <CalendarDays size={32} />
                  </div>
                )}
              </div>
              <div className="service-content">
                <div className="service-meta">
                  <span><Clock3 size={14} /> {service.description.match(/Duration:\s*(\d+)/i)?.[1] || '60'} min</span>
                  <span><MapPin size={14} /> Event planning</span>
                </div>
                <h3>{service.name}</h3>
                <p style={{ color: 'var(--flow-gray-dark)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  {service.description.replace(/\n?Duration:\s*\d+\s*min/i, '').trim() || 'A tailored experience designed to bring your vision to life.'}
                </p>
                <p className="service-card .flow-button" style={{ display: 'block', width: '100%' }}>
                  <button className="flow-button flow-button-gold" style={{ width: '100%' }} onClick={() => handleBookNow(service)}>
                    {formatPrice(service.price, seller.currency || 'USD')} · Book now
                  </button>
                </p>
              </div>
            </article>
          )) : (
            <div className="service-card" style={{ textAlign: 'center', padding: '48px' }}>
              <CalendarDays size={48} style={{ color: 'var(--flow-gold)', marginBottom: '16px' }} />
              <h3>Services coming soon</h3>
            </div>
          )}
        </div>
      </section>

      <section className="flow-services" id="booking" style={{ background: 'var(--flow-navy)', color: 'var(--flow-cream)' }}>
        <div className="section-header" style={{ marginBottom: '40px' }}>
          <p className="flow-kicker">CONSULTATION</p>
          <h2>Let's talk about your <span style={{ color: 'var(--flow-gold)' }}>event.</span></h2>
        </div>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          {confirmation ? (
            <div className="booking-success" role="status" style={{ background: 'var(--flow-navy-light)', border: '1px solid var(--flow-gold)', color: 'var(--flow-cream)', textAlign: 'center' }}>
              <span className="success-check" style={{ background: 'var(--flow-gold)', color: 'var(--flow-navy)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><Check size={24} /></span>
              <p className="flow-kicker" style={{ justifyContent: 'center' }}>CONFIRMATION RECEIVED</p>
              <h3 style={{ fontSize: '1.4rem' }}>Your event brief is on its way.</h3>
              <p style={{ margin: '16px 0 24px', opacity: '0.85' }}>We've received your booking for {chosen?.name} on {date} at {time}. Our team will reach out within 24 hours to confirm availability and next steps.</p>
              <a href={portalPath} className="flow-button flow-button-gold">Go to your portal <ArrowRight size={15} /></a>
            </div>
          ) : (
            <form className="flow-form" onSubmit={submitBooking}>
              <div className="admin-form-grid">
                <label>Event type
                  <select value={selectedService} onChange={(event) => setSelectedService(event.target.value)} aria-label="Event type" required>
                    <option value="">Select an event type</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>{service.name} — {formatPrice(service.price, seller.currency || 'USD')}</option>
                    ))}
                  </select>
                </label>
                <label>Guest count
                  <input type="number" min="1" max="500" value={guestCount} onChange={(event) => setGuestCount(event.target.value)} required />
                </label>
                <label>Date
                  <input type="date" min={today} value={date} onChange={(event) => { setDate(event.target.value); setTime(''); }} required />
                </label>
                <label>Time
                  <select value={time} onChange={(event) => setTime(event.target.value)} disabled={!date || availableTimes.length === 0} required>
                    <option value="">{!date ? 'Choose date first' : availableTimes.length ? 'Select time' : 'No times available'}</option>
                    {availableTimes.map((slot) => (
                      <option key={slot} value={slot}>
                        {new Date(`2000-01-01T${slot}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </option>
                    ))}
                  </select>
                </label>
                <label>Your name
                  <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
                </label>
                <label>Email address
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
                </label>
                <label>Phone number
                  <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>Event brief
                  <textarea rows={3} value={eventBrief} onChange={(event) => setEventBrief(event.target.value)} placeholder="Tell us about your vision, goals, and any must-haves for this event." />
                </label>
              </div>
              {error && <p className="flow-form-error" role="alert" style={{ color: '#fca5a5' }}>{error}</p>}
              <button className="flow-button flow-button-gold" style={{ width: '100%' }} type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Request consultation'} {busy ? <span className="button-spinner" /> : <ArrowRight size={15} />}
              </button>
              <p style={{ fontSize: '0.8rem', opacity: '0.7', marginTop: '12px' }}>No payment now. We will confirm your consultation within 24 hours.</p>
            </form>
          )}
        </div>
      </section>

      {seller.contactInfo && (
        <section className="flow-services" id="contact">
          <div className="section-header">
            <p className="flow-kicker">CONTACT</p>
            <h2>Ready to plan something memorable?</h2>
          </div>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
              {seller.contactInfo.email && (
                <a href={`mailto:${seller.contactInfo.email}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--flow-navy)', textDecoration: 'none' }}>
                  <Mail size={20} color="var(--flow-gold)" />
                  <span>{seller.contactInfo.email}</span>
                </a>
              )}
              {seller.contactInfo.phone && (
                <a href={`tel:${seller.contactInfo.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--flow-navy)', textDecoration: 'none' }}>
                  <Phone size={20} color="var(--flow-gold)" />
                  <span>{seller.contactInfo.phone}</span>
                </a>
              )}
              {seller.contactInfo.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--flow-gray-dark)' }}>
                  <MapPin size={20} color="var(--flow-gold)" />
                  <span>{seller.contactInfo.address}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="flow-footer">
        <div className="footer-grid">
          <div>
            <a href="#top" className="flow-wordmark">
              <span className="wordmark-mark"><CalendarDays size={18} /></span>
              <span>Event <em>Flow</em></span>
            </a>
            <p style={{ marginTop: '12px', opacity: '0.6' }}>Crafting experiences that bring people together.</p>
            <div className="social-links">
              {(seller.socialLinks?.instagram || '#') && (
                <a href={seller.socialLinks?.instagram || '#'} aria-label="Instagram"><Scissors size={16} /></a>
              )}
            </div>
          </div>
          <div>
            <h4>Quick links</h4>
            <div className="footer-links">
              {NAV_LINKS.map((link) => (
                <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`} onClick={() => scrollToSection(link)}>{link}</a>
              ))}
            </div>
          </div>
          <div>
            <h4>Legal</h4>
            <div className="footer-links">
              <a href="#privacy">Privacy</a>
              <a href="#terms">Terms</a>
            </div>
          </div>
        </div>
        <div className="copyright">
          <p>© {new Date().getFullYear()} {seller.storeName || 'Event Flow'}</p>
        </div>
      </footer>
    </div>
  );
};

export default EventPlannerSite;
