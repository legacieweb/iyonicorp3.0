import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowDownRight, ArrowRight, BarChart3, Check, Clock3, Dumbbell, Instagram, MapPin, Menu, Phone, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller } from '../../../../services/api';
import { formatPrice } from '../../../../utils/currency';
import { getPulseFitSettings } from './pulseFitTypes';
import './pulse-fit.css';

interface Props { seller: Seller; products: Product[]; demoMode?: boolean }

const PulseFitSite: React.FC<Props> = ({ seller, products }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fit = getPulseFitSettings(seller);
  const classes = products.filter((product) => product.status === 'active' && product.type === 'service');
  const featured = useMemo(() => classes.slice(0, 4), [classes]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [preferredTrainer, setPreferredTrainer] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Order | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const chosen = classes.find((cls) => cls.id === selectedClass);

  const availableTimes = useMemo(() => {
    if (!date || fit.closedDays.includes(new Date(`${date}T12:00:00`).getDay())) return [];
    const [startHour, startMinute] = fit.openingTime.split(':').map(Number);
    const [endHour, endMinute] = fit.closingTime.split(':').map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    const earliest = Date.now() + fit.leadTimeHours * 3600000;
    return Array.from({ length: Math.max(0, Math.ceil((end - start) / Math.max(15, fit.slotInterval))) }, (_, index) => {
      const value = start + index * Math.max(15, fit.slotInterval);
      const slotDate = new Date(`${date}T${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}:00`);
      return slotDate.getTime() >= earliest ? `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` : null;
    }).filter((value): value is string => !!value && value < fit.closingTime);
  }, [date, fit.closedDays, fit.closingTime, fit.leadTimeHours, fit.openingTime, fit.slotInterval]);

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!chosen || !date || !time || !name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim()) {
      setError('Choose a class and time, then add your name, a valid email, and phone number.');
      return;
    }
    setBusy(true);
    try {
      const booking = { platform: 'pulse-fit', sessionDate: date, sessionTime: time, trainerName: preferredTrainer, notes: notes.trim() };
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
      setError('We could not send your request just now. Please try again or call the studio.');
    } finally {
      setBusy(false);
    }
  };

  const portalPath = '/fit/pulse-fit/client';
  const openPortal = () => navigate(user ? portalPath : `/login?shop=${encodeURIComponent(seller.id)}&subdomain=${encodeURIComponent(seller.subdomain)}&redirect=${encodeURIComponent('/fit/pulse-fit/client')}`);
  const today = new Date().toISOString().slice(0, 10);
  const classCount = seller.stats?.totalProducts || classes.length;
  const memberCount = seller.stats?.totalCustomers || 0;
  const sessionCount = seller.stats?.totalOrders || 0;

  return <div className="pulse-site">
    <header className="pulse-header">
      <a className="pulse-wordmark" href="#top" aria-label="Pulse Fit home"><span className="wordmark-mark"><Dumbbell size={18} /></span><span>Pulse <em>Fit</em></span></a>
      <button className="pulse-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X /> : <Menu />}</button>
      <nav className={`${menuOpen ? 'pulse-nav is-open' : 'pulse-nav'}`} aria-label="Main navigation">
        <a href="#classes" onClick={() => setMenuOpen(false)}>Classes</a><a href="#trainers" onClick={() => setMenuOpen(false)}>Trainers</a><a href="#classes" onClick={() => setMenuOpen(false)}>Pricing</a><a href="#book" onClick={() => setMenuOpen(false)}>Book</a>
        <button className="pulse-text-button" onClick={openPortal}>My sessions <ArrowRight size={15} /></button>
      </nav>
    </header>

    <main id="top">
      <section className="pulse-hero">
        <div className="pulse-hero-copy">
          <p className="pulse-kicker"><span /> Your strongest self starts here</p>
          <h1>Stronger every<br /><i>day.</i></h1>
          <p className="pulse-hero-intro">Drop-in classes, personal training, and membership plans built around your schedule and goals. Come in where you are; leave it on the floor.</p>
          <a className="pulse-button pulse-button-amber" href="#book">Book a class <ArrowDownRight size={17} /></a>
          <div className="pulse-hero-note"><span className="hero-rule" /> Form over fame. Results over ego.</div>
        </div>
        <div className="pulse-hero-image" role="img" aria-label="A cosmic training station beneath a field of stars">
          <span className="hero-orbit" aria-hidden="true" />
          <span className="hero-orbit-core" aria-hidden="true"><Activity size={25} /></span>
          <span className="hero-stamp"><Activity size={17} /> FIND YOUR <br /> PULSE</span>
          <span className="hero-image-caption">Progress, not perfection.</span>
          <span className="hero-image-readout" aria-hidden="true"><span>FIELD NOTE / 01</span><strong>THE WORK IS<br />THE WAY OUT.</strong><span>STRENGTH · FOCUS · FLIGHT</span></span>
        </div>
        <span className="pulse-hero-side">STRENGTH / STRUCTURE / STEADINESS</span>
      </section>

      <section className="pulse-grid-bar" role="status" aria-label="Studio stats"><BarChart3 size={14} /><span>{sessionCount}+ sessions run</span><span>{classCount} classes</span><span>{memberCount}+ members</span></section>

      <section className="pulse-services" id="classes">
        <div className="pulse-section-heading"><div><p className="pulse-kicker">THE CLASSES</p><h2>Find your<br /><i>favorite workout.</i></h2></div><a href="#book">Book now <ArrowRight size={16} /></a></div>
        {classes.length ? <div className="pulse-class-list">{classes.map((cls, index) => <article className="pulse-class-row" key={cls.id} tabIndex={0} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/fit/pulse-fit/class/${cls.id}?seller=${encodeURIComponent(seller.id)}`, { state: { service: cls, seller, from: `/shop/${seller.subdomain}` } }); } }} onClick={() => navigate(`/fit/pulse-fit/class/${cls.id}?seller=${encodeURIComponent(seller.id)}`, { state: { service: cls, seller, from: `/shop/${seller.subdomain}` } })}>
          <span className="class-number">0{index + 1}</span><div>{cls.images && cls.images.length > 0 && <img src={cls.images[0]} alt={cls.name} className="class-thumb" />}<p className="class-category">{cls.category || 'PULSE PRIME'}</p><h3>{cls.name}</h3><p className="class-description">{cls.description}</p></div><span className="class-price">{formatPrice(cls.price, seller.currency || 'USD')}</span><button onClick={(event) => { event.stopPropagation(); setSelectedClass(cls.id); document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' }); }} aria-label={`Book ${cls.name}`} className="class-arrow"><ArrowDownRight /></button>
        </article>)}</div> : <div className="pulse-empty-services"><Dumbbell /><div><h3>The class schedule is loading.</h3><p>We're setting up this week's lineup. Check back soon or drop us a line for a recommendation.</p></div><a href={`mailto:${fit.email || seller.contactInfo?.email || ''}`}>Contact the studio <ArrowRight size={15} /></a></div>}
      </section>

      {fit.trainers.length > 0 && <section className="pulse-story" id="trainers"><div className="story-photo" role="img" aria-label="Coaches setting up equipment between classes" /><div className="story-copy"><p className="pulse-kicker">THE TEAM</p><h2>Great form,<br />great people.</h2><p>Every coach brings a different philosophy and a shared commitment: move well, recover often, and keep showing up. Request your favorite trainer when you book.</p><div className="story-signature">See you in the floor, <span>Pulse</span></div></div><span className="story-number">COACH / CARE / RESULTS</span></section>}

      <section className="pulse-booking" id="book"><div className="booking-heading"><p className="pulse-kicker">BOOK A SESSION</p><h2>Let's find you<br /><i>a good hour.</i></h2><p>Send a request and our team will hold your spot. No payment now — you're set once we confirm.</p><div className="booking-details"><span><Clock3 size={16} /> {fit.openingTime}–{fit.closingTime}</span><span><MapPin size={16} /> {fit.location || seller.contactInfo?.address || 'Location details coming soon'}</span></div></div>
        <div className="booking-panel">{confirmation ? <div className="booking-success" role="status"><span className="success-check"><Check /></span><p className="pulse-kicker">REQUEST RECEIVED</p><h3>You earned a spot<br /><i>in mind.</i></h3><p>Your request for {chosen?.name} on {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at {time} is pending confirmation. We'll be in touch soon.</p><button className="pulse-button pulse-button-pine" onClick={openPortal}>My sessions <ArrowRight size={16} /></button></div> : classes.length === 0 ? <div className="booking-no-services"><Dumbbell /><h3>Online booking is almost ready</h3><p>Our schedule is coming together. Contact us and we'll find a time together.</p>{fit.phone && <a href={`tel:${fit.phone}`}><Phone size={16} /> {fit.phone}</a>}</div> : <form className="pulse-booking-form" onSubmit={submitBooking}>
          <label>Choose a class<select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)} required><option value="">Select a class</option>{classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name} · {formatPrice(cls.price, seller.currency || 'USD')}</option>)}</select></label>
          <div className="booking-field-pair"><label>Date<input type="date" min={today} value={date} onChange={(event) => { setDate(event.target.value); setTime(''); }} required /></label><label>Time<select value={time} onChange={(event) => setTime(event.target.value)} disabled={!date || availableTimes.length === 0} required><option value="">{!date ? 'Choose date first' : availableTimes.length ? 'Select time' : 'No times available'}</option>{availableTimes.map((slot) => <option key={slot} value={slot}>{new Date(`2000-01-01T${slot}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</option>)}</select></label></div>
          <div className="booking-field-pair"><label>Your name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></label><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label></div>
          <label>Phone number<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required /></label>
          {fit.trainers.length > 0 && <label>Preferred trainer <span className="optional-label">OPTIONAL</span><select value={preferredTrainer} onChange={(event) => setPreferredTrainer(event.target.value)} aria-label="Preferred trainer"><option value="">Any available coach</option>{fit.trainers.map((person) => <option key={person.name} value={person.name}>{person.name} · {person.specialty || 'Coach'}</option>)}</select></label>}
          <label>A note for your coach <span className="optional-label">OPTIONAL</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Injuries, goals, or anything we should know?" /></label>
          {error && <p className="pulse-form-error" role="alert">{error}</p>}
          <button className="pulse-button pulse-button-pine booking-submit" type="submit" disabled={busy}>{busy ? 'Sending request…' : 'Request this session'} {busy ? <span className="button-spinner" /> : <ArrowRight size={16} />}</button>
          <p className="booking-fineprint">No payment now. Your session is confirmed once our team gets in touch.</p>
        </form>}</div>
      </section>

      {featured.length > 0 && (
        <section className="pulse-featured"><div className="pulse-section-heading"><div><p className="pulse-kicker">POPULAR THIS WEEK</p><h2>People are booking<br /><i>these classes.</i></h2></div></div><div className="pulse-class-list">{featured.map((cls) => <article className="pulse-class-row" key={cls.id} onClick={() => navigate(`/fit/pulse-fit/class/${cls.id}?seller=${encodeURIComponent(seller.id)}`, { state: { service: cls, seller, from: `/shop/${seller.subdomain}` } })}>
          <span className="class-number">★</span><div>{cls.images && cls.images.length > 0 && <img src={cls.images[0]} alt={cls.name} className="class-thumb" />}<p className="class-category">{cls.category || 'PULSE PRIME'}</p><h3>{cls.name}</h3><p className="class-description">{cls.description}</p></div><span className="class-price">{formatPrice(cls.price, seller.currency || 'USD')}</span><button aria-label={`Book ${cls.name}`} className="class-arrow"><ArrowDownRight /></button>
        </article>)}</div></section>
      )}

      <section className="pulse-visit" id="visit"><div><p className="pulse-kicker">COME ON IN</p><h2>See you <i>soon.</i></h2><p>{seller.contactInfo?.address || fit.location || 'Find us in the heart of the city and meet the team.'}</p></div><div className="visit-links">{(fit.phone || seller.contactInfo?.phone) && <a href={`tel:${fit.phone || seller.contactInfo?.phone}`}><Phone size={16} /> {fit.phone || seller.contactInfo?.phone}</a>}{(fit.email || seller.contactInfo?.email) && <a href={`mailto:${fit.email || seller.contactInfo?.email}`}><ArrowRight size={16} /> {fit.email || seller.contactInfo?.email}</a>}<span><Instagram size={16} /> @pulsefit</span></div></section>
    </main>

    <footer className="pulse-footer"><a className="pulse-wordmark" href="#top"><span className="wordmark-mark"><Dumbbell size={18} /></span><span>Pulse <em>Fit</em></span></a><span>STRONGER EVERY DAY.</span><div><button onClick={openPortal}>Member sessions</button><a href="/fit/pulse-fit/admin">Studio owner</a></div><small>© {new Date().getFullYear()} {seller.storeName || 'Pulse Fit'}</small></footer>
  </div>;
};

export default PulseFitSite;
