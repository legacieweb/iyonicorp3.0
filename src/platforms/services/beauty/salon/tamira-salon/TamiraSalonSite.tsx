import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, CalendarDays, Check, Clock3, Instagram, MapPin, Menu, Phone, Scissors, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller } from '../../../../../services/api';
import { formatPrice } from '../../../../../utils/currency';
import { getSalonSettings } from './salonTypes';
import './tamira-salon.css';

interface Props { seller: Seller; products: Product[] }

const TamiraSalonSite: React.FC<Props> = ({ seller, products }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const salon = getSalonSettings(seller);
  const services = products.filter((product) => product.status === 'active' && product.type === 'service');
  const [selectedService, setSelectedService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [preferredStylist, setPreferredStylist] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Order | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const chosen = services.find((service) => service.id === selectedService);

  const availableTimes = useMemo(() => {
    if (!date || salon.closedDays.includes(new Date(`${date}T12:00:00`).getDay())) return [];
    const [startHour, startMinute] = salon.openingTime.split(':').map(Number);
    const [endHour, endMinute] = salon.closingTime.split(':').map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    const earliest = Date.now() + salon.leadTimeHours * 3600000;
    return Array.from({ length: Math.max(0, Math.ceil((end - start) / Math.max(15, salon.slotInterval))) }, (_, index) => {
      const value = start + index * Math.max(15, salon.slotInterval);
      const slotDate = new Date(`${date}T${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}:00`);
      return slotDate.getTime() >= earliest ? `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` : null;
    }).filter((value): value is string => !!value && value < salon.closingTime);
  }, [date, salon.closedDays, salon.closingTime, salon.leadTimeHours, salon.openingTime, salon.slotInterval]);

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!chosen || !date || !time || !name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim()) {
      setError('Choose a service and time, then add your name, a valid email, and phone number.');
      return;
    }
    setBusy(true);
    try {
       const booking = { platform: 'tamira-salon', appointmentDate: date, appointmentTime: time, staffName: preferredStylist, notes: notes.trim() };
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
      setError('We could not send your request just now. Please try again or call the salon.');
    } finally {
      setBusy(false);
    }
  };

  const portalPath = '/salon/tamira-salon/client';
  const openPortal = () => navigate(user ? portalPath : `/login?shop=${encodeURIComponent(seller.id)}&subdomain=${encodeURIComponent(seller.subdomain)}&redirect=${encodeURIComponent(portalPath)}`);
  const today = new Date().toISOString().slice(0, 10);

  return <div className="tamira-site">
    <header className="tamira-header">
      <a className="tamira-wordmark" href="#top" aria-label="Tamira Salon home"><span className="wordmark-mark"><Scissors size={18} /></span><span>Tamira <em>Salon</em></span></a>
      <button className="tamira-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? 'tamira-nav is-open' : 'tamira-nav'} aria-label="Main navigation">
        <a href="#services" onClick={() => setMenuOpen(false)}>Services</a><a href="#story" onClick={() => setMenuOpen(false)}>Our studio</a><a href="#visit" onClick={() => setMenuOpen(false)}>Visit</a>
        <button className="tamira-text-button" onClick={openPortal}>Your appointments <ArrowRight size={15} /></button>
      </nav>
    </header>

    <main id="top">
      <section className="tamira-hero">
        <div className="tamira-hero-copy">
          <p className="tamira-kicker"><span /> A neighborhood salon with a point of view</p>
          <h1>Good hair.<br /><i>Good energy.</i></h1>
          <p className="tamira-hero-intro">A thoughtful cut, a little color, and time that feels like yours. Come as you are; leave a little more yourself.</p>
          <a className="tamira-button tamira-button-coral" href="#booking">Find your chair <ArrowDownRight size={17} /></a>
          <div className="tamira-hero-note"><span className="note-rule" /> Thoughtful beauty, made personal.</div>
        </div>
        <div className="tamira-hero-image" role="img" aria-label="A stylist at work in a bright, welcoming salon"><span className="hero-stamp"><Sparkles size={17} /> MAKE ROOM<br />FOR YOURSELF</span><span className="hero-image-caption">The Tamira feeling, in every detail</span></div>
        <span className="tamira-hero-side">CARE / CRAFT / COMMUNITY</span>
      </section>

      <section className="tamira-intro-strip"><p>Come for the craft.<br /><em>Stay for the feeling.</em></p><div><span>01 / 03</span><span className="intro-line" /></div><p>Good conversations, careful hands, and a little more ease in your day.</p></section>

      <section className="tamira-services" id="services">
        <div className="tamira-section-heading"><div><p className="tamira-kicker">THE MENU</p><h2>Made for <i>your</i> kind of day.</h2></div><a href="#booking">Book a visit <ArrowRight size={16} /></a></div>
        {services.length ? <div className="tamira-service-list">          {services.map((service, index) => <article className="tamira-service-row" key={service.id} onClick={() => navigate(`/salon/tamira-salon/service/${service.id}?seller=${encodeURIComponent(seller.id)}`, { state: { service, seller, from: `/shop/${seller.subdomain}` } })}>
          <span className="service-number">0{index + 1}</span><div>{service.images && service.images.length > 0 && <img src={service.images[0]} alt={service.name} className="service-thumb" />}<p className="service-category">{service.category || 'THE TAMIRA EDIT'}</p><h3>{service.name}</h3><p className="service-description">{service.description}</p></div><span className="service-price">{formatPrice(service.price, seller.currency || 'USD')}</span><button onClick={(event) => { event.stopPropagation(); setSelectedService(service.id); document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' }); }} aria-label={`Book ${service.name}`} className="service-arrow"><ArrowDownRight /></button>
        </article>)}</div> : <div className="tamira-empty-services"><Scissors /><div><h3>The service menu is getting ready.</h3><p>Check back soon or reach out to the studio for a personal recommendation.</p></div><a href={`mailto:${salon.email || seller.contactInfo?.email || ''}`}>Contact the salon <ArrowRight size={15} /></a></div>}
      </section>

      <section className="tamira-story" id="story"><div className="story-photo" role="img" aria-label="Salon tools arranged for a styling appointment" /><div className="story-copy"><p className="tamira-kicker">A LITTLE ABOUT US</p><h2>Beauty feels better<br />when it feels <i>like you.</i></h2><p>We believe a salon visit should feel less like an appointment and more like a deep breath. Our stylists listen first, bring thoughtful expertise, and make space for the version of you that feels most at home.</p><div className="story-signature">With care, <span>Tamira</span></div></div><span className="story-number">T / S</span></section>

      <section className="tamira-booking" id="booking"><div className="booking-heading"><p className="tamira-kicker">YOUR TIME, YOUR WAY</p><h2>Let's find you<br /><i>a good hour.</i></h2><p>Send a request and our team will confirm your visit shortly.</p><div className="booking-details"><span><Clock3 size={16} /> {salon.openingTime}–{salon.closingTime}</span><span><MapPin size={16} /> {salon.location || seller.contactInfo?.address || 'Location details coming soon'}</span></div></div>
        <div className="booking-panel">{confirmation ? <div className="booking-success" role="status"><span className="success-check"><Check /></span><p className="tamira-kicker">REQUEST RECEIVED</p><h3>We saved you<br /><i>a spot in mind.</i></h3><p>Your request for {chosen?.name} on {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at {time} is pending confirmation. We’ll be in touch soon.</p><button className="tamira-button tamira-button-green" onClick={openPortal}>View your appointments <ArrowRight size={16} /></button></div> : services.length === 0 ? <div className="booking-no-services"><Scissors /><h3>Online booking is almost ready</h3><p>Our team is setting up the service menu. Contact us and we’ll find a time together.</p>{salon.phone && <a href={`tel:${salon.phone}`}><Phone size={16} /> {salon.phone}</a>}</div> : <form className="tamira-booking-form" onSubmit={submitBooking}>
          <label>Choose your service<select value={selectedService} onChange={(event) => setSelectedService(event.target.value)} required><option value="">Select a service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {formatPrice(service.price, seller.currency || 'USD')}</option>)}</select></label>
          <div className="booking-field-pair"><label>Date<input type="date" min={today} value={date} onChange={(event) => { setDate(event.target.value); setTime(''); }} required /></label><label>Time<select value={time} onChange={(event) => setTime(event.target.value)} disabled={!date || availableTimes.length === 0} required><option value="">{!date ? 'Choose date first' : availableTimes.length ? 'Select time' : 'No times available'}</option>{availableTimes.map((slot) => <option key={slot} value={slot}>{new Date(`2000-01-01T${slot}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</option>)}</select></label></div>
          <div className="booking-field-pair"><label>Your name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></label><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label></div>
           <label>Phone number<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required /></label>
           {salon.staff.length > 0 && <label>Preferred stylist <span className="optional-label">OPTIONAL</span><select value={preferredStylist} onChange={(event) => setPreferredStylist(event.target.value)}><option value="">Any available stylist</option>{salon.staff.map((person) => <option key={person.name} value={person.name}>{person.name} · {person.specialty || 'Stylist'}</option>)}</select></label>}
          <label>A note for your stylist <span className="optional-label">OPTIONAL</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything you'd like us to know?" /></label>
          {error && <p className="tamira-form-error" role="alert">{error}</p>}
          <button className="tamira-button tamira-button-green booking-submit" type="submit" disabled={busy}>{busy ? 'Sending request…' : 'Request this appointment'} {busy ? <span className="button-spinner" /> : <ArrowRight size={16} />}</button>
          <p className="booking-fineprint">No payment now. Your appointment is confirmed once our team gets in touch.</p>
        </form>}</div>
      </section>

      <section className="tamira-visit" id="visit"><div><p className="tamira-kicker">COME ON IN</p><h2>See you <i>soon.</i></h2><p>{seller.contactInfo?.address || salon.location || 'Come by the studio for a little time to yourself.'}</p></div><div className="visit-links">{(salon.phone || seller.contactInfo?.phone) && <a href={`tel:${salon.phone || seller.contactInfo?.phone}`}><Phone size={16} /> {salon.phone || seller.contactInfo?.phone}</a>}{(salon.email || seller.contactInfo?.email) && <a href={`mailto:${salon.email || seller.contactInfo?.email}`}><ArrowRight size={16} /> {salon.email || seller.contactInfo?.email}</a>}<span><Instagram size={16} /> @tამira.salon</span></div></section>
    </main>

    <footer className="tamira-footer"><a className="tamira-wordmark" href="#top"><span className="wordmark-mark"><Scissors size={18} /></span><span>Tamira <em>Salon</em></span></a><span>GOOD HAIR. GOOD ENERGY.</span><div><button onClick={openPortal}>Client appointments</button><a href="/salon/tamira-salon/admin">Salon owner</a></div><small>© {new Date().getFullYear()} {seller.storeName || 'Tamira Salon'}</small></footer>
  </div>;
};

export default TamiraSalonSite;