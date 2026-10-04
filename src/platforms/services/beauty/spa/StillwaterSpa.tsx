import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowRight, Check, Clock3, Flower2, MapPin, Menu, Phone, Sparkles, Waves, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller } from '../../../../services/api';
import { formatPrice } from '../../../../utils/currency';
import './stillwater-spa.css';

interface Props { seller: Seller; products: Product[] }

const StillwaterSpa: React.FC<Props> = ({ seller, products }) => {
  const { user } = useAuth();
  const services = products.filter((product) => product.status === 'active' && product.type === 'service');
  const [selectedService, setSelectedService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Order | 'demo' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const chosen = services.find((service) => service.id === selectedService);
  const spaName = seller.storeName || 'Stillwater Spa';
  const currency = seller.currency || 'USD';
  const isDemo = seller.id === 'demo-seller';

  const availableTimes = useMemo(() => {
    if (!date) return [];
    const earliest = Date.now() + 2 * 60 * 60 * 1000;
    return Array.from({ length: 16 }, (_, index) => {
      const minutes = 9 * 60 + index * 30;
      const value = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      const slotDate = new Date(`${date}T${value}:00`);
      return slotDate.getTime() >= earliest && value < '17:00' ? value : null;
    }).filter((value): value is string => Boolean(value));
  }, [date]);

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!chosen || !date || !time || !name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim()) {
      setError('Choose a treatment and time, then add your name, email, and phone number.');
      return;
    }
    if (isDemo) {
      setConfirmation('demo');
      return;
    }
    setBusy(true);
    try {
      const booking = { platform: 'stillwater-spa', appointmentDate: date, appointmentTime: time, notes: notes.trim() };
      const order = await ordersAPI.create({
        sellerId: seller.id,
        customerId: user?.id || '',
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        items: [{ productId: chosen.id, productName: chosen.name, quantity: 1, price: chosen.price }],
        total: chosen.price,
        subtotal: chosen.price,
        currency,
        status: 'pending',
        shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' },
        deliveryLocation: JSON.stringify(booking),
        paymentType: 'pod',
      });
      setConfirmation(order);
    } catch {
      setError('We could not send your request just now. Please try again or call the spa.');
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return <div className="stillwater-spa">
    <header className="spa-header">
      <a className="spa-wordmark" href="#spa-home" aria-label={`${spaName} home`}><span><Waves size={20} /></span><strong>{spaName}<small>SPA & RITUAL</small></strong></a>
      <button className="spa-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? 'spa-nav is-open' : 'spa-nav'} aria-label="Main navigation">
        <a href="#treatments" onClick={() => setMenuOpen(false)}>Treatments</a><a href="#philosophy" onClick={() => setMenuOpen(false)}>Our approach</a><a href="#visit" onClick={() => setMenuOpen(false)}>Find us</a>
        <a className="spa-nav-book" href="#booking" onClick={() => setMenuOpen(false)}>Reserve your ritual <ArrowRight size={15} /></a>
      </nav>
    </header>

    <main id="spa-home">
      <section className="spa-hero">
        <div className="spa-hero-copy"><p className="spa-eyebrow"><span /> A slower kind of luxury</p><h1>Come back<br />to <i>yourself.</i></h1><p className="spa-hero-intro">A restorative spa for the days that ask a little too much. Unhurried treatments, thoughtful hands, and room to breathe.</p><a className="spa-button spa-button-ink" href="#booking">Find your stillness <ArrowDownRight size={17} /></a><div className="spa-hero-foot"><span>01 - 03</span><span className="spa-rule" /> Rooted in care, made for you</div></div>
        <div className="spa-hero-image" role="img" aria-label="Sunlit spa room with a calm, natural atmosphere"><span className="spa-image-seal"><Flower2 size={19} /><span>REST<br />IS A RITUAL</span></span><span className="spa-image-caption">Let the day fall away.</span></div>
        <span className="spa-vertical-note">WELLNESS / WITHOUT THE RUSH</span>
      </section>

      <section className="spa-mantra"><p>Less noise.<br /><i>More you.</i></p><span><Sparkles size={17} /> A little space can change everything.</span><p>Care that meets you where you are, then gently takes you somewhere softer.</p></section>

      <section className="spa-treatments" id="treatments"><div className="spa-section-head"><div><p className="spa-eyebrow">THE TREATMENT MENU</p><h2>Choose your <i>unwind.</i></h2></div><a href="#booking">Book a treatment <ArrowRight size={16} /></a></div>
        {services.length ? <div className="spa-treatment-list">{services.map((service, index) => <article className="spa-treatment" key={service.id}>
          <span className="spa-treatment-index">0{index + 1}</span><div className="spa-treatment-main">{service.images?.[0] && <img src={service.images[0]} alt="" className="spa-treatment-image" />}<div><p className="spa-treatment-category">{service.category || 'SIGNATURE RITUAL'}</p><h3>{service.name}</h3><p>{service.description}</p></div></div><span className="spa-treatment-price">{formatPrice(service.price, currency)}</span><button aria-label={`Book ${service.name}`} className="spa-treatment-arrow" onClick={() => { setSelectedService(service.id); document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' }); }}><ArrowDownRight /></button>
        </article>)}</div> : <div className="spa-empty"><Flower2 /><div><h3>Your treatment menu is taking shape.</h3><p>Call or email us and we'll help you find the right ritual.</p></div><a href={`mailto:${seller.contactInfo?.email || ''}`}>Get in touch <ArrowRight size={15} /></a></div>}
      </section>

      <section className="spa-philosophy" id="philosophy"><div className="spa-philosophy-photo" role="img" aria-label="A quiet spa treatment room prepared for a guest" /><div className="spa-philosophy-copy"><p className="spa-eyebrow">A DIFFERENT PACE</p><h2>Wellbeing isn't<br />another thing to <i>do.</i></h2><p>It's a chance to listen inward. We pair considered techniques with a warm, personal welcome, so your time here feels like yours from the very first breath.</p><span className="spa-signature">With care, <i>{spaName}</i></span></div><span className="spa-philosophy-mark">S / 01</span></section>

      <section className="spa-booking" id="booking"><div className="spa-booking-intro"><p className="spa-eyebrow">SAVE SOME SPACE FOR YOU</p><h2>Your next deep<br /><i>breath starts here.</i></h2><p>Send a reservation request. Our team will confirm the details with you personally.</p><div className="spa-contact-details"><span><Clock3 size={16} /> Daily, 9:00 am - 5:00 pm</span><span><MapPin size={16} /> {seller.contactInfo?.address || 'A quiet corner, close to you'}</span></div></div>
        <div className="spa-booking-panel">{confirmation ? <div className="spa-booking-success" role="status"><span className="spa-success-icon"><Check /></span><p className="spa-eyebrow">{isDemo ? 'PREVIEW REQUEST' : 'REQUEST RECEIVED'}</p><h3>We've made<br /><i>room for you.</i></h3><p>{isDemo ? 'Your spa preview is working. On a live storefront, this request is sent to the spa team for confirmation.' : `Your request for ${chosen?.name} on ${new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at ${time} is pending confirmation. We'll be in touch soon.`}</p><a className="spa-button spa-button-green" href="#treatments">Explore treatments <ArrowRight size={16} /></a></div> : services.length === 0 ? <div className="spa-booking-empty"><Flower2 /><h3>Let's plan your visit together</h3><p>Our team will be happy to recommend a treatment and find a time that suits you.</p>{seller.contactInfo?.phone && <a href={`tel:${seller.contactInfo.phone}`}><Phone size={16} /> {seller.contactInfo.phone}</a>}</div> : <form className="spa-booking-form" onSubmit={submitBooking}>
          <label>Choose your treatment<select value={selectedService} onChange={(event) => setSelectedService(event.target.value)} required><option value="">Select a treatment</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} - {formatPrice(service.price, currency)}</option>)}</select></label>
          <div className="spa-field-pair"><label>Date<input type="date" min={today} value={date} onChange={(event) => { setDate(event.target.value); setTime(''); }} required /></label><label>Time<select value={time} onChange={(event) => setTime(event.target.value)} disabled={!date || !availableTimes.length} required><option value="">{!date ? 'Choose a date first' : availableTimes.length ? 'Select a time' : 'No times available'}</option>{availableTimes.map((slot) => <option key={slot} value={slot}>{new Date(`2000-01-01T${slot}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</option>)}</select></label></div>
          <div className="spa-field-pair"><label>Your name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></label><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label></div>
          <label>Phone number<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required /></label>
          <label>A note for your therapist <span className="spa-optional">OPTIONAL</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything that would help us make your visit feel right?" /></label>
          {error && <p className="spa-error" role="alert">{error}</p>}
          <button className="spa-button spa-button-green spa-submit" type="submit" disabled={busy}>{busy ? 'Sending request...' : 'Request this time'} {busy ? <span className="spa-spinner" /> : <ArrowRight size={16} />}</button><p className="spa-fineprint">No payment now. We'll confirm your appointment directly.</p>
        </form>}</div>
      </section>

      <section className="spa-visit" id="visit"><div><p className="spa-eyebrow">WHEN YOU'RE READY</p><h2>We'll be <i>here.</i></h2><p>{seller.contactInfo?.address || 'A calm space to pause, reset, and return to your day.'}</p></div><div className="spa-visit-links">{seller.contactInfo?.phone && <a href={`tel:${seller.contactInfo.phone}`}><Phone size={16} /> {seller.contactInfo.phone}</a>}{seller.contactInfo?.email && <a href={`mailto:${seller.contactInfo.email}`}><ArrowRight size={16} /> {seller.contactInfo.email}</a>}</div></section>
    </main>

    <footer className="spa-footer"><a className="spa-wordmark" href="#spa-home"><span><Waves size={20} /></span><strong>{spaName}<small>SPA & RITUAL</small></strong></a><span>TAKE YOUR TIME.</span><a href="#booking">Reserve a treatment <ArrowRight size={15} /></a><small>Copyright {new Date().getFullYear()} {spaName}</small></footer>
  </div>;
};

export default StillwaterSpa;